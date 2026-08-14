import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_FILTERS,
  groupInvoices,
  hasActiveFilters,
  matchesFilters,
  rangeStart,
  statusCounts,
  sumTotals,
  type InvoiceFilterState,
} from "../lib/invoice-filters.ts";
import type { Invoice } from "@/lib/db/schema";

function invoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: overrides.invoiceNumber ?? "id",
    invoiceNumber: "INV-0001",
    client: "Russ My Way",
    type: "invoice",
    description: "Campaign work",
    lineItems: [],
    subtotal: "1000.00",
    taxRate: "0",
    total: "1000.00",
    issuedDate: "2026-08-13",
    dueDate: null,
    status: "draft",
    sent: false,
    ...overrides,
  } as Invoice;
}

function filters(overrides: Partial<InvoiceFilterState> = {}): InvoiceFilterState {
  return { ...DEFAULT_FILTERS, ...overrides };
}

describe("matchesFilters — status", () => {
  const rows = [
    invoice({ status: "draft" }),
    invoice({ status: "pending" }),
    invoice({ status: "overdue" }),
    invoice({ status: "paid" }),
  ];

  it("treats draft, unpaid and overdue as open", () => {
    const open = rows.filter((r) => matchesFilters(r, filters({ status: "open" })));
    assert.deepEqual(open.map((r) => r.status), ["draft", "pending", "overdue"]);
  });

  it("treats only paid as closed", () => {
    const closed = rows.filter((r) => matchesFilters(r, filters({ status: "closed" })));
    assert.deepEqual(closed.map((r) => r.status), ["paid"]);
  });

  it("matches an individual status exactly", () => {
    const overdue = rows.filter((r) => matchesFilters(r, filters({ status: "overdue" })));
    assert.deepEqual(overdue.map((r) => r.status), ["overdue"]);
  });

  it("passes everything through when set to all", () => {
    assert.equal(rows.filter((r) => matchesFilters(r, filters())).length, 4);
  });
});

describe("matchesFilters — search, type and sent", () => {
  const inv = invoice({ invoiceNumber: "INV-0013", client: "Tyler Henry", description: "Q3 flight" });

  it("matches invoice number, client and description case-insensitively", () => {
    for (const query of ["0013", "tyler", "Q3 FLIGHT"]) {
      assert.ok(matchesFilters(inv, filters({ query })), `expected a match for ${query}`);
    }
    assert.equal(matchesFilters(inv, filters({ query: "boom records" })), false);
  });

  it("filters by type and sent state", () => {
    assert.equal(matchesFilters(inv, filters({ type: "reimbursement" })), false);
    assert.equal(matchesFilters(inv, filters({ type: "invoice" })), true);
    assert.equal(matchesFilters(inv, filters({ sent: "sent" })), false);
    assert.equal(matchesFilters(inv, filters({ sent: "unsent" })), true);
  });

  it("ignores a whitespace-only query", () => {
    assert.equal(matchesFilters(inv, filters({ query: "   " })), true);
  });
});

describe("rangeStart and date filtering", () => {
  const now = new Date(2026, 7, 13); // 13 Aug 2026, local

  it("starts this month on the first of the month", () => {
    assert.deepEqual(rangeStart("month", now), new Date(2026, 7, 1));
  });

  it("spans three calendar months including the current one", () => {
    assert.deepEqual(rangeStart("3m", now), new Date(2026, 5, 1));
  });

  it("returns null for all time", () => {
    assert.equal(rangeStart("all", now), null);
  });

  it("keeps this month's invoices and drops last month's", () => {
    const thisMonth = invoice({ issuedDate: "2026-08-01" });
    const lastMonth = invoice({ issuedDate: "2026-07-31" });
    assert.equal(matchesFilters(thisMonth, filters({ range: "month" }), now), true);
    assert.equal(matchesFilters(lastMonth, filters({ range: "month" }), now), false);
  });

  it("bounds last year on both ends", () => {
    const lastYear = invoice({ issuedDate: "2025-06-01" });
    const thisYear = invoice({ issuedDate: "2026-01-01" });
    assert.equal(matchesFilters(lastYear, filters({ range: "last-year" }), now), true);
    assert.equal(matchesFilters(thisYear, filters({ range: "last-year" }), now), false);
  });
});

