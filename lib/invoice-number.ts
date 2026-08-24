/**
 * Invoice numbering helpers. Numbers only ever move forward: each new invoice
 * takes the workspace's counter, which is then bumped. Gaps left by deleted or
 * combined invoices are NOT refilled — refilling made numbers unrelated to the
 * order invoices were created in (two made back to back could come out #0013
 * and #0017), and it recycled a number that may already be on a PDF sitting in
 * a client's inbox.
 */
export function parseInvoiceNumber(s: string): number {
  const m = s.match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

/**
 * The number to assign next: the workspace counter, floored to just past the
 * highest number already in use. The floor is a self-heal — if the counter ever
 * lags the invoices (an import, a restored backup, a hand-edited row), it must
 * not hand out a number that would collide with an existing one.
 */
export function nextInvoiceNumberValue(seq: number, existing: string[]): number {
  const highest = existing.reduce((max, n) => Math.max(max, parseInvoiceNumber(n)), 0);
  return Math.max(seq, highest + 1, 1);
}

export function formatInvoiceNumber(prefix: string, n: number): string {
  return `${prefix}${String(n).padStart(4, "0")}`;
}

/** Descending sort comparator by numeric value of the invoice number. */
export function byInvoiceNumberDesc(a: { invoiceNumber: string }, b: { invoiceNumber: string }): number {
  return parseInvoiceNumber(b.invoiceNumber) - parseInvoiceNumber(a.invoiceNumber);
}
