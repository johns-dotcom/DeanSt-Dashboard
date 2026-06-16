import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents, documentFolders, clients } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/workspace";
import { putObject } from "@/lib/r2";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session.member.role === "view_only") {
    return NextResponse.json({ error: "View-only members cannot upload" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const clientIdField = form.get("client_id");
  const categoryField = form.get("category");
  const folderIdField = form.get("folder_id");

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  const category = typeof categoryField === "string" && categoryField.trim() ? categoryField.trim() : "Other";

  // Resolve the destination client. A folder is the source of truth for
  // clientId + subcategory; otherwise client_id must be provided directly.
  let clientId: string | null = null;
  let client = "";
  let subcategory: string | null = null;
  let folderId: string | null = null;
  if (typeof folderIdField === "string" && folderIdField) {
    const [folder] = await db
      .select()
      .from(documentFolders)
      .where(and(eq(documentFolders.id, folderIdField), eq(documentFolders.workspaceId, session.workspace.id)))
      .limit(1);
    if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 400 });
    folderId = folder.id;
    clientId = folder.clientId;
    client = folder.client;
    subcategory = folder.name;
  } else if (typeof clientIdField === "string" && clientIdField) {
    const [c] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientIdField), eq(clients.workspaceId, session.workspace.id)))
      .limit(1);
    if (!c) return NextResponse.json({ error: "Client not found" }, { status: 400 });
    clientId = c.id;
    client = c.name;
  } else {
    return NextResponse.json({ error: "Missing client" }, { status: 400 });
  }

  const fileName = file instanceof File ? file.name : "file";
  const contentType = file.type || "application/octet-stream";

  const safeName = fileName.replace(/[^\w.\-]+/g, "_");
  const key = `${session.workspace.id}/${client}/${category}/${Date.now()}-${safeName}`;

  const bytes = Buffer.from(await file.arrayBuffer());
  await putObject(key, bytes, contentType);

  const [doc] = await db
    .insert(documents)
    .values({
      workspaceId: session.workspace.id,
      clientId: clientId!,
      client,
      category,
      subcategory,
      folderId,
      fileName,
      filePath: key,
      fileSize: bytes.length,
      uploadedBy: session.member.id,
      uploadedAt: new Date(),
    })
    .returning();

  await logActivity({
    action: "document.uploaded",
    workspaceId: session.workspace.id,
    actorUserId: session.user.id,
    actorMemberId: session.member.id,
    actorName: session.member.displayName,
    entityType: "document",
    entityId: doc.id,
    entityLabel: `${fileName} · ${client}/${category}`,
  });

  return NextResponse.json({ ok: true, document: doc });
}
