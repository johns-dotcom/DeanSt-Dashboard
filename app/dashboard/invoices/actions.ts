"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { invoices, invoiceReceipts, workspaces, type LineItem } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/workspace";
import { logActivity } from "@/lib/activity";

const lineItemSchema = z.object({
  description: z.string(),
  notes: z.string().optional(),
  quantity: z.coerce.number().min(0),
  rate: z.coerce.number().min(0),
  amount: z.coerce.number().min(0),
  receiptUploaded: z.boolean().optional(),
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
  return { ok: true as const, id: inserted.id };
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

export async function setInvoiceSent(id: string, sent: boolean) {
  const session = await requireSession();

  const [updated] = await db
    .update(invoices)
    .set({ sent, updatedAt: new Date() })
    .where(and(eq(invoices.id, id), eq(invoices.workspaceId, session.workspace.id)))
    .returning({ invoiceNumber: invoices.invoiceNumber, client: invoices.client });

  if (!updated) return { error: "Invoice not found" };

  await logActivity({
    action: "invoice.updated",
    workspaceId: session.workspace.id,
    actorUserId: session.user.id,
    actorMemberId: session.member.id,
    actorName: session.member.displayName,
    entityType: "invoice",
    entityId: id,
    entityLabel: `${updated.invoiceNumber} · ${updated.client}`,
    metadata: { sent },
  });

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/invoices", "layout");
  return { ok: true as const };
}

export async function setInvoiceType(id: string, type: "invoice" | "reimbursement") {
  const session = await requireSession();

  const [updated] = await db
    .update(invoices)
    .set({ type, updatedAt: new Date() })
    .where(and(eq(invoices.id, id), eq(invoices.workspaceId, session.workspace.id)))
    .returning({ invoiceNumber: invoices.invoiceNumber, client: invoices.client });

  if (!updated) return { error: "Invoice not found" };

  await logActivity({
    action: "invoice.updated",
    workspaceId: session.workspace.id,
    actorUserId: session.user.id,
    actorMemberId: session.member.id,
    actorName: session.member.displayName,
    entityType: "invoice",
    entityId: id,
    entityLabel: `${updated.invoiceNumber} · ${updated.client}`,
    metadata: { typeChanged: type },
  });

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/invoices", "layout");
  return { ok: true as const };
}

export async function setInvoiceStatus(id: string, status: "draft" | "pending" | "overdue" | "paid") {
  const session = await requireSession();

  const [updated] = await db
    .update(invoices)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(invoices.id, id), eq(invoices.workspaceId, session.workspace.id)))
    .returning({ invoiceNumber: invoices.invoiceNumber, client: invoices.client });

  if (!updated) return { error: "Invoice not found" };

  await logActivity({
    action: "invoice.updated",
    workspaceId: session.workspace.id,
    actorUserId: session.user.id,
    actorMemberId: session.member.id,
    actorName: session.member.displayName,
    entityType: "invoice",
    entityId: id,
    entityLabel: `${updated.invoiceNumber} · ${updated.client}`,
    metadata: { statusChanged: status },
  });

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/invoices", "layout");
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

const combineSchema = z.object({ ids: z.array(z.string().uuid()).min(2, "Select at least two invoices") });

/**
 * Merge several unsent invoices for the same client into one new invoice:
 * line items are concatenated, receipts re-pointed to the new invoice, and
 * the originals deleted — all atomically. The new invoice gets the next
 * number and starts as a draft so it can be reviewed before sending.
 */
export async function combineInvoices(input: z.infer<typeof combineSchema>) {
  const parsed = combineSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const session = await requireSession();
  if (session.member.role === "view_only") return { error: "View-only members can't combine invoices" };
  const wsId = session.workspace.id;

  const rows = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.workspaceId, wsId), inArray(invoices.id, parsed.data.ids)));

  if (rows.length < 2) return { error: "Select at least two invoices to combine" };
  if (rows.some((r) => r.sent)) return { error: "Sent invoices can't be combined" };
  if (rows.some((r) => r.client !== rows[0].client)) return { error: "All selected invoices must be for the same client" };
  if (rows.some((r) => r.type !== rows[0].type)) return { error: "Can't combine invoices and reimbursements together" };

  const client = rows[0].client;
  const type = rows[0].type;
  const lineItems: LineItem[] = rows.flatMap((r) => r.lineItems ?? []);
  // Keep the shared tax rate only if every invoice agrees; otherwise drop to 0
  // rather than silently applying one invoice's rate to all.
  const allTax = rows.map((r) => Number(r.taxRate));
  const taxRate = allTax.every((t) => t === allTax[0]) ? allTax[0] : 0;
  const { subtotal, total } = computeTotals(lineItems, taxRate);
  const dueDates = rows.map((r) => r.dueDate).filter((d): d is string => Boolean(d)).sort();
  const dueDate = dueDates.length ? dueDates[dueDates.length - 1] : null; // latest, so no line's deadline shortens
  const description = rows.map((r) => r.description?.trim()).find(Boolean) ?? null;
  const today = new Date().toISOString().slice(0, 10);

  const newId = await db.transaction(async (tx) => {
    const [ws] = await tx
      .update(workspaces)
      .set({ invoiceSeq: sql`${workspaces.invoiceSeq} + 1` })
      .where(eq(workspaces.id, wsId))
      .returning({ seq: workspaces.invoiceSeq, prefix: workspaces.invoicePrefix });
    const number = `${ws.prefix}${String(ws.seq - 1).padStart(4, "0")}`;

    const [created] = await tx
      .insert(invoices)
      .values({
        workspaceId: wsId,
        invoiceNumber: number,
        client,
        type,
        description,
        lineItems,
        subtotal: subtotal.toFixed(2),
        taxRate: taxRate.toFixed(2),
        total: total.toFixed(2),
        issuedDate: today,
        dueDate,
        status: "draft",
      })
      .returning({ id: invoices.id, invoiceNumber: invoices.invoiceNumber });

    // Move any attached receipts onto the combined invoice, then remove originals.
    await tx
      .update(invoiceReceipts)
      .set({ invoiceId: created.id })
      .where(and(eq(invoiceReceipts.workspaceId, wsId), inArray(invoiceReceipts.invoiceId, parsed.data.ids)));
    await tx.delete(invoices).where(and(eq(invoices.workspaceId, wsId), inArray(invoices.id, parsed.data.ids)));

    return { id: created.id, number };
  });

  await logActivity({
    action: "invoice.created",
    workspaceId: wsId,
    actorUserId: session.user.id,
    actorMemberId: session.member.id,
    actorName: session.member.displayName,
    entityType: "invoice",
    entityId: newId.id,
    entityLabel: `${newId.number} · ${client} · combined ${rows.length} invoices`,
    metadata: { total, combinedFrom: rows.map((r) => r.invoiceNumber) },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/invoices");
  return { ok: true as const, id: newId.id, number: newId.number };
}
