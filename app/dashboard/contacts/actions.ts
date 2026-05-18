"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/workspace";

const CATEGORIES = ["legal","publicist","label_rep","glam","management","venue_promoter","other"] as const;

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().optional().nullable(),
  category: z.enum(CATEGORIES).optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  clients: z.array(z.string()).default([]),
  notes: z.string().optional().nullable(),
});

export async function createContact(input: z.infer<typeof contactSchema>) {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const session = await requireSession();

  await db.insert(contacts).values({
    workspaceId: session.workspace.id,
    name: parsed.data.name,
    role: parsed.data.role || null,
    category: parsed.data.category || null,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    clients: parsed.data.clients,
    notes: parsed.data.notes || null,
  });
  revalidatePath("/dashboard/contacts");
  return { ok: true as const };
}

export async function updateContact(id: string, input: z.infer<typeof contactSchema>) {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const session = await requireSession();
  await db
    .update(contacts)
    .set({
      name: parsed.data.name,
      role: parsed.data.role || null,
      category: parsed.data.category || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      clients: parsed.data.clients,
      notes: parsed.data.notes || null,
      updatedAt: new Date(),
    })
    .where(and(eq(contacts.id, id), eq(contacts.workspaceId, session.workspace.id)));

  revalidatePath("/dashboard/contacts");
  return { ok: true as const };
}

export async function deleteContact(id: string) {
  const session = await requireSession();
  await db.delete(contacts).where(and(eq(contacts.id, id), eq(contacts.workspaceId, session.workspace.id)));
  revalidatePath("/dashboard/contacts");
  return { ok: true as const };
}
