"use client";

import { useMemo, useState, useTransition } from "react";
import { Eye, Pencil, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Eyebrow } from "@/components/brand/eyebrow";
import { PageFooter } from "@/components/brand/page-footer";
import { InvoiceFormPanel } from "./invoice-form";
import { InvoicePreviewPanel } from "./invoice-preview";
import { deleteInvoice } from "./actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice, LineItem } from "@/lib/db/schema";

export interface DraftInvoice {
  client: string;
  address: string;
  description: string;
  lineItems: LineItem[];
  dueDate: string;
  status: Invoice["status"];
  type: Invoice["type"];
}

const emptyDraft: DraftInvoice = {
  client: "",
  address: "",
  description: "",
  lineItems: [{ description: "", quantity: 1, rate: 0, amount: 0 }],
  dueDate: "",
  status: "draft",
  type: "invoice",
};

function toDraft(inv: Invoice): DraftInvoice {
  return {
    client: inv.client,
    address: "",
    description: inv.description ?? "",
    lineItems: inv.lineItems?.length ? inv.lineItems : [{ description: "", quantity: 1, rate: 0, amount: 0 }],
    dueDate: inv.dueDate ?? "",
    status: inv.status,
    type: inv.type,
  };
}

export function InvoicesClient({
  invoices,
  workspaceName,
  paymentTerms,
  nextInvoiceNumber,
}: {
  invoices: Invoice[];
  workspaceName: string;
  paymentTerms: string;
  nextInvoiceNumber: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftInvoice>(emptyDraft);
  const [, startTransition] = useTransition();

  const editing = useMemo(
    () => (editingId ? invoices.find((i) => i.id === editingId) ?? null : null),
    [editingId, invoices]
  );

  function startNew() {
    setEditingId(null);
    setDraft(emptyDraft);
  }

  function startEdit(inv: Invoice) {
    setEditingId(inv.id);
    setDraft(toDraft(inv));
  }

  function handleDelete(inv: Invoice) {
    if (!confirm(`Delete invoice ${inv.invoiceNumber}?`)) return;
    startTransition(async () => {
      const r = await deleteInvoice(inv.id);
      void r;
      toast.success("Invoice deleted");
      if (editingId === inv.id) startNew();
    });
  }

  const displayNumber = editing?.invoiceNumber ?? nextInvoiceNumber;

  return (
    <div style={{ padding: "32px 48px 60px", display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Eyebrow size={10} spacing={0.36}>№ 02 · Ledger</Eyebrow>
        <Eyebrow size={10} spacing={0.32}>{editing ? `Editing ${editing.invoiceNumber}` : "Drafting new invoice"}</Eyebrow>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(360px, 1fr) minmax(0, 1.45fr)", gap: 22 }}>
        <InvoiceFormPanel
          draft={draft}
          setDraft={setDraft}
          editingInvoice={editing}
          displayNumber={displayNumber}
          onSaved={() => { setEditingId(null); setDraft(emptyDraft); }}
          onCancel={startNew}
        />
        <InvoicePreviewPanel
          draft={draft}
          number={displayNumber}
          workspaceName={workspaceName}
          paymentTerms={paymentTerms}
        />
      </div>

      <section
        style={{
          background: "var(--paper)",
          border: "1px solid var(--hair)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "18px 26px",
            borderBottom: "1px solid var(--hair)",
          }}
        >
          <div>
            <Eyebrow size={10}>Saved invoices</Eyebrow>
            <div
              style={{
                fontFamily: 'Arial, sans-serif',
                fontSize: 19,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                marginTop: 4,
              }}
            >
              {invoices.length} on file
            </div>
          </div>
        </header>

        {invoices.length === 0 ? (
          <div style={{ padding: "60px 26px", textAlign: "center" }}>
            <div className="serif" style={{ fontSize: 24, color: "var(--ink)", fontStyle: "italic" }}>
              The ledger is empty.
            </div>
            <div style={{ fontSize: 14, color: "var(--ink-soft)", marginTop: 6 }}>
              Fill in the form above to create your first invoice.
            </div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: 'Arial, sans-serif' }}>
            <thead>
              <tr style={{ background: "var(--cream-light)" }}>
                <Th width={90}>Invoice #</Th>
                <Th>Bill to</Th>
                <Th>Description</Th>
                <Th align="right" width={140}>Amount</Th>
                <Th width={110}>Date</Th>
                <Th width={92}>Status</Th>
                <Th align="right" width={140}>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  style={{ borderTop: "1px solid var(--hair)", cursor: "pointer" }}
                  onClick={() => startEdit(inv)}
                >
                  <Td>
                    <span style={{ fontFamily: 'Arial, sans-serif', fontSize: 12.5 }}>
                      #{inv.invoiceNumber.replace(/^[A-Z]+-?/, "")}
                    </span>
                  </Td>
                  <Td>{inv.client}</Td>
                  <Td>
                    <span style={{ color: "var(--ink-soft)" }}>{inv.description ?? ""}</span>
                  </Td>
                  <Td align="right">
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>
                      {formatCurrency(Number(inv.total))}
                    </span>
                  </Td>
                  <Td>
                    <span style={{ color: "var(--ink-soft)", fontSize: 13.5 }}>
                      {formatDate(inv.issuedDate, { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </Td>
                  <Td>
                    <StatusPill status={inv.status} />
                  </Td>
                  <Td align="right">
                    <div style={{ display: "inline-flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                      <RowIcon onClick={() => startEdit(inv)} aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></RowIcon>
                      <a
                        href={`/api/invoices/${inv.id}/pdf?inline=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={rowIconStyle}
                        aria-label="View"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </a>
                      <a
                        href={`/api/invoices/${inv.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={rowIconStyle}
                        aria-label="Download"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      <RowIcon onClick={() => handleDelete(inv)} aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></RowIcon>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <PageFooter />
    </div>
  );
}

const rowIconStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--ink-soft)",
  background: "transparent",
  border: "1px solid var(--hair)",
  cursor: "pointer",
};

function RowIcon({
  children,
  onClick,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  return (
    <button {...rest} onClick={onClick} style={rowIconStyle}>
      {children}
    </button>
  );
}

function Th({
  children,
  align = "left",
  width,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  width?: number;
}) {
  return (
    <th
      className="mono"
      style={{
        textAlign: align,
        padding: "14px 18px",
        fontSize: 10,
        letterSpacing: "0.24em",
        color: "var(--ink-faint)",
        fontWeight: 400,
        width,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td
      style={{
        padding: "16px 18px",
        textAlign: align,
        fontSize: 14,
        color: "var(--ink)",
        verticalAlign: "middle",
      }}
    >
      {children}
    </td>
  );
}

function StatusPill({ status }: { status: Invoice["status"] }) {
  const tones: Record<Invoice["status"], { bg: string; fg: string; label: string }> = {
    draft: { bg: "rgba(26,22,18,0.06)", fg: "var(--ink-soft)", label: "Draft" },
    pending: { bg: "rgba(201,100,66,0.14)", fg: "#a01e1e", label: "Unpaid" },
    overdue: { bg: "rgba(160,30,30,0.14)", fg: "#a01e1e", label: "Overdue" },
    paid: { bg: "rgba(10,58,28,0.12)", fg: "var(--sign-green)", label: "Paid" },
  };
  const t = tones[status];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 500,
        background: t.bg,
        color: t.fg,
      }}
    >
      {t.label}
    </span>
  );
}
