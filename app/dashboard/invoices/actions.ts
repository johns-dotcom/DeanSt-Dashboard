"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { invoices, workspaces } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/workspace";
import { logActivity } from "@/lib/activity";

const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.coerce.number().min(0),
  rate: z.coerce.number().min(0),
  amount: z.coerce.number().min(0),
});

const invoiceSchema = z.object({
  client: z.string().min(1, "Client is required"),
  type: z.enum(["invoice", "reimbursement"]),
  description: z.string().optional().nullable(),
  line_items: z.array(lineItemSchema).min(1, "At least one line item"),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
  due_date: z.string().optional().nullable(),
  issued_date: z.string().optional().nullable(),
  status: z.enum(["draft", "pending", "overdue", "paid"]).default("draft"),
});

function computeTotals(items: { quantity: number; rate: number; amount: number }[], taxRate: number) {
  const subtotal = items.reduce((s, i) => s + Number(i.amount || i.quantity * i.rate), 0);
  const total = subtotal * (1 + taxRate / 100);
  return { subtotal: Number(subtotal.toFixed(2)), total: Number(total.toFixed(2)) };
}

async function nextInvoiceNumber(workspaceId: string): Promise<string> {
  const [row] = await db
    .update(workspaces)
    .set({ invoiceSeq: sql`${workspaces.invoiceSeq} + 1` })
    .where(eq(workspaces.id, workspaceId))
    .returning({ seq: workspaces.invoiceSeq, prefix: workspaces.invoicePrefix });
  const used = row.seq - 1;
  return `${row.prefix}${String(used).padStart(4, "0")}`;
}

export async function createInvoice(input: z.infer<typeof invoiceSchema>) {
  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const session = await requireSession();
  const today = new Date().toISOString().slice(0, 10);
  const number = await nextInvoiceNumber(session.workspace.id);
  const { subtotal, total } = computeTotals(parsed.data.line_items, parsed.data.tax_rate);

  const [inserted] = await db.insert(invoices).values({
    workspaceId: session.workspace.id,
    invoiceNumber: number,
    client: parsed.data.client,
    type: parsed.data.type,
    description: parsed.data.description ?? null,
    lineItems: parsed.data.line_items,
    subtotal: subtotal.toFixed(2),
    taxRate: parsed.data.tax_rate.toFixed(2),
    total: total.toFixed(2),
    issuedDate: parsed.data.issued_date || today,
    dueDate: parsed.data.due_date || null,
    status: parsed.data.status,
  }).returning({ id: invoices.id });

  await logActivity({
    action: "invoice.created",
    workspaceId: session.workspace.id,
    actorUserId: session.user.id,
    actorMemberId: session.member.id,
    actorName: session.member.displayName,
    entityType: "invoice",
    entityId: inserted.id,
    entityLabel: `${number} · ${parsed.data.client}`,
    metadata: { total },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/invoices");
  return { ok: true as const };
}

export async function updateInvoice(id: string, input: z.infer<typeof invoiceSchema>) {
  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const session = await requireSession();
  const { subtotal, total } = computeTotals(parsed.data.line_items, parsed.data.tax_rate);

  await db
    .update(invoices)
    .set({
      client: parsed.data.client,
      type: parsed.data.type,
      description: parsed.data.description ?? null,
      lineItems: parsed.data.line_items,
      subtotal: subtotal.toFixed(2),
      taxRate: parsed.data.tax_rate.toFixed(2),
      total: total.toFixed(2),
      issuedDate: parsed.data.issued_date || undefined,
      dueDate: parsed.data.due_date || null,
      status: parsed.data.status,
      updatedAt: new Date(),
    })
    .where(and(eq(invoices.id, id), eq(invoices.workspaceId, session.workspace.id)));

  await logActivity({
    action: "invoice.updated",
    workspaceId: session.workspace.id,
    actorUserId: session.user.id,
    actorMemberId: session.member.id,
    actorName: session.member.displayName,
    entityType: "invoice",
    entityId: id,
    entityLabel: parsed.data.client,
  });

  revalidatePath("/dashboard/invoices");
  return { ok: true as const };
}

export async function deleteInvoice(id: string) {
  const session = await requireSession();
  const [doomed] = await db
    .select({ invoiceNumber: invoices.invoiceNumber, client: invoices.client })
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.workspaceId, session.workspace.id)))
    .limit(1);
  await db.delete(invoices).where(and(eq(invoices.id, id), eq(invoices.workspaceId, session.workspace.id)));

  await logActivity({
    action: "invoice.deleted",
    workspaceId: session.workspace.id,
    actorUserId: session.user.id,
    actorMemberId: session.member.id,
    actorName: session.member.displayName,
    entityType: "invoice",
    entityId: id,
    entityLabel: doomed ? `${doomed.invoiceNumber} · ${doomed.client}` : null,
  });

  revalidatePath("/dashboard/invoices");
  return { ok: true as const };
}
