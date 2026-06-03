"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, max } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { documents, documentFolders } from "@/lib/db/schema";
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

/* ─────────────── Subfolders per client ─────────────── */

const folderInput = z.object({
  client: z.string().min(1, "Client is required"),
  name: z.string().min(1, "Folder name is required").max(80),
});

export async function createDocumentFolder(input: z.infer<typeof folderInput>) {
  const parsed = folderInput.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const session = await requireSession();
  const name = parsed.data.name.trim();
  const client = parsed.data.client.trim();

  // Avoid duplicate by name within the same client
  const [existing] = await db
    .select({ id: documentFolders.id })
    .from(documentFolders)
    .where(
      and(
        eq(documentFolders.workspaceId, session.workspace.id),
        eq(documentFolders.client, client),
        eq(documentFolders.name, name)
      )
    )
    .limit(1);
  if (existing) return { error: `"${name}" already exists in ${client}` };

  const [{ maxOrder }] = await db
    .select({ maxOrder: max(documentFolders.sortOrder) })
    .from(documentFolders)
    .where(and(eq(documentFolders.workspaceId, session.workspace.id), eq(documentFolders.client, client)));

  await db.insert(documentFolders).values({
    workspaceId: session.workspace.id,
    client,
    name,
    sortOrder: (maxOrder ?? 0) + 1,
  });

  await logActivity({
    action: "document.uploaded",
    workspaceId: session.workspace.id,
    actorUserId: session.user.id,
    actorMemberId: session.member.id,
    actorName: session.member.displayName,
    entityType: "folder",
    entityLabel: `Created folder · ${client}/${name}`,
  });

  revalidatePath("/dashboard/documents");
  return { ok: true as const };
}

const renameInput = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(80),
});

export async function renameDocumentFolder(input: z.infer<typeof renameInput>) {
  const parsed = renameInput.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const session = await requireSession();
  const newName = parsed.data.name.trim();

  const [folder] = await db
    .select()
    .from(documentFolders)
    .where(and(eq(documentFolders.id, parsed.data.id), eq(documentFolders.workspaceId, session.workspace.id)))
    .limit(1);
  if (!folder) return { error: "Folder not found" };

  // Update folder
  await db
    .update(documentFolders)
    .set({ name: newName, updatedAt: new Date() })
    .where(eq(documentFolders.id, folder.id));

  // Cascade to documents that were tagged with the old subcategory
  await db
    .update(documents)
    .set({ subcategory: newName, updatedAt: new Date() })
    .where(
      and(
        eq(documents.workspaceId, session.workspace.id),
        eq(documents.client, folder.client),
        eq(documents.subcategory, folder.name)
      )
    );

  await logActivity({
    action: "document.uploaded",
    workspaceId: session.workspace.id,
    actorUserId: session.user.id,
    actorMemberId: session.member.id,
    actorName: session.member.displayName,
    entityType: "folder",
    entityId: folder.id,
    entityLabel: `Renamed folder · ${folder.client}/${folder.name} → ${newName}`,
  });

  revalidatePath("/dashboard/documents");
  return { ok: true as const };
}

export async function deleteDocumentFolder(id: string) {
  const session = await requireSession();
  const [folder] = await db
    .select()
    .from(documentFolders)
    .where(and(eq(documentFolders.id, id), eq(documentFolders.workspaceId, session.workspace.id)))
    .limit(1);
  if (!folder) return { error: "Folder not found" };

  await db.delete(documentFolders).where(eq(documentFolders.id, id));

  await logActivity({
    action: "document.deleted",
    workspaceId: session.workspace.id,
    actorUserId: session.user.id,
    actorMemberId: session.member.id,
    actorName: session.member.displayName,
    entityType: "folder",
    entityId: id,
    entityLabel: `Removed folder · ${folder.client}/${folder.name}`,
  });

  revalidatePath("/dashboard/documents");
  return { ok: true as const };
}

export async function listDocumentFolders() {
  const session = await requireSession();
  return db
    .select()
    .from(documentFolders)
    .where(eq(documentFolders.workspaceId, session.workspace.id))
    .orderBy(asc(documentFolders.client), asc(documentFolders.sortOrder), asc(documentFolders.name));
}
