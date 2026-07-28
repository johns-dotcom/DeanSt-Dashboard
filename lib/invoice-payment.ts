import type { Workspace } from "@/lib/db/schema";

/**
 * The "Funds payable to" details for an invoice. Built once from the workspace
 * row so the on-screen preview (invoice-preview.tsx) and the generated PDF
 * (invoice-pdf.tsx) render from a single source and can never drift — a wrong
 * account/routing number reaching a client is a real financial hazard.
 */
export interface InvoicePaymentInfo {
  entityName: string;
  contactName: string;
  contactEmail: string;
  bankName: string;
  bankAddressLines: string[];
  accountNumber: string;
  routingNumber: string;
  payeeName: string;
}

export function paymentInfoFromWorkspace(ws: Workspace): InvoicePaymentInfo {
  return {
    entityName: ws.invoiceEntityName,
    contactName: ws.invoiceContactName,
    contactEmail: ws.invoiceContactEmail,
    bankName: ws.invoiceBankName,
    bankAddressLines: ws.invoiceBankAddress
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean),
    accountNumber: ws.invoiceAccountNumber,
    routingNumber: ws.invoiceRoutingNumber,
    payeeName: ws.invoicePayeeName,
  };
}
