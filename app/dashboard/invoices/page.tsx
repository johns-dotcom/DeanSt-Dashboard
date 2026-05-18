import { desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/workspace";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { InvoicesClient } from "./invoices-client";

export default async function InvoicesPage() {
  const session = await requireSession();
  const rows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.workspaceId, session.workspace.id))
    .orderBy(desc(invoices.issuedDate));

  return (
    <InvoicesClient
      invoices={rows}
      workspaceName={session.workspace.name}
      paymentTerms={session.workspace.defaultPaymentTerms}
    />
  );
}
