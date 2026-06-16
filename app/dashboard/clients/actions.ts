"use server";

import { revalidatePath } from "next/cache";
import { and, asc, count, eq, max } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { clients, documents, documentFolders } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/workspace";
import { logActivity } from "@/lib/activity";

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || `client-${Date.now()}`
  );
}

async function uniqueSlug(workspaceId: string, base: string, excludeId?: string): Promise<string> {
  const existing = await db
    .select({ slug: clients.slug, id: clients.id })
    .from(clients)
    .where(eq(clients.workspaceId, workspaceId));
  const taken = new Set(existing.filter((r) => r.id !== excludeId).map((r) => r.slug));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

const createSchema = z.object({ name: z.string().min(1, "Name is required").max(80) });

export async function createClient(input: z.infer<typeof createSchema>) {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const session = await requireSession();
  const name = parsed.data.name.trim();

  const [dupe] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.workspaceId, session.workspace.id), eq(clients.name, name)))
    .limit(1);
  if (dupe) return { error: `"${name}" already exists` };

  const slug = await uniqueSlug(session.workspace.id, slugify(name));
  const [{ maxOrder }] = await db
    .select({ maxOrder: max(clients.sortOrder) })
    .from(clients)
    .where(eq(clients.workspaceId, session.workspace.id));

  const [inserted] = await db
    .insert(clients)
    .values({ workspaceId: session.workspace.id, name, slug, sortOrder: (maxOrder ?? 0) + 1 })
    .returning();

  await logActivity({
    action: "document.uploaded",
    workspaceId: session.workspace.id,
    actorUserId: session.user.id,
    actorMemberId: session.member.id,
    actorName: session.member.displayName,
    entityType: "client",
    entityId: inserted.id,
    entityLabel: `Created client · ${name}`,
  });

  revalidatePath("/dashboard/clients", "layout");
  return { ok: true as const, slug };
}

const renameSchema = z.object({ id: z.string().uuid(), name: z.string().min(1).max(80) });

export async function renameClient(input: z.infer<typeof renameSchema>) {
  const parsed = renameSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const session = await requireSession();
  const name = parsed.data.name.trim();

  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, parsed.data.id), eq(clients.workspaceId, session.workspace.id)))
    .limit(1);
  if (!client) return { error: "Client not found" };
  if (name === client.name) return { ok: true as const, slug: client.slug };

  const [dupe] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.workspaceId, session.workspace.id), eq(clients.name, name)))
    .limit(1);
  if (dupe && dupe.id !== client.id) return { error: `"${name}" already exists` };

  const newSlug = await uniqueSlug(session.workspace.id, slugify(name), client.id);

  await db
    .update(clients)
    .set({ name, slug: newSlug, updatedAt: new Date() })
    .where(eq(clients.id, client.id));
  // Keep the denormalized client name on folders/files in sync.
  await db.update(documentFolders).set({ client: name }).where(eq(documentFolders.clientId, client.id));
  await db.update(documents).set({ client: name }).where(eq(documents.clientId, client.id));

  await logActivity({
    action: "document.uploaded",
    workspaceId: session.workspace.id,
    actorUserId: session.user.id,
    actorMemberId: session.member.id,
    actorName: session.member.displayName,
    entityType: "client",
    entityId: client.id,
    entityLabel: `Renamed client · ${client.name} → ${name}`,
  });

  revalidatePath("/dashboard/clients", "layout");
  return { ok: true as const, slug: newSlug };
}

export async function deleteClient(id: string) {
  const session = await requireSession();
  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.workspaceId, session.workspace.id)))
    .limit(1);
  if (!client) return { error: "Client not found" };

  const [{ folderCount }] = await db
    .select({ folderCount: count() })
    .from(documentFolders)
    .where(eq(documentFolders.clientId, id));
  const [{ docCount }] = await db
    .select({ docCount: count() })
    .from(documents)
    .where(eq(documents.clientId, id));
  if (folderCount > 0 || docCount > 0) {
    return { error: `"${client.name}" isn't empty — move or delete its folders and files first.` };
  }

  await db.delete(clients).where(eq(clients.id, id));

  await logActivity({
    action: "document.deleted",
    workspaceId: session.workspace.id,
    actorUserId: session.user.id,
    actorMemberId: session.member.id,
    actorName: session.member.displayName,
    entityType: "client",
    entityId: id,
    entityLabel: `Deleted client · ${client.name}`,
  });

  revalidatePath("/dashboard/clients", "layout");
  return { ok: true as const };
}

export async function listClients(workspaceId: string) {
  return db
    .select()
    .from(clients)
    .where(eq(clients.workspaceId, workspaceId))
    .orderBy(asc(clients.sortOrder), asc(clients.name));
}
