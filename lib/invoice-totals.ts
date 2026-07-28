/**
 * Pure invoice math. Subtotal is the sum of line amounts (falling back to
 * quantity × rate when an explicit amount isn't given); total applies the tax
 * rate as a percentage. Both are rounded to cents. Kept dependency-free so it
 * can be unit-tested and shared between the server action and any preview.
 */
export function computeTotals(
  items: { quantity: number; rate: number; amount: number }[],
  taxRate: number
): { subtotal: number; total: number } {
  const subtotal = items.reduce((s, i) => s + Number(i.amount || i.quantity * i.rate), 0);
  const total = subtotal * (1 + taxRate / 100);
  return { subtotal: Number(subtotal.toFixed(2)), total: Number(total.toFixed(2)) };
}
