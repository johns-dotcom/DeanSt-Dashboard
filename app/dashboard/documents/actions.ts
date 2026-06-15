"use server";

import { revalidatePath } from "next/cache";
import { and, asc, count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { documents, documentFolders, clients } from "@/lib/db/schema";
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

  revalidatePath("/dashboard/clients", "layout");
  return { ok: true as const };
}

const renameDocInput = z.object({
  id: z.string().uuid(),
  fileName: z.string().min(1, "Name is required").max(255),
});

export async function renameDocument(input: z.infer<typeof renameDocInput>) {
  const parsed = renameDocInput.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const session = await requireSession();
  const newName = parsed.data.fileName.trim();
  if (!newName) return { error: "Name is required" };

  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, parsed.data.id), eq(documents.workspaceId, session.workspace.id)))
    .limit(1);
  if (!doc) return { error: "Document not found" };
  if (newName === doc.fileName) return { ok: true as const };

  await db
    .update(documents)
    .set({ fileName: newName, updatedAt: new Date() })
    .where(eq(documents.id, doc.id));

  await logActivity({
    action: "document.uploaded",
    workspaceId: session.workspace.id,
    actorUserId: session.user.id,
    actorMemberId: session.member.id,
    actorName: session.member.displayName,
    entityType: "document",
    entityId: doc.id,
    entityLabel: `Renamed · ${doc.fileName} → ${newName}`,
  });

  revalidatePath("/dashboard/clients", "layout");
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

/* ─────────────── Folder tree ─────────────── */

const createFolderInput = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1, "Folder name is required").max(80),
  parentId: z.string().uuid().nullable().optional(),
});

export async function createDocumentFolder(input: z.infer<typeof createFolderInput>) {
  const parsed = createFolderInput.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const session = await requireSession();
  const name = parsed.data.name.trim();
  const parentId = parsed.data.parentId ?? null;

  let clientId = parsed.data.clientId;
  if (parentId) {
    const [parent] = await db
      .select()
      .from(documentFolders)
      .where(and(eq(documentFolders.id, parentId), eq(documentFolders.workspaceId, session.workspace.id)))
      .limit(1);
    if (!parent) return { error: "Parent folder not found" };
    clientId = parent.clientId; // children always inherit the parent's client
  }

  const [client] = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.workspaceId, session.workspace.id)))
    .limit(1);
  if (!client) return { error: "Client not found" };

  // Dedup + ordering computed in JS so NULL parents compare cleanly.
  const siblings = await db
    .select({ name: documentFolders.name, parentId: documentFolders.parentId })
    .from(documentFolders)
    .where(and(eq(documentFolders.workspaceId, session.workspace.id), eq(documentFolders.clientId, client.id)));
  const sameLevel = siblings.filter((s) => (s.parentId ?? null) === parentId);
  if (sameLevel.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
    return { error: `"${name}" already exists here` };
  }

  await db.insert(documentFolders).values({
    workspaceId: session.workspace.id,
    clientId: client.id,
    client: client.name,
    name,
    parentId,
    sortOrder: sameLevel.length + 1,
  });

  await logActivity({
    action: "document.uploaded",
    workspaceId: session.workspace.id,
    actorUserId: session.user.id,
    actorMemberId: session.member.id,
    actorName: session.member.displayName,
    entityType: "folder",
    entityLabel: `Created folder · ${client.name}/${name}`,
  });

  revalidatePath("/dashboard/clients", "layout");
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

  await db
    .update(documentFolders)
    .set({ name: newName, updatedAt: new Date() })
    .where(eq(documentFolders.id, folder.id));

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

  revalidatePath("/dashboard/clients", "layout");
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

  // Only delete empty folders — no child folders and no documents.
  const [{ kids }] = await db
    .select({ kids: count() })
    .from(documentFolders)
    .where(eq(documentFolders.parentId, id));
  const [{ docs }] = await db
    .select({ docs: count() })
    .from(documents)
    .where(eq(documents.folderId, id));
  if (kids > 0 || docs > 0) {
    return { error: "Folder isn't empty — move or delete its contents first." };
  }

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

  revalidatePath("/dashboard/clients", "layout");
  return { ok: true as const };
}

const moveDocInput = z.object({
  id: z.string().uuid(),
  folderId: z.string().uuid().nullable(),
});

export async function moveDocument(input: z.infer<typeof moveDocInput>) {
  const parsed = moveDocInput.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const session = await requireSession();
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, parsed.data.id), eq(documents.workspaceId, session.workspace.id)))
    .limit(1);
  if (!doc) return { error: "Document not found" };

  let clientId = doc.clientId;
  let client = doc.client;
  let subcategory: string | null = null;
  if (parsed.data.folderId) {
    const [target] = await db
      .select()
      .from(documentFolders)
      .where(and(eq(documentFolders.id, parsed.data.folderId), eq(documentFolders.workspaceId, session.workspace.id)))
      .limit(1);
    if (!target) return { error: "Target folder not found" };
    clientId = target.clientId;
    client = target.client;
    subcategory = target.name;
  }

  await db
    .update(documents)
    .set({ folderId: parsed.data.folderId, clientId, client, subcategory, updatedAt: new Date() })
    .where(eq(documents.id, doc.id));

  revalidatePath("/dashboard/clients", "layout");
  return { ok: true as const };
}

const moveFolderInput = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
});

export async function moveFolder(input: z.infer<typeof moveFolderInput>) {
  const parsed = moveFolderInput.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const session = await requireSession();
  const all = await db
    .select()
    .from(documentFolders)
    .where(eq(documentFolders.workspaceId, session.workspace.id));

  const folder = all.find((f) => f.id === parsed.data.id);
  if (!folder) return { error: "Folder not found" };
  const parentId = parsed.data.parentId ?? null;
  if (parentId === folder.id) return { error: "Can't move a folder into itself" };

  if (parentId) {
    const target = all.find((f) => f.id === parentId);
    if (!target) return { error: "Target folder not found" };
    if (target.clientId !== folder.clientId) return { error: "Can't move a folder to a different client" };
    // Cycle guard: target must not be a descendant of the folder being moved.
    let cur: typeof target | undefined = target;
    while (cur) {
      if (cur.id === folder.id) return { error: "Can't move a folder into its own subfolder" };
      cur = cur.parentId ? all.find((f) => f.id === cur!.parentId) : undefined;
    }
  }

  await db
    .update(documentFolders)
    .set({ parentId, updatedAt: new Date() })
    .where(and(eq(documentFolders.id, folder.id), eq(documentFolders.workspaceId, session.workspace.id)));

  revalidatePath("/dashboard/clients", "layout");
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
