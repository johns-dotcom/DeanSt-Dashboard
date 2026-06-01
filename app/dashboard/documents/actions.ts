"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/workspace";
import { deleteObject } from "@/lib/r2";
import { logActivity } from "@/lib/activity";

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
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.workspaceId, session.workspace.id)))
    .limit(1);
  if (!doc) return { error: "Not found" };
  return { url: `/api/files/document/${id}` };
}
