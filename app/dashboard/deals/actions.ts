"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { deals } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/workspace";

const dealSchema = z.object({
  artist: z.string().min(1, "Artist is required"),
  type: z.enum(["recording", "brand"]),
  counterparty: z.string().min(1, "Counterparty is required"),
  value: z.coerce.number().min(0),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  status: z.enum(["active", "closed", "negotiating"]),
  notes: z.string().optional().nullable(),
});

export async function createDeal(input: z.infer<typeof dealSchema>) {
  const parsed = dealSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const session = await requireSession();

  await db.insert(deals).values({
    workspaceId: session.workspace.id,
    artist: parsed.data.artist,
    type: parsed.data.type,
    counterparty: parsed.data.counterparty,
    value: parsed.data.value.toFixed(2),
    startDate: parsed.data.start_date || null,
    endDate: parsed.data.end_date || null,
    status: parsed.data.status,
    notes: parsed.data.notes || null,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/deals");
  return { ok: true as const };
}

export async function updateDeal(id: string, input: z.infer<typeof dealSchema>) {
  const parsed = dealSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const session = await requireSession();

  await db
    .update(deals)
    .set({
      artist: parsed.data.artist,
      type: parsed.data.type,
      counterparty: parsed.data.counterparty,
      value: parsed.data.value.toFixed(2),
      startDate: parsed.data.start_date || null,
      endDate: parsed.data.end_date || null,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
      updatedAt: new Date(),
    })
    .where(and(eq(deals.id, id), eq(deals.workspaceId, session.workspace.id)));

  revalidatePath("/dashboard/deals");
  return { ok: true as const };
}

export async function deleteDeal(id: string) {
  const session = await requireSession();
  await db.delete(deals).where(and(eq(deals.id, id), eq(deals.workspaceId, session.workspace.id)));
  revalidatePath("/dashboard/deals");
  return { ok: true as const };
}
