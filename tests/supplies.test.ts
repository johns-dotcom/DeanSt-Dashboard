import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  statsForPurchases,
  statsBySupply,
  spendInMonth,
  effectiveUnitCost,
  categoriesOf,
} from "@/lib/supplies";
import type { Supply, SupplyPurchase } from "@/lib/db/schema";

const purchase = (o: Partial<SupplyPurchase> = {}): SupplyPurchase => ({
  id: "p", workspaceId: "w", supplyId: "s1",
  purchasedOn: "2026-09-14", vendor: "Staples", quantity: 5,
  totalCost: "89.95", notes: null, createdBy: null, createdAt: new Date(0),
  ...o,
} as SupplyPurchase);

const supply = (o: Partial<Supply> = {}): Supply => ({
  id: "s1", workspaceId: "w", name: "Printer paper", category: "Paper",
  vendor: "Staples", reorderUrl: null, unitLabel: "rm", unitCost: "17.99",
  quantityOnHand: 12, location: "Closet", needsReorder: false, notes: null,
  createdBy: null, createdAt: new Date(0), updatedAt: new Date(0),
  ...o,
} as Supply);

describe("statsForPurchases", () => {
  it("sums spend and finds the latest purchase", () => {
    const stats = statsForPurchases(
      [
        purchase({ purchasedOn: "2026-09-14", totalCost: "89.95" }),
        purchase({ purchasedOn: "2026-02-02", totalCost: "10.05" }),
      ],
      2026
    );
    assert.equal(stats.totalSpend, 100);
    assert.equal(stats.yearSpend, 100);
    assert.equal(stats.lastPurchasedOn, "2026-09-14");
    assert.equal(stats.purchaseCount, 2);
  });

  it("counts only the requested year toward year spend", () => {
    const stats = statsForPurchases(
      [
        purchase({ purchasedOn: "2026-01-01", totalCost: "100.00" }),
        purchase({ purchasedOn: "2025-12-31", totalCost: "500.00" }),
      ],
      2026
    );
    assert.equal(stats.yearSpend, 100);
    assert.equal(stats.totalSpend, 600);
  });

  it("keeps a Jan 1 purchase in its own year", () => {
    // A UTC-parsed date would fall back into the previous year west of UTC.
    assert.equal(statsForPurchases([purchase({ purchasedOn: "2026-01-01", totalCost: "5.00" })], 2026).yearSpend, 5);
  });

  it("treats a purchase with no recorded cost as zero", () => {
    const stats = statsForPurchases([purchase({ totalCost: null })], 2026);
    assert.equal(stats.totalSpend, 0);
    assert.equal(stats.purchaseCount, 1);
  });

  it("returns zeros for no purchases", () => {
    assert.deepEqual(statsForPurchases([], 2026), {
      totalSpend: 0, yearSpend: 0, lastPurchasedOn: null, purchaseCount: 0,
    });
  });
});

describe("statsBySupply", () => {
  it("keys stats by supply and zeroes out ones never bought", () => {
    const stats = statsBySupply(
      [supply({ id: "s1" }), supply({ id: "s2", name: "Toner" })],
      [purchase({ supplyId: "s1", totalCost: "20.00" })],
      2026
    );
    assert.equal(stats.s1.totalSpend, 20);
    assert.equal(stats.s2.totalSpend, 0);
    assert.equal(stats.s2.lastPurchasedOn, null);
  });
});

describe("spendInMonth", () => {
  it("adds up only that month's purchases", () => {
    const rows = [
      purchase({ purchasedOn: "2026-09-14", totalCost: "89.95" }),
      purchase({ purchasedOn: "2026-09-02", totalCost: "10.05" }),
      purchase({ purchasedOn: "2026-08-28", totalCost: "42.99" }),
    ];
    assert.equal(spendInMonth(rows, "2026-09"), 100);
    assert.equal(spendInMonth(rows, "2026-10"), 0);
  });
});

describe("effectiveUnitCost", () => {
  it("divides cost across the quantity, rounded to cents", () => {
    assert.equal(effectiveUnitCost(89.95, 5), 17.99);
    assert.equal(effectiveUnitCost(10, 3), 3.33);
  });
  it("returns null when there is nothing to divide", () => {
    assert.equal(effectiveUnitCost(null, 5), null);
    assert.equal(effectiveUnitCost(20, 0), null);
    assert.equal(effectiveUnitCost(20, -1), null);
  });
});

describe("categoriesOf", () => {
  it("lists distinct trimmed categories alphabetically", () => {
    const list = categoriesOf([
      supply({ category: "Paper" }),
      supply({ category: " Ink " }),
      supply({ category: "Paper" }),
      supply({ category: "" }),
      supply({ category: null }),
    ]);
    assert.deepEqual(list, ["Ink", "Paper"]);
  });
});
