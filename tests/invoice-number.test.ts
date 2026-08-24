import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseInvoiceNumber,
  nextInvoiceNumberValue,
  formatInvoiceNumber,
  byInvoiceNumberDesc,
} from "../lib/invoice-number.ts";

describe("parseInvoiceNumber", () => {
  it("extracts the numeric part", () => {
    assert.equal(parseInvoiceNumber("INV-0007"), 7);
    assert.equal(parseInvoiceNumber("DS-42"), 42);
  });
  it("returns 0 when there is no number", () => {
    assert.equal(parseInvoiceNumber("DRAFT"), 0);
    assert.equal(parseInvoiceNumber(""), 0);
  });
});

describe("nextInvoiceNumberValue", () => {
  it("starts at 1 for a fresh workspace", () => {
    assert.equal(nextInvoiceNumberValue(1, []), 1);
  });
  it("hands out the counter value", () => {
    assert.equal(nextInvoiceNumberValue(21, ["INV-0020", "INV-0013"]), 21);
  });
  it("does NOT refill a gap left by a deletion", () => {
    // The whole point of the change: two invoices made back to back must come
    // out consecutive, even when earlier numbers are free.
    assert.equal(nextInvoiceNumberValue(5, ["INV-0001", "INV-0004"]), 5);
  });
  it("keeps moving forward after the highest invoice is deleted", () => {
    // Counter is 6, the invoice that held 5 is gone — 5 must not come back.
    assert.equal(nextInvoiceNumberValue(6, ["INV-0001", "INV-0002"]), 6);
  });
  it("advances past existing invoices when the counter lags them", () => {
    // Self-heal for imported or restored rows: never collide with a live number.
    assert.equal(nextInvoiceNumberValue(1, ["INV-0020", "INV-0013"]), 21);
  });
  it("ignores unparseable numbers", () => {
    assert.equal(nextInvoiceNumberValue(1, ["DRAFT", "INV-0002"]), 3);
  });
  it("never returns less than 1", () => {
    assert.equal(nextInvoiceNumberValue(0, []), 1);
  });
});

describe("formatInvoiceNumber", () => {
  it("zero-pads to four digits with the prefix", () => {
    assert.equal(formatInvoiceNumber("INV-", 7), "INV-0007");
    assert.equal(formatInvoiceNumber("INV-", 1234), "INV-1234");
  });
  it("does not truncate numbers longer than four digits", () => {
    assert.equal(formatInvoiceNumber("INV-", 12345), "INV-12345");
  });
});

describe("byInvoiceNumberDesc", () => {
  it("sorts invoice numbers descending", () => {
    const rows = [
      { invoiceNumber: "INV-0002" },
      { invoiceNumber: "INV-0010" },
      { invoiceNumber: "INV-0001" },
    ];
    rows.sort(byInvoiceNumberDesc);
    assert.deepEqual(rows.map((r) => r.invoiceNumber), ["INV-0010", "INV-0002", "INV-0001"]);
  });
});
