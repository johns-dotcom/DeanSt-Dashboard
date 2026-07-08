/**
 * Invoice numbering helpers. Numbers are assigned by filling the lowest gap:
 * the next number is the smallest positive integer not already in use, so
 * numbers freed by deleted invoices get reused before the sequence extends.
 */
export function parseInvoiceNumber(s: string): number {
  const m = s.match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

/** Smallest positive integer not present in the given invoice numbers. */
export function lowestAvailableNumber(existing: string[]): number {
  const used = new Set(existing.map(parseInvoiceNumber).filter((n) => n > 0));
  let n = 1;
  while (used.has(n)) n++;
  return n;
}

export function formatInvoiceNumber(prefix: string, n: number): string {
  return `${prefix}${String(n).padStart(4, "0")}`;
}

/** Descending sort comparator by numeric value of the invoice number. */
export function byInvoiceNumberDesc(a: { invoiceNumber: string }, b: { invoiceNumber: string }): number {
  return parseInvoiceNumber(b.invoiceNumber) - parseInvoiceNumber(a.invoiceNumber);
}
