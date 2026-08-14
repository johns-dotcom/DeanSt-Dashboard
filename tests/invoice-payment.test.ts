import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { payableToLines, paymentInfoFromWorkspace } from "../lib/invoice-payment.ts";
import type { Workspace } from "@/lib/db/schema";

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    invoiceEntityName: "Dean Street Media Inc.",
    invoiceEntityAddress: "825 S Le Doux Rd\nLos Angeles, CA, 90035",
    invoiceContactName: "John Skead",
    invoiceContactEmail: "john@deanst.co",
    invoiceBankName: "JP Morgan Chase",
    invoiceBankAddress: "31250 Palos Verdes Dr W\nRancho Palos Verdes, CA, 90275",
    invoiceAccountNumber: "953162333",
    invoiceRoutingNumber: "322271627",
    invoiceWireRoutingNumber: "021000021",
    invoicePayeeName: "Jacob Allen",
    ...overrides,
  } as Workspace;
}

describe("paymentInfoFromWorkspace", () => {
  it("maps workspace columns to the payment info shape", () => {
    const p = paymentInfoFromWorkspace(workspace());
    assert.equal(p.entityName, "Dean Street Media Inc.");
    assert.deepEqual(p.entityAddressLines, ["825 S Le Doux Rd", "Los Angeles, CA, 90035"]);
    assert.equal(p.payeeName, "Jacob Allen");
    assert.equal(p.accountNumber, "953162333");
    assert.equal(p.routingNumber, "322271627");
    assert.equal(p.wireRoutingNumber, "021000021");
  });

  it("splits the bank address into non-empty trimmed lines", () => {
    const p = paymentInfoFromWorkspace(workspace());
    assert.deepEqual(p.bankAddressLines, [
      "31250 Palos Verdes Dr W",
      "Rancho Palos Verdes, CA, 90275",
    ]);
  });

  it("drops blank address lines", () => {
    const p = paymentInfoFromWorkspace(workspace({ invoiceBankAddress: "Line 1\n\n  \nLine 2" }));
    assert.deepEqual(p.bankAddressLines, ["Line 1", "Line 2"]);
  });
});

describe("payableToLines", () => {
  const lines = payableToLines(paymentInfoFromWorkspace(workspace()));

  it("leads with the payee and never repeats it", () => {
    assert.equal(lines[0], "Payable to Jacob Allen");
    assert.equal(lines.filter((l) => l.startsWith("Payable to")).length, 1);
  });

  it("prints the entity and its address directly under the payee, before the spacer", () => {
    assert.deepEqual(lines.slice(0, 5), [
      "Payable to Jacob Allen",
      "Dean Street Media Inc.",
      "825 S Le Doux Rd",
      "Los Angeles, CA, 90035",
      "",
    ]);
  });

  it("ends with the account and both routing numbers, each labelled", () => {
    assert.deepEqual(lines.slice(-3), [
      "Account: 953162333",
      "ACH Routing: 322271627",
      "Wire Routing: 021000021",
    ]);
  });
});
