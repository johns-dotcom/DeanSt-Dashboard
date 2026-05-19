"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, asc, max, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { invoiceClientPages } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/workspace";
import { logActivity } from "@/lib/activity";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || `client-${Date.now()}`;
}

async function uniqueSlug(workspaceId: string, base: string, excludeId?: string): Promise<string> {
  const existing = await db
    .select({ slug: invoiceClientPages.slug, id: invoiceClientPages.id })
    .from(invoiceClientPages)
    .where(eq(invoiceClientPages.workspaceId, workspaceId));
  const taken = new Set(existing.filter((r) => r.id !== excludeId).map((r) => r.slug));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

const createSchema = z.object({ name: z.string().min(1, "Name is required").max(80) });

export async function createClientPage(input: z.infer<typeof createSchema>) {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const session = await requireSession();
  const name = parsed.data.name.trim();
  const slug = await uniqueSlug(session.workspace.id, slugify(name));

  const [{ maxOrder }] = await db
    .select({ maxOrder: max(invoiceClientPages.sortOrder) })
    .from(invoiceClientPages)
    .where(eq(invoiceClientPages.workspaceId, session.workspace.id));
  const sortOrder = (maxOrder ?? 0) + 1;

  const [inserted] = await db
    .insert(invoiceClientPages)
    .values({ workspaceId: session.workspace.id, name, slug, sortOrder })
    .returning();

  await logActivity({
    action: "invoice.created",
    workspaceId: session.workspace.id,
    actorUserId: session.user.id,
    actorMemberId: session.member.id,
    actorName: session.member.displayName,
    entityType: "client_page",
    entityId: inserted.id,
    entityLabel: `Created client page · ${name}`,
  });

  revalidatePath("/dashboard/invoices", "layout");
  return { ok: true as const, slug };
}

const renameSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(80),
});

export async function renameClientPage(input: z.infer<typeof renameSchema>) {
  const parsed = renameSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const session = await requireSession();
  const name = parsed.data.name.trim();
  const newSlug = await uniqueSlug(session.workspace.id, slugify(name), parsed.data.id);

  const [updated] = await db
    .update(invoiceClientPages)
    .set({ name, slug: newSlug, updatedAt: new Date() })
    .where(and(eq(invoiceClientPages.id, parsed.data.id), eq(invoiceClientPages.workspaceId, session.workspace.id)))
    .returning();

  if (!updated) return { error: "Page not found" };

  await logActivity({
    action: "invoice.updated",
    workspaceId: session.workspace.id,
    actorUserId: session.user.id,
    actorMemberId: session.member.id,
    actorName: session.member.displayName,
    entityType: "client_page",
    entityId: updated.id,
    entityLabel: `Renamed client page · ${name}`,
  });

  revalidatePath("/dashboard/invoices", "layout");
  return { ok: true as const, slug: updated.slug };
}

export async function deleteClientPage(id: string) {
  const session = await requireSession();
  const [removed] = await db
    .delete(invoiceClientPages)
    .where(and(eq(invoiceClientPages.id, id), eq(invoiceClientPages.workspaceId, session.workspace.id)))
    .returning();

  if (removed) {
    await logActivity({
      action: "invoice.deleted",
      workspaceId: session.workspace.id,
      actorUserId: session.user.id,
      actorMemberId: session.member.id,
      actorName: session.member.displayName,
      entityType: "client_page",
      entityId: removed.id,
      entityLabel: `Deleted client page · ${removed.name}`,
    });
  }

  revalidatePath("/dashboard/invoices", "layout");
  return { ok: true as const };
}

export async function listClientPages(workspaceId: string) {
  return db
    .select()
    .from(invoiceClientPages)
    .where(eq(invoiceClientPages.workspaceId, workspaceId))
    .orderBy(asc(invoiceClientPages.sortOrder), asc(invoiceClientPages.name));
}

export async function navigateToClientPage(slug: string) {
  redirect(`/dashboard/invoices/c/${slug}`);
}

// Suppress unused-import warning when this file is imported by client components
export const _unused = sql;
