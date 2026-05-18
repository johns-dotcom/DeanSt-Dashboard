"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/workspace";
import { createUploadUrl, createDownloadUrl, deleteObject } from "@/lib/r2";
import { logActivity } from "@/lib/activity";

export async function presignUpload(input: {
  client: string;
  category: string;
  file_name: string;
  content_type: string;
}) {
  const session = await requireSession();
  if (session.member.role === "view_only") return { error: "View-only members cannot upload" };

  const safeName = input.file_name.replace(/[^\w.\-]+/g, "_");
  const key = `${session.workspace.id}/${input.client}/${input.category}/${Date.now()}-${safeName}`;
  const uploadUrl = await createUploadUrl(key, input.content_type || "application/octet-stream");
  return { ok: true as const, uploadUrl, key };
}

export async function recordUpload(input: {
  client: string;
  category: string;
  subcategory?: string;
  file_name: string;
  file_path: string;
  file_size: number;
}) {
  const session = await requireSession();
  if (session.member.role === "view_only") return { error: "View-only members cannot upload" };

  const [inserted] = await db.insert(documents).values({
    workspaceId: session.workspace.id,
    client: input.client,
    category: input.category,
    subcategory: input.subcategory || null,
    fileName: input.file_name,
    filePath: input.file_path,
    fileSize: input.file_size,
    uploadedBy: session.member.id,
    uploadedAt: new Date(),
  }).returning({ id: documents.id });
  await logActivity({
    action: "document.uploaded",
    workspaceId: session.workspace.id,
    actorUserId: session.user.id,
    actorMemberId: session.member.id,
    actorName: session.member.displayName,
    entityType: "document",
    entityId: inserted.id,
    entityLabel: `${input.file_name} · ${input.client}/${input.category}`,
  });
  revalidatePath("/dashboard/documents");
  return { ok: true as const };
}

export async function deleteDocument(id: string) {
  const session = await requireSession();
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.workspaceId, session.workspace.id)))
    .limit(1);
  if (!doc) return { error: "Not found" };

  try { await deleteObject(doc.filePath); } catch {
    /* swallow — DB row deletion is more important than orphaned blob */
  }
  await db.delete(documents).where(eq(documents.id, id));

  await logActivity({
    action: "document.deleted",
    workspaceId: session.workspace.id,
    actorUserId: session.user.id,
    actorMemberId: session.member.id,
    actorName: session.member.displayName,
    entityType: "document",
    entityId: id,
    entityLabel: `${doc.fileName} · ${doc.client}/${doc.category}`,
  });

  revalidatePath("/dashboard/documents");
  return { ok: true as const };
}

export async function getDownloadUrl(id: string) {
  const session = await requireSession();
  const [doc] = await db
    .select({ filePath: documents.filePath, fileName: documents.fileName })
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.workspaceId, session.workspace.id)))
    .limit(1);
  if (!doc) return { error: "Not found" };

  const url = await createDownloadUrl(doc.filePath, doc.fileName);
  return { url };
}
