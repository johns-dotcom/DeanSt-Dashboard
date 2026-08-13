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

/**
 * The lines of the "Funds payable to" block, in order, with "" marking a blank
 * spacer line. Shared so the preview and the PDF render the identical block.
 */
export function payableToLines(p: InvoicePaymentInfo): string[] {
  return [
    `Payable to ${p.payeeName}`,
    "",
    `CONTACT: ${p.contactName}`,
    `EMAIL: ${p.contactEmail}`,
    "",
    "PAYMENT METHOD",
    p.bankName,
    ...p.bankAddressLines,
    "",
    `Account: ${p.accountNumber}`,
    `Routing: ${p.routingNumber}`,
  ];
}
