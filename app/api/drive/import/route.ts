import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents, documentFolders, clients } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/workspace";
import { putObject } from "@/lib/r2";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB, validateUpload } from "@/lib/upload";
import { logActivity } from "@/lib/activity";
import { getGoogleAccessToken, hasDriveAccess } from "@/lib/google/token";
import { DriveError, downloadFile, getFile, importedFileName } from "@/lib/google/drive";

export const runtime = "nodejs";

/**
 * Copies files the user picked in Drive into R2 and files them under a client,
 * exactly as an upload would. R2 stays the source of truth — the Drive id and
 * link are kept only so the explorer can offer "Open in Drive".
 *
 * A file that fails (too large, export unavailable, permission lost) is
 * reported by name instead of failing the whole batch.
 */
export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session.member.role === "view_only") {
    return NextResponse.json({ error: "View-only members cannot import" }, { status: 403 });
  }
  if (!(await hasDriveAccess(session.user.id))) {
    return NextResponse.json({ error: "Drive not connected" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | { file_ids?: string[]; client_id?: string; folder_id?: string | null; category?: string }
    | null;
  const fileIds = body?.file_ids?.filter(Boolean) ?? [];
  if (fileIds.length === 0) return NextResponse.json({ error: "No files selected" }, { status: 400 });

  const token = await getGoogleAccessToken(session.user.id);
  if (!token) return NextResponse.json({ error: "Drive access expired — reconnect" }, { status: 401 });

  const wsId = session.workspace.id;

  // A folder is the source of truth for its client; otherwise client_id is.
  let clientId: string | null = null;
  let clientName = "";
  let folderId: string | null = null;
  let subcategory: string | null = null;

  if (body?.folder_id) {
    const [folder] = await db
      .select()
      .from(documentFolders)
      .where(and(eq(documentFolders.id, body.folder_id), eq(documentFolders.workspaceId, wsId)))
      .limit(1);
    if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 400 });
    folderId = folder.id;
    clientId = folder.clientId;
    clientName = folder.client;
    subcategory = folder.name;
  } else if (body?.client_id) {
    const [client] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, body.client_id), eq(clients.workspaceId, wsId)))
      .limit(1);
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 400 });
    clientId = client.id;
    clientName = client.name;
  } else {
    return NextResponse.json({ error: "Pick a client or folder to import into" }, { status: 400 });
  }

  const imported: { id: string; fileName: string }[] = [];
  const failed: { name: string; reason: string }[] = [];

  for (const fileId of fileIds) {
    let name = fileId;
    try {
      const meta = await getFile(token, fileId);
      name = meta.name;

      // Cheap pre-check for binary files; exports report no size up front, so
      // the byte-length check below is the real guard.
      if (meta.size && Number(meta.size) > MAX_UPLOAD_BYTES) {
        failed.push({ name, reason: `over ${MAX_UPLOAD_MB}MB` });
        continue;
      }

      const bytes = await downloadFile(token, meta);
      if (bytes.byteLength > MAX_UPLOAD_BYTES) {
        failed.push({ name, reason: `over ${MAX_UPLOAD_MB}MB` });
        continue;
      }

      const fileName = importedFileName(meta.name, meta.mimeType);
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" });
      const invalid = validateUpload(blob, fileName);
      if (invalid) {
        failed.push({ name: fileName, reason: invalid });
        continue;
      }

      const key = `documents/${wsId}/${crypto.randomUUID()}-${fileName.replace(/[^\w.-]+/g, "_")}`;
      await putObject(key, bytes, "application/octet-stream");

      const [row] = await db
        .insert(documents)
        .values({
          workspaceId: wsId,
          clientId: clientId!,
          client: clientName,
          category: body?.category?.trim() || "Other",
          subcategory,
          folderId,
          fileName,
          filePath: key,
          fileSize: bytes.byteLength,
          uploadedBy: session.member.id,
          driveFileId: meta.id,
          driveLink: meta.webViewLink ?? null,
        })
        .returning({ id: documents.id });

      imported.push({ id: row.id, fileName });
    } catch (err) {
      const reason =
        err instanceof DriveError && err.status === 403
          ? "no access in Drive"
          : err instanceof Error
            ? err.message.slice(0, 80)
            : "failed";
      console.error("[drive/import] failed", fileId, reason);
      failed.push({ name, reason });
    }
  }

  if (imported.length > 0) {
    await logActivity({
      action: "document.imported",
      workspaceId: wsId,
      actorUserId: session.user.id,
      actorMemberId: session.member.id,
      actorName: session.member.displayName,
      entityType: "document",
      entityId: imported[0].id,
      entityLabel: imported.length === 1 ? imported[0].fileName : `${imported.length} files from Drive`,
      metadata: { count: imported.length, client: clientName },
    });
  }

  return NextResponse.json({ imported: imported.length, failed });
}
