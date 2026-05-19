import { notFound } from "next/navigation";
import { and, asc, desc, eq, ilike } from "drizzle-orm";
import { requireSession } from "@/lib/auth/workspace";
import { db } from "@/lib/db";
import { invoices, workspaces, invoiceClientPages } from "@/lib/db/schema";
import { InvoicesClient } from "../../invoices-client";

export default async function ClientInvoicesPage({ params }: { params: { slug: string } }) {
  const session = await requireSession();
  const wsId = session.workspace.id;

  const [allPages, [{ invoiceSeq, invoicePrefix }]] = await Promise.all([
    db.select().from(invoiceClientPages).where(eq(invoiceClientPages.workspaceId, wsId)).orderBy(asc(invoiceClientPages.sortOrder), asc(invoiceClientPages.name)),
    db.select({ invoiceSeq: workspaces.invoiceSeq, invoicePrefix: workspaces.invoicePrefix }).from(workspaces).where(eq(workspaces.id, wsId)),
  ]);

  const page = allPages.find((p) => p.slug === params.slug);
  if (!page) notFound();

  const rows = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.workspaceId, wsId), ilike(invoices.client, `%${page.name}%`)))
    .orderBy(desc(invoices.issuedDate));

  const nextNumber = `${invoicePrefix}${String(invoiceSeq).padStart(4, "0")}`;

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
