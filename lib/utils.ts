import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

/**
 * Parse a date input that might be either a calendar-only `YYYY-MM-DD`
 * string (no timezone) or a full ISO timestamp. Calendar-only strings
 * are interpreted in the user's local timezone — otherwise
 * `new Date("2026-05-31")` resolves to UTC midnight, which displays as
 * May 30 anywhere west of UTC.
 */
export function parseDateLike(input: string | Date): Date {
  if (input instanceof Date) return input;
  const calendar = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (calendar) return new Date(Number(calendar[1]), Number(calendar[2]) - 1, Number(calendar[3]));
  return new Date(input);
}

export function formatDate(input: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!input) return "—";
  const d = parseDateLike(input);
  return new Intl.DateTimeFormat("en-US", opts ?? { month: "short", day: "numeric", year: "numeric" }).format(d);
}

export function isOverdue(due: string | null | undefined) {
  if (!due) return false;
  const dueDate = parseDateLike(due);
  dueDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
}
