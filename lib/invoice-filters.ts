/**
 * Filtering, grouping and sorting for the invoices ledger.
 *
 * Pure functions over the rows the server already fetched — this dashboard
 * filters client-side everywhere (activity, contacts, deals), and full
 * server-side search/pagination was deliberately deferred at current scale.
 *
 * Every `issuedDate` read goes through `parseDateLike`: those are calendar-only
 * `YYYY-MM-DD` strings, and `new Date(s)` would read them as UTC midnight and
 * bucket a first-of-the-month invoice into the previous month anywhere west of
 * UTC. `total` is a numeric column and arrives as a string, so it is always
 * `Number()`-ed before summing.
 */
import { parseDateLike } from "@/lib/utils";
import { parseInvoiceNumber } from "@/lib/invoice-number";
import type { Invoice, InvoiceStatus, InvoiceType } from "@/lib/db/schema";

/** An invoice is "open" until it's paid. */
export const OPEN_STATUSES: InvoiceStatus[] = ["draft", "pending", "overdue"];

export type StatusFilter = "all" | "open" | "closed" | InvoiceStatus;
export type TypeFilter = "all" | InvoiceType;
export type SentFilter = "all" | "sent" | "unsent";
export type RangeKey = "all" | "month" | "3m" | "year" | "last-year";
export type GroupKey = "month" | "quarter" | "year" | "client" | "none";
export type SortDir = "desc" | "asc";

export interface InvoiceFilterState {
  query: string;
  status: StatusFilter;
  type: TypeFilter;
  sent: SentFilter;
  range: RangeKey;
  group: GroupKey;
  sort: SortDir;
}

export const DEFAULT_FILTERS: InvoiceFilterState = {
  query: "",
  status: "all",
  type: "all",
  sent: "all",
  range: "all",
  group: "month",
  sort: "desc",
};

/** True when anything is narrowing the list (grouping/sort don't count). */
export function hasActiveFilters(s: InvoiceFilterState): boolean {
  return (
    s.query.trim() !== "" ||
    s.status !== "all" ||
    s.type !== "all" ||
    s.sent !== "all" ||
    s.range !== "all"
  );
}

/**
 * Inclusive lower bound for a range preset, or null for "all time". Boundaries
 * are built from local calendar parts so "this month" means the user's month.
 */
export function rangeStart(range: RangeKey, now = new Date()): Date | null {
  switch (range) {
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "3m":
      return new Date(now.getFullYear(), now.getMonth() - 2, 1);
    case "year":
      return new Date(now.getFullYear(), 0, 1);
    case "last-year":
      return new Date(now.getFullYear() - 1, 0, 1);
    default:
      return null;
  }
}

/** Exclusive upper bound — only "last year" is a closed window. */
function rangeEnd(range: RangeKey, now = new Date()): Date | null {
  return range === "last-year" ? new Date(now.getFullYear(), 0, 1) : null;
}

function matchesStatus(status: InvoiceStatus, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "open") return OPEN_STATUSES.includes(status);
  if (filter === "closed") return !OPEN_STATUSES.includes(status);
  return status === filter;
}

export function matchesFilters(inv: Invoice, s: InvoiceFilterState, now = new Date()): boolean {
  if (!matchesStatus(inv.status, s.status)) return false;
  if (s.type !== "all" && inv.type !== s.type) return false;
  if (s.sent !== "all" && inv.sent !== (s.sent === "sent")) return false;

  const start = rangeStart(s.range, now);
  if (start) {
    const issued = parseDateLike(inv.issuedDate);
    if (issued < start) return false;
    const end = rangeEnd(s.range, now);
    if (end && issued >= end) return false;
  }

  const q = s.query.trim().toLowerCase();
  if (q) {
    const hay = `${inv.invoiceNumber} ${inv.client} ${inv.description ?? ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

/** Counts for the status pill labels. Computed over whatever else is filtered. */
export function statusCounts(rows: Invoice[]): Record<StatusFilter, number> {
  const counts: Record<StatusFilter, number> = {
    all: rows.length,
    open: 0,
    closed: 0,
    draft: 0,
    pending: 0,
    overdue: 0,
    paid: 0,
  };
  for (const inv of rows) {
    counts[inv.status] += 1;
    if (OPEN_STATUSES.includes(inv.status)) counts.open += 1;
    else counts.closed += 1;
  }
  return counts;
}

export interface InvoiceGroup {
  key: string;
  label: string;
  invoices: Invoice[];
  total: number;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Bucket key + label for one invoice. Keys sort lexicographically in calendar
 * order ("2026-08" > "2026-07"), which is what the group sort relies on.
 */
function bucketFor(inv: Invoice, group: GroupKey): { key: string; label: string } {
  if (group === "client") return { key: inv.client.toLowerCase(), label: inv.client };
  const d = parseDateLike(inv.issuedDate);
  const year = d.getFullYear();
  if (group === "year") return { key: String(year), label: String(year) };
  if (group === "quarter") {
    const q = Math.floor(d.getMonth() / 3) + 1;
    return { key: `${year}-Q${q}`, label: `Q${q} ${year}` };
  }
  return {
    key: `${year}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    label: `${MONTHS[d.getMonth()]} ${year}`,
  };
}

/** Issued date, newest first by default; invoice number breaks same-day ties. */
function compareInvoices(a: Invoice, b: Invoice, sort: SortDir): number {
  const diff = parseDateLike(a.issuedDate).getTime() - parseDateLike(b.issuedDate).getTime();
  const byDate = sort === "desc" ? -diff : diff;
  if (byDate !== 0) return byDate;
  const byNumber = parseInvoiceNumber(b.invoiceNumber) - parseInvoiceNumber(a.invoiceNumber);
  return sort === "desc" ? byNumber : -byNumber;
}

export function sortInvoices(rows: Invoice[], sort: SortDir): Invoice[] {
  return [...rows].sort((a, b) => compareInvoices(a, b, sort));
}

export function sumTotals(rows: Invoice[]): number {
  return rows.reduce((sum, inv) => sum + Number(inv.total), 0);
}

/**
 * Group pre-filtered rows for rendering. `group: "none"` returns a single
 * unlabelled group so the caller can render one flat list without branching.
 */
export function groupInvoices(rows: Invoice[], s: InvoiceFilterState): InvoiceGroup[] {
  const sorted = sortInvoices(rows, s.sort);
  if (s.group === "none") {
    return sorted.length ? [{ key: "all", label: "", invoices: sorted, total: sumTotals(sorted) }] : [];
  }

  const groups = new Map<string, InvoiceGroup>();
  for (const inv of sorted) {
    const { key, label } = bucketFor(inv, s.group);
    const existing = groups.get(key);
    if (existing) existing.invoices.push(inv);
    else groups.set(key, { key, label, invoices: [inv], total: 0 });
  }

  const out = [...groups.values()];
  for (const g of out) g.total = sumTotals(g.invoices);

  // Client groups read alphabetically; date groups follow the sort direction.
  out.sort((a, b) =>
    s.group === "client"
      ? a.key.localeCompare(b.key)
      : s.sort === "desc"
        ? b.key.localeCompare(a.key)
        : a.key.localeCompare(b.key)
  );
  return out;
}
