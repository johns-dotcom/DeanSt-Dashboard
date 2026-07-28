import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeTotals } from "../lib/invoice-totals.ts";

describe("computeTotals", () => {
  it("sums explicit line amounts", () => {
    const r = computeTotals(
      [
        { quantity: 1, rate: 0, amount: 100 },
        { quantity: 1, rate: 0, amount: 50 },
      ],
      0
    );
    assert.equal(r.subtotal, 150);
    assert.equal(r.total, 150);
  });

  it("falls back to quantity × rate when amount is 0", () => {
    const r = computeTotals([{ quantity: 3, rate: 25, amount: 0 }], 0);
    assert.equal(r.subtotal, 75);
    assert.equal(r.total, 75);
  });

  it("applies the tax rate as a percentage", () => {
    const r = computeTotals([{ quantity: 1, rate: 0, amount: 200 }], 10);
    assert.equal(r.subtotal, 200);
    assert.equal(r.total, 220);
  });

  it("rounds floating-point sums to cents", () => {
    const r = computeTotals(
      [
        { quantity: 1, rate: 0, amount: 0.1 },
        { quantity: 1, rate: 0, amount: 0.2 },
      ],
      0
    );
    assert.equal(r.subtotal, 0.3); // 0.1 + 0.2 = 0.30000000000000004 → rounded
    assert.equal(r.total, 0.3);
  });

  it("applies a fractional tax rate", () => {
    const r = computeTotals([{ quantity: 1, rate: 0, amount: 200 }], 8.25);
    assert.equal(r.subtotal, 200);
    assert.equal(r.total, 216.5); // 200 * 1.0825
  });

  it("returns zeros for no line items", () => {
    const r = computeTotals([], 10);
    assert.equal(r.subtotal, 0);
    assert.equal(r.total, 0);
  });
});
