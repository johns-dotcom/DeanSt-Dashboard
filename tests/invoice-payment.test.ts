import { describe, it, expect } from "vitest";
import { paymentInfoFromWorkspace } from "@/lib/invoice-payment";
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
    expect(p.entityName).toBe("DEAN ST CO");
    expect(p.payeeName).toBe("Jacob Allen");
    expect(p.accountNumber).toBe("953162333");
    expect(p.routingNumber).toBe("322271627");
  });

  it("splits the bank address into non-empty trimmed lines", () => {
    const p = paymentInfoFromWorkspace(workspace());
    expect(p.bankAddressLines).toEqual([
      "31250 Palos Verdes Dr W",
      "Rancho Palos Verdes, CA, 90275",
    ]);
  });

  it("drops blank address lines", () => {
    const p = paymentInfoFromWorkspace(workspace({ invoiceBankAddress: "Line 1\n\n  \nLine 2" }));
    expect(p.bankAddressLines).toEqual(["Line 1", "Line 2"]);
  });
});
