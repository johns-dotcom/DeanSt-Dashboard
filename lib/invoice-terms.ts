/**
 * Invoice payment terms. One list, shared by the workspace default (Settings)
 * and the per-invoice picker on the create form, so the two can't drift.
 *
 * Terms are the source of the due date: picking "Net 30" dates the invoice
 * 30 days out from its issue date. The computed date is only a starting point —
 * the form leaves it editable, and whatever is stored on the invoice is what
 * prints.
 */
import { parseDateLike } from "@/lib/utils";

export const PAYMENT_TERMS = ["Net 15", "Net 30", "Net 45", "Net 60", "Due on receipt"] as const;

export type PaymentTerms = (typeof PAYMENT_TERMS)[number];

export const DEFAULT_PAYMENT_TERMS: PaymentTerms = "Net 30";

/** Days a "Net N" term allows, or 0 for due-on-receipt. Null if unrecognized. */
export function termDays(terms: string): number | null {
  const t = terms.trim();
  if (!t) return null;
  if (/^due on receipt$/i.test(t)) return 0;
  const m = /^net\s*(\d+)$/i.exec(t);
  return m ? Number(m[1]) : null;
}

/**
 * The due date these terms imply, as a calendar-only `YYYY-MM-DD` string, or
 * null when the terms aren't a recognized "Net N" / due-on-receipt value.
 * Day arithmetic runs on local calendar parts so it can't shift a day.
 */
export function dueDateFromTerms(issuedDate: string, terms: string): string | null {
  const days = termDays(terms);
  if (days === null || !issuedDate.trim()) return null;
  const issued = parseDateLike(issuedDate.trim());
  if (Number.isNaN(issued.getTime())) return null;
  const due = new Date(issued.getFullYear(), issued.getMonth(), issued.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}`;
}
