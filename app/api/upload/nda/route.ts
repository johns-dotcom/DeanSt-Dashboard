import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/lib/db";
import { ndas, ndaFiles } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/workspace";
import { r2, r2Bucket } from "@/lib/r2";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session.member.role === "view_only") {
    return NextResponse.json({ error: "View-only members cannot upload" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const ndaId = form.get("ndaId");

  if (!(file instanceof Blob) || typeof ndaId !== "string") {
    return NextResponse.json({ error: "Missing file or ndaId" }, { status: 400 });
  }
  const fileName = file instanceof File ? file.name : "file";
  const contentType = file.type || "application/octet-stream";

  const [nda] = await db
    .select({ id: ndas.id, recipientName: ndas.recipientName })
    .from(ndas)
    .where(and(eq(ndas.id, ndaId), eq(ndas.workspaceId, session.workspace.id)))
    .limit(1);
  if (!nda) return NextResponse.json({ error: "NDA not found" }, { status: 404 });

  const safeName = fileName.replace(/[^\w.\-]+/g, "_");
  const key = `${session.workspace.id}/ndas/${ndaId}/${Date.now()}-${safeName}`;

  const bytes = Buffer.from(await file.arrayBuffer());
  await r2.send(
    new PutObjectCommand({ Bucket: r2Bucket, Key: key, Body: bytes, ContentType: contentType })
  );

  const [stored] = await db
    .insert(ndaFiles)
    .values({
      workspaceId: session.workspace.id,
      ndaId,
      fileName,
      filePath: key,
      fileSize: bytes.length,
      contentType,
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
    entityType: "nda_file",
    entityId: stored.id,
    entityLabel: `${fileName} · NDA · ${nda.recipientName}`,
  });

  return NextResponse.json({ ok: true, file: stored });
}
