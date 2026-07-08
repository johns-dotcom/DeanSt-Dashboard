import { asc, eq, sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth/workspace";
import { db } from "@/lib/db";
import { invoices, workspaces, invoiceClientPages, invoiceReceipts } from "@/lib/db/schema";
import { formatInvoiceNumber, lowestAvailableNumber, byInvoiceNumberDesc } from "@/lib/invoice-number";
import { InvoicesClient } from "./invoices-client";

export default async function InvoicesPage() {
  const session = await requireSession();
  const wsId = session.workspace.id;

  const [rows, pages, receiptCountRows, [ws]] = await Promise.all([
    db.select().from(invoices).where(eq(invoices.workspaceId, wsId)),
    db.select().from(invoiceClientPages).where(eq(invoiceClientPages.workspaceId, wsId)).orderBy(asc(invoiceClientPages.sortOrder), asc(invoiceClientPages.name)),
    db
      .select({ invoiceId: invoiceReceipts.invoiceId, count: sql<number>`count(*)::int` })
      .from(invoiceReceipts)
      .where(eq(invoiceReceipts.workspaceId, wsId))
      .groupBy(invoiceReceipts.invoiceId),
    db.select({ invoicePrefix: workspaces.invoicePrefix }).from(workspaces).where(eq(workspaces.id, wsId)),
  ]);

  rows.sort(byInvoiceNumberDesc);

  const receiptCounts: Record<string, number> = {};
  for (const r of receiptCountRows) receiptCounts[r.invoiceId] = r.count;

  const nextNumber = formatInvoiceNumber(ws?.invoicePrefix ?? "INV-", lowestAvailableNumber(rows.map((r) => r.invoiceNumber)));

  return (
    <InvoicesClient
      invoices={rows}
      workspaceName={session.workspace.name}
      paymentTerms={session.workspace.defaultPaymentTerms}
      nextInvoiceNumber={nextNumber}
      clientPages={pages}
      activeClientSlug={null}
      receiptCounts={receiptCounts}
    />
  );
}
