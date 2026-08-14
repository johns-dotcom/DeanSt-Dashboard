import type { Workspace } from "@/lib/db/schema";

/**
 * The "Funds payable to" details for an invoice. Built once from the workspace
 * row so the on-screen preview (invoice-preview.tsx) and the generated PDF
 * (invoice-pdf.tsx) render from a single source and can never drift — a wrong
 * account/routing number reaching a client is a real financial hazard.
 */
export interface InvoicePaymentInfo {
  /** Legal entity behind the payee, printed under the payee line. */
  entityName: string;
  entityAddressLines: string[];
  contactName: string;
  contactEmail: string;
  bankName: string;
  bankAddressLines: string[];
  accountNumber: string;
  /** ACH routing number — printed alongside the wire routing number. */
  routingNumber: string;
  wireRoutingNumber: string;
  payeeName: string;
}

/** Split a stored multi-line address into trimmed, non-empty lines. */
function addressLines(value: string): string[] {
  return value.split("\n").map((l) => l.trim()).filter(Boolean);
}

export function paymentInfoFromWorkspace(ws: Workspace): InvoicePaymentInfo {
  return {
    entityName: ws.invoiceEntityName,
    entityAddressLines: addressLines(ws.invoiceEntityAddress),
    contactName: ws.invoiceContactName,
    contactEmail: ws.invoiceContactEmail,
    bankName: ws.invoiceBankName,
    bankAddressLines: addressLines(ws.invoiceBankAddress),
    accountNumber: ws.invoiceAccountNumber,
    routingNumber: ws.invoiceRoutingNumber,
    wireRoutingNumber: ws.invoiceWireRoutingNumber,
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
    p.entityName,
    ...p.entityAddressLines,
    "",
    `CONTACT: ${p.contactName}`,
    `EMAIL: ${p.contactEmail}`,
    "",
    "PAYMENT METHOD",
    p.bankName,
    ...p.bankAddressLines,
    "",
    `Account: ${p.accountNumber}`,
    `ACH Routing: ${p.routingNumber}`,
    `Wire Routing: ${p.wireRoutingNumber}`,
  ];
}
