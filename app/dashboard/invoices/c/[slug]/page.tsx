import { notFound } from "next/navigation";
import { and, asc, eq, ilike } from "drizzle-orm";
import { requireSession } from "@/lib/auth/workspace";
import { db } from "@/lib/db";
import { invoices, workspaces, invoiceClientPages } from "@/lib/db/schema";
import { formatInvoiceNumber, nextInvoiceNumberValue, byInvoiceNumberDesc } from "@/lib/invoice-number";
import { paymentInfoFromWorkspace } from "@/lib/invoice-payment";
import { InvoicesClient } from "../../invoices-client";

export default async function ClientInvoicesPage({ params }: { params: { slug: string } }) {
  const session = await requireSession();
  const wsId = session.workspace.id;

  const [allPages, [ws], allNumbers] = await Promise.all([
    db.select().from(invoiceClientPages).where(eq(invoiceClientPages.workspaceId, wsId)).orderBy(asc(invoiceClientPages.sortOrder), asc(invoiceClientPages.name)),
    db.select({ invoicePrefix: workspaces.invoicePrefix, invoiceSeq: workspaces.invoiceSeq }).from(workspaces).where(eq(workspaces.id, wsId)),
    db.select({ invoiceNumber: invoices.invoiceNumber }).from(invoices).where(eq(invoices.workspaceId, wsId)),
  ]);

  const page = allPages.find((p) => p.slug === params.slug);
  if (!page) notFound();

  const rows = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.workspaceId, wsId), ilike(invoices.client, `%${page.name}%`)));

  rows.sort(byInvoiceNumberDesc);

  // The counter is workspace-wide, not per client page.
  const nextNumber = formatInvoiceNumber(
    ws?.invoicePrefix ?? "INV-",
    nextInvoiceNumberValue(ws?.invoiceSeq ?? 1, allNumbers.map((r) => r.invoiceNumber))
  );

  return (
    <InvoicesClient
      invoices={rows}
      workspaceName={session.workspace.name}
      payment={paymentInfoFromWorkspace(session.workspace)}
      defaultPaymentTerms={session.workspace.defaultPaymentTerms}
      nextInvoiceNumber={nextNumber}
      clientPages={allPages}
      activeClientSlug={page.slug}
      activeClientName={page.name}
    />
  );
}
