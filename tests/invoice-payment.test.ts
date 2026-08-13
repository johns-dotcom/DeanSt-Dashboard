import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { payableToLines, paymentInfoFromWorkspace } from "../lib/invoice-payment.ts";
import type { Workspace } from "@/lib/db/schema";

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    invoiceEntityName: "DEAN ST CO",
    invoiceContactName: "John Skead",
    invoiceContactEmail: "john@deanst.co",
    invoiceBankName: "JP Morgan Chase",
    invoiceBankAddress: "31250 Palos Verdes Dr W\nRancho Palos Verdes, CA, 90275",
    invoiceAccountNumber: "953162333",
    invoiceRoutingNumber: "322271627",
    invoicePayeeName: "Jacob Allen",
    ...overrides,
  } as Workspace;
}

describe("paymentInfoFromWorkspace", () => {
  it("maps workspace columns to the payment info shape", () => {
    const p = paymentInfoFromWorkspace(workspace());
    assert.equal(p.entityName, "DEAN ST CO");
    assert.equal(p.payeeName, "Jacob Allen");
    assert.equal(p.accountNumber, "953162333");
    assert.equal(p.routingNumber, "322271627");
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

  it("does not print the entity name", () => {
    assert.ok(!lines.some((l) => l.includes("DEAN ST CO")));
  });

  it("ends with the account and routing numbers", () => {
    assert.deepEqual(lines.slice(-2), ["Account: 953162333", "Routing: 322271627"]);
  });
});