describe("groupInvoices", () => {
  const rows = [
    invoice({ invoiceNumber: "INV-0012", issuedDate: "2026-07-09", total: "10000.00" }),
    invoice({ invoiceNumber: "INV-0016", issuedDate: "2026-08-13", total: "55000.00" }),
    invoice({ invoiceNumber: "INV-0014", issuedDate: "2026-08-01", total: "6000.00" }),
  ];

  it("buckets a first-of-month invoice into that month, not the previous one", () => {
    // Guards the UTC-midnight parsing bug parseDateLike exists to prevent.
    const groups = groupInvoices([invoice({ issuedDate: "2026-08-01" })], filters());
    assert.equal(groups[0].label, "August 2026");
  });

  it("orders month groups newest first and sums their totals", () => {
    const groups = groupInvoices(rows, filters());
    assert.deepEqual(groups.map((g) => g.label), ["August 2026", "July 2026"]);
    assert.equal(groups[0].total, 61000);
    assert.equal(groups[1].total, 10000);
  });

  it("reverses group and row order when sorted oldest first", () => {
    const groups = groupInvoices(rows, filters({ sort: "asc" }));
    assert.deepEqual(groups.map((g) => g.label), ["July 2026", "August 2026"]);
    assert.deepEqual(groups[1].invoices.map((i) => i.invoiceNumber), ["INV-0014", "INV-0016"]);
  });

  it("labels quarters and years", () => {
    assert.equal(groupInvoices(rows, filters({ group: "quarter" }))[0].label, "Q3 2026");
    assert.deepEqual(groupInvoices(rows, filters({ group: "year" })).map((g) => g.label), ["2026"]);
  });

  it("groups clients alphabetically", () => {
    const groups = groupInvoices(
      [invoice({ client: "Tyler Henry" }), invoice({ client: "Boom Records" })],
      filters({ group: "client" })
    );
    assert.deepEqual(groups.map((g) => g.label), ["Boom Records", "Tyler Henry"]);
  });

  it("returns one unlabelled group when grouping is off", () => {
    const groups = groupInvoices(rows, filters({ group: "none" }));
    assert.equal(groups.length, 1);
    assert.equal(groups[0].label, "");
    assert.deepEqual(groups[0].invoices.map((i) => i.invoiceNumber), ["INV-0016", "INV-0014", "INV-0012"]);
  });

  it("returns no groups for an empty list", () => {
    assert.deepEqual(groupInvoices([], filters()), []);
    assert.deepEqual(groupInvoices([], filters({ group: "none" })), []);
  });
});

describe("statusCounts and helpers", () => {
  it("counts each status plus the open/closed split", () => {
    const counts = statusCounts([
      invoice({ status: "draft" }),
      invoice({ status: "paid" }),
      invoice({ status: "paid" }),
    ]);
    assert.equal(counts.all, 3);
    assert.equal(counts.open, 1);
    assert.equal(counts.closed, 2);
    assert.equal(counts.paid, 2);
    assert.equal(counts.overdue, 0);
  });

  it("sums string totals as numbers", () => {
    assert.equal(sumTotals([invoice({ total: "10.50" }), invoice({ total: "1000.00" })]), 1010.5);
  });

  it("reports active filters without counting grouping or sort", () => {
    assert.equal(hasActiveFilters(DEFAULT_FILTERS), false);
    assert.equal(hasActiveFilters(filters({ group: "none", sort: "asc" })), false);
    assert.equal(hasActiveFilters(filters({ status: "open" })), true);
    assert.equal(hasActiveFilters(filters({ query: "russ" })), true);
  });
});
