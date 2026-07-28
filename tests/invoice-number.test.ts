import { describe, it, expect } from "vitest";
import {
  parseInvoiceNumber,
  lowestAvailableNumber,
  formatInvoiceNumber,
  byInvoiceNumberDesc,
} from "@/lib/invoice-number";

describe("parseInvoiceNumber", () => {
  it("extracts the numeric part", () => {
    expect(parseInvoiceNumber("INV-0007")).toBe(7);
    expect(parseInvoiceNumber("DS-42")).toBe(42);
  });
  it("returns 0 when there is no number", () => {
    expect(parseInvoiceNumber("DRAFT")).toBe(0);
    expect(parseInvoiceNumber("")).toBe(0);
  });
});

describe("lowestAvailableNumber", () => {
  it("starts at 1 for an empty set", () => {
    expect(lowestAvailableNumber([])).toBe(1);
  });
  it("returns the next number when the sequence is contiguous", () => {
    expect(lowestAvailableNumber(["INV-0001", "INV-0002", "INV-0003"])).toBe(4);
  });
  it("fills the lowest gap left by a deletion", () => {
    expect(lowestAvailableNumber(["INV-0001", "INV-0003"])).toBe(2);
  });
  it("ignores duplicates and unparseable entries", () => {
    expect(lowestAvailableNumber(["INV-0001", "INV-0001", "DRAFT"])).toBe(2);
  });
  it("handles an out-of-order set", () => {
    expect(lowestAvailableNumber(["INV-0005", "INV-0002", "INV-0001"])).toBe(3);
  });
});

describe("formatInvoiceNumber", () => {
  it("zero-pads to four digits with the prefix", () => {
    expect(formatInvoiceNumber("INV-", 7)).toBe("INV-0007");
    expect(formatInvoiceNumber("INV-", 1234)).toBe("INV-1234");
  });
  it("does not truncate numbers longer than four digits", () => {
    expect(formatInvoiceNumber("INV-", 12345)).toBe("INV-12345");
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
    expect(rows.map((r) => r.invoiceNumber)).toEqual(["INV-0010", "INV-0002", "INV-0001"]);
  });
});
