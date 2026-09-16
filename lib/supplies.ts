/**
 * Office supplies helpers.
 *
 * Spend totals and "last bought" are derived from the purchase rows rather than
 * stored on the supply, so a corrected or deleted purchase can't leave a stale
 * total behind. `totalCost` is a numeric column and arrives as a string, so it
 * is always Number()-ed before summing.
 */
import { parseDateLike } from "@/lib/utils";
import type { Supply, SupplyPurchase } from "@/lib/db/schema";

export interface SupplyStats {
  /** Spend across every purchase on record. */
  totalSpend: number;
  /** Spend in the given calendar year. */
  yearSpend: number;
  /** Most recent purchase date as a `YYYY-MM-DD` string, or null. */
  lastPurchasedOn: string | null;
  purchaseCount: number;
}

const cost = (p: SupplyPurchase) => Number(p.totalCost ?? 0);

export function statsForPurchases(purchases: SupplyPurchase[], year: number): SupplyStats {
  let totalSpend = 0;
  let yearSpend = 0;
  let lastPurchasedOn: string | null = null;

  for (const p of purchases) {
    totalSpend += cost(p);
    if (parseDateLike(p.purchasedOn).getFullYear() === year) yearSpend += cost(p);
    if (!lastPurchasedOn || p.purchasedOn > lastPurchasedOn) lastPurchasedOn = p.purchasedOn;
  }

  return { totalSpend, yearSpend, lastPurchasedOn, purchaseCount: purchases.length };
}

/** Per-supply stats, keyed by supply id. Supplies with no purchases get zeros. */
export function statsBySupply(
  supplies: Supply[],
  purchases: SupplyPurchase[],
  year: number
): Record<string, SupplyStats> {
  const bySupply = new Map<string, SupplyPurchase[]>();
  for (const p of purchases) {
    const list = bySupply.get(p.supplyId);
    if (list) list.push(p);
    else bySupply.set(p.supplyId, [p]);
  }
  const out: Record<string, SupplyStats> = {};
  for (const s of supplies) out[s.id] = statsForPurchases(bySupply.get(s.id) ?? [], year);
  return out;
}

/** Spend in a given `YYYY-MM` month — the figure shown in the page header. */
export function spendInMonth(purchases: SupplyPurchase[], month: string): number {
  return purchases
    .filter((p) => p.purchasedOn.slice(0, 7) === month)
    .reduce((sum, p) => sum + cost(p), 0);
}

/**
 * What one unit cost on this purchase, or null when the cost or quantity is
 * missing. Used to refresh the supply's last-paid unit cost.
 */
export function effectiveUnitCost(totalCost: number | null, quantity: number): number | null {
  if (totalCost === null || !Number.isFinite(totalCost) || quantity <= 0) return null;
  return Math.round((totalCost / quantity) * 100) / 100;
}

/** Categories already in use, for the add-item autocomplete. */
export function categoriesOf(supplies: Supply[]): string[] {
  const seen = new Set<string>();
  for (const s of supplies) {
    const c = s.category?.trim();
    if (c) seen.add(c);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}
