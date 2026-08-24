import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PAYMENT_TERMS,
  DEFAULT_PAYMENT_TERMS,
  termDays,
  dueDateFromTerms,
} from "@/lib/invoice-terms";

describe("termDays", () => {
  it("reads the day count out of a Net term", () => {
    assert.equal(termDays("Net 15"), 15);
    assert.equal(termDays("Net 30"), 30);
    assert.equal(termDays("Net 45"), 45);
    assert.equal(termDays("Net 60"), 60);
  });
  it("treats due-on-receipt as zero days", () => {
    assert.equal(termDays("Due on receipt"), 0);
    assert.equal(termDays("due on receipt"), 0);
  });
  it("tolerates spacing and case", () => {
    assert.equal(termDays("net30"), 30);
    assert.equal(termDays("  NET 30  "), 30);
  });
  it("returns null for no terms or something unrecognized", () => {
    assert.equal(termDays(""), null);
    assert.equal(termDays("   "), null);
    assert.equal(termDays("On delivery"), null);
  });
  it("covers every term offered in the picker", () => {
    for (const t of PAYMENT_TERMS) assert.notEqual(termDays(t), null, t);
    assert.ok(PAYMENT_TERMS.includes(DEFAULT_PAYMENT_TERMS));
  });
});

describe("dueDateFromTerms", () => {
  it("dates the invoice forward from its issue date", () => {
    assert.equal(dueDateFromTerms("2026-08-24", "Net 30"), "2026-09-23");
    assert.equal(dueDateFromTerms("2026-08-24", "Net 15"), "2026-09-08");
  });
  it("makes due-on-receipt due the day it is issued", () => {
    assert.equal(dueDateFromTerms("2026-08-24", "Due on receipt"), "2026-08-24");
  });
  it("rolls over month and year boundaries", () => {
    assert.equal(dueDateFromTerms("2026-12-15", "Net 30"), "2027-01-14");
    assert.equal(dueDateFromTerms("2026-01-31", "Net 30"), "2026-03-02");
  });
  it("handles a leap year", () => {
    assert.equal(dueDateFromTerms("2028-02-01", "Net 30"), "2028-03-02");
  });
  it("keeps the calendar day it was given", () => {
    // A UTC-parsed date would come back a day early west of UTC.
    assert.equal(dueDateFromTerms("2026-08-01", "Due on receipt"), "2026-08-01");
  });
  it("returns null when there is nothing to compute from", () => {
    assert.equal(dueDateFromTerms("2026-08-24", ""), null);
    assert.equal(dueDateFromTerms("", "Net 30"), null);
    assert.equal(dueDateFromTerms("2026-08-24", "whenever"), null);
    assert.equal(dueDateFromTerms("not-a-date", "Net 30"), null);
  });
});
