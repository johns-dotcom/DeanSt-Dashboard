"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { editorMutation } from "@/lib/auth/action";
import { byId } from "@/lib/db/scope";
import { logActivity } from "@/lib/activity";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  clients: z.array(z.string()).default([]),
  notes: z.string().optional().nullable(),
});

export async function createContact(input: z.infer<typeof contactSchema>) {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  return editorMutation("createContact", async (session) => {
    const [inserted] = await db.insert(contacts).values({
      workspaceId: session.workspace.id,
      name: parsed.data.name,
      role: parsed.data.role || null,
      industry: parsed.data.industry?.trim() || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      city: parsed.data.city || null,
      clients: parsed.data.clients,
      notes: parsed.data.notes || null,
    }).returning({ id: contacts.id });

    await logActivity({
      action: "contact.created",
      workspaceId: session.workspace.id,
      actorUserId: session.user.id,
      actorMemberId: session.member.id,
      actorName: session.member.displayName,
      entityType: "contact",
      entityId: inserted.id,
      entityLabel: parsed.data.name,
    });
    revalidatePath("/dashboard/contacts");
    return { ok: true as const };
  });
}

export async function updateContact(id: string, input: z.infer<typeof contactSchema>) {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  return editorMutation("updateContact", async (session) => {
    await db
      .update(contacts)
      .set({
        name: parsed.data.name,
        role: parsed.data.role || null,
        industry: parsed.data.industry?.trim() || null,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        city: parsed.data.city || null,
        clients: parsed.data.clients,
        notes: parsed.data.notes || null,
        updatedAt: new Date(),
      })
      .where(byId(contacts, id, session.workspace.id));

    await logActivity({
      action: "contact.updated",
      workspaceId: session.workspace.id,
      actorUserId: session.user.id,
      actorMemberId: session.member.id,
      actorName: session.member.displayName,
      entityType: "contact",
      entityId: id,
      entityLabel: parsed.data.name,
    });

    revalidatePath("/dashboard/contacts");
    return { ok: true as const };
  });
}

export async function deleteContact(id: string) {
  return editorMutation("deleteContact", async (session) => {
    const [doomed] = await db
      .select({ name: contacts.name })
      .from(contacts)
      .where(byId(contacts, id, session.workspace.id))
      .limit(1);
    await db.delete(contacts).where(byId(contacts, id, session.workspace.id));
    await logActivity({
      action: "contact.deleted",
      workspaceId: session.workspace.id,
      actorUserId: session.user.id,
      actorMemberId: session.member.id,
      actorName: session.member.displayName,
      entityType: "contact",
      entityId: id,
      entityLabel: doomed?.name ?? null,
    });
    revalidatePath("/dashboard/contacts");
    return { ok: true as const };
  });
}
