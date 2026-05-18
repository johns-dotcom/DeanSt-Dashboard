import { desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/workspace";
import { db } from "@/lib/db";
import { invoices, workspaces } from "@/lib/db/schema";
import { InvoicesClient } from "./invoices-client";

export default async function InvoicesPage() {
  const session = await requireSession();
  const wsId = session.workspace.id;

  const rows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.workspaceId, wsId))
    .orderBy(desc(invoices.issuedDate));

  const [{ invoiceSeq, invoicePrefix }] = await db
    .select({ invoiceSeq: workspaces.invoiceSeq, invoicePrefix: workspaces.invoicePrefix })
    .from(workspaces)
    .where(eq(workspaces.id, wsId));

  const nextNumber = `${invoicePrefix}${String(invoiceSeq).padStart(4, "0")}`;

  return (
    <InvoicesClient
      invoices={rows}
      workspaceName={session.workspace.name}
      paymentTerms={session.workspace.defaultPaymentTerms}
      nextInvoiceNumber={nextNumber}
    />
  );
}
