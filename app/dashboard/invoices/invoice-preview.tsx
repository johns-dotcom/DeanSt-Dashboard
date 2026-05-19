import { SignPlate } from "@/components/brand/sign-plate";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { DraftInvoice } from "./invoices-client";

const PAYABLE_TO = [
  "DEAN ST CO",
  "",
  "CONTACT: JOHN SKEAD",
  "EMAIL: john@deanst.co",
  "",
  "PAYMENT METHOD",
  "JP Morgan Chase",
  "31250 Palos Verdes Dr W",
  "Rancho Palos Verdes, CA, 90275",
  "",
  "Account: 953162333",
  "Routing: 322271627",
  "Zelle: (310) 755-8857",
  "",
  "Payable to Jesse Allen",
];

export function InvoicePreviewPanel({
  draft,
  number,
  workspaceName,
  paymentTerms,
}: {
  draft: DraftInvoice;
  number: string;
  workspaceName: string;
  paymentTerms: string;
}) {
  void workspaceName;
  const subtotal = draft.lineItems.reduce(
    (s, i) => s + Number(i.amount || Number(i.quantity || 0) * Number(i.rate || 0)),
    0
  );

  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid var(--hair)",
        borderRadius: 10,
        padding: "28px 32px 32px",
        color: "#1a1612",
        fontFamily: 'Arial, sans-serif',
        fontSize: 13,
        lineHeight: 1.4,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <SignPlate size={0.85} />
          <h1
            style={{
              fontFamily: 'Arial, sans-serif',
              fontSize: 36,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              marginTop: 14,
            }}
          >
            INVOICE
          </h1>
          <div className="mono" style={{ fontSize: 10.5, letterSpacing: "0.24em", color: "var(--ink-soft)", marginTop: 6 }}>
            NO.: {number.replace(/^[A-Z]+-?/, "")}
          </div>
          <div className="mono" style={{ fontSize: 10.5, letterSpacing: "0.24em", color: "var(--ink-soft)", marginTop: 2 }}>
            PURCHASE ORDER #: N/A
          </div>
        </div>
      </header>

      <div style={{ borderTop: "1px solid var(--hair)", margin: "20px 0" }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          <div className="mono" style={{ fontSize: 11, letterSpacing: "0.16em", fontWeight: 600 }}>
            Bill To:
          </div>
          <div style={{ marginTop: 8, whiteSpace: "pre-wrap", color: "var(--ink-soft)" }}>
            {draft.client || "Client Name"}
            {draft.address ? "\n" + draft.address : ""}
          </div>
        </div>
        <div>
          <div className="mono" style={{ fontSize: 11, letterSpacing: "0.16em", fontWeight: 600 }}>
            Funds payable to:
          </div>
          <div style={{ marginTop: 8 }}>
            {PAYABLE_TO.map((line, i) => (
              <div key={i} className="mono" style={{ fontSize: 11, letterSpacing: "0.08em" }}>
                {line || " "}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--hair)", margin: "22px 0" }} />

      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <span className="mono" style={{ fontSize: 11, letterSpacing: "0.16em", fontWeight: 600 }}>
          Due by:
        </span>
        <span className="mono" style={{ fontSize: 11, letterSpacing: "0.16em", color: "var(--ink-soft)" }}>
          {draft.dueDate ? formatDate(draft.dueDate).toUpperCase() : paymentTerms.toUpperCase()}
        </span>
      </div>

      <div style={{ marginTop: 22 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "10px 0",
            borderBottom: "1px solid var(--hair)",
            fontWeight: 600,
          }}
        >
          <span>Description</span>
          <span>Amount Due</span>
        </div>
        {draft.lineItems.map((it, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 0",
              borderBottom: "1px solid var(--hair)",
              color: "var(--ink-soft)",
            }}
          >
            <span>{it.description || "Description"}</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {formatCurrency(Number(it.amount || Number(it.quantity || 0) * Number(it.rate || 0))).replace("$", "")} $
            </span>
          </div>
        ))}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "14px 0",
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          <span>TOTAL DUE</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {formatCurrency(subtotal).replace("$", "")} $
          </span>
        </div>
      </div>

      <div style={{ marginTop: 20, fontSize: 12, color: "var(--ink-faint)" }}>
        {new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </div>
    </section>
  );
}
