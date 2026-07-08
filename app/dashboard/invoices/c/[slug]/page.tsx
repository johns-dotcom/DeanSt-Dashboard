import { notFound } from "next/navigation";
import { and, asc, eq, ilike } from "drizzle-orm";
import { requireSession } from "@/lib/auth/workspace";
import { db } from "@/lib/db";
import { invoices, workspaces, invoiceClientPages } from "@/lib/db/schema";
import { formatInvoiceNumber, lowestAvailableNumber, byInvoiceNumberDesc } from "@/lib/invoice-number";
import { InvoicesClient } from "../../invoices-client";

export default async function ClientInvoicesPage({ params }: { params: { slug: string } }) {
  const session = await requireSession();
  const wsId = session.workspace.id;

  const [allPages, [ws], allNumbers] = await Promise.all([
    db.select().from(invoiceClientPages).where(eq(invoiceClientPages.workspaceId, wsId)).orderBy(asc(invoiceClientPages.sortOrder), asc(invoiceClientPages.name)),
    db.select({ invoicePrefix: workspaces.invoicePrefix }).from(workspaces).where(eq(workspaces.id, wsId)),
    db.select({ invoiceNumber: invoices.invoiceNumber }).from(invoices).where(eq(invoices.workspaceId, wsId)),
  ]);

  const page = allPages.find((p) => p.slug === params.slug);
  if (!page) notFound();

  const rows = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.workspaceId, wsId), ilike(invoices.client, `%${page.name}%`)));

  rows.sort(byInvoiceNumberDesc);

  // Next number is gap-filled across the whole workspace, not just this client.
  const nextNumber = formatInvoiceNumber(ws?.invoicePrefix ?? "INV-", lowestAvailableNumber(allNumbers.map((r) => r.invoiceNumber)));

  return (
    <InvoicesClient
      invoices={rows}
      workspaceName={session.workspace.name}
      paymentTerms={session.workspace.defaultPaymentTerms}
      nextInvoiceNumber={nextNumber}
      clientPages={allPages}
      activeClientSlug={page.slug}
      activeClientName={page.name}
    />
  );
}
