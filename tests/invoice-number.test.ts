import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseInvoiceNumber,
  lowestAvailableNumber,
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

describe("lowestAvailableNumber", () => {
  it("starts at 1 for an empty set", () => {
    assert.equal(lowestAvailableNumber([]), 1);
  });
  it("returns the next number when the sequence is contiguous", () => {
    assert.equal(lowestAvailableNumber(["INV-0001", "INV-0002", "INV-0003"]), 4);
  });
  it("fills the lowest gap left by a deletion", () => {
    assert.equal(lowestAvailableNumber(["INV-0001", "INV-0003"]), 2);
  });
  it("ignores duplicates and unparseable entries", () => {
    assert.equal(lowestAvailableNumber(["INV-0001", "INV-0001", "DRAFT"]), 2);
  });
  it("handles an out-of-order set", () => {
    assert.equal(lowestAvailableNumber(["INV-0005", "INV-0002", "INV-0001"]), 3);
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
