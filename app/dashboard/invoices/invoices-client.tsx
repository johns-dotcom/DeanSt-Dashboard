"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Eye, Pencil, Download, Trash2, Paperclip, Banknote, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Eyebrow } from "@/components/brand/eyebrow";
import { PageFooter } from "@/components/brand/page-footer";
import { InvoiceFormPanel } from "./invoice-form";
import { InvoicePreviewPanel } from "./invoice-preview";
import { ClientTabs } from "./client-tabs";
import { ReceiptsPanel } from "./receipts-panel";
import { deleteInvoice, setInvoiceStatus, setInvoiceSent, setInvoiceType } from "./actions";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Check } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice, InvoiceClientPage, LineItem } from "@/lib/db/schema";

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
  clientPages,
  activeClientSlug,
  activeClientName,
  receiptCounts = {},
}: {
  invoices: Invoice[];
  workspaceName: string;
  paymentTerms: string;
  nextInvoiceNumber: string;
  clientPages: InvoiceClientPage[];
  activeClientSlug: string | null;
  activeClientName?: string;
  receiptCounts?: Record<string, number>;
}) {
  const initialDraft = useMemo<DraftInvoice>(
    () => ({ ...emptyDraft, client: activeClientName ?? "" }),
    [activeClientName]
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftInvoice>(initialDraft);
  const [receiptsFor, setReceiptsFor] = useState<Invoice | null>(null);
  const [, startTransition] = useTransition();

  // Reset draft when navigating between client tabs
  useEffect(() => {
    setEditingId(null);
    setDraft(initialDraft);
  }, [activeClientSlug, initialDraft]);

  const editing = useMemo(
    () => (editingId ? invoices.find((i) => i.id === editingId) ?? null : null),
    [editingId, invoices]
  );

  function startNew() {
    setEditingId(null);
    setDraft(initialDraft);
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
    <div style={{ padding: "32px 48px 60px", display: "flex", flexDirection: "column", gap: 22 }}>
      <ClientTabs pages={clientPages} activeSlug={activeClientSlug} />
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
          onSaved={() => { setEditingId(null); setDraft(initialDraft); }}
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
                <Th width={120}>Invoice #</Th>
                <Th>Bill to</Th>
                <Th>Description</Th>
                <Th align="right" width={140}>Amount</Th>
                <Th width={110}>Date</Th>
                <Th width={92}>Status</Th>
                <Th width={108}>Sent</Th>
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
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <span onClick={(e) => e.stopPropagation()} style={{ display: "inline-flex" }}>
                        <TypeMarker type={inv.type} invoiceId={inv.id} invoiceNumber={inv.invoiceNumber} />
                      </span>
                      <span style={{ fontFamily: 'Arial, sans-serif', fontSize: 12.5 }}>
                        #{inv.invoiceNumber.replace(/^[A-Z]+-?/, "")}
                      </span>
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
                    <div onClick={(e) => e.stopPropagation()} style={{ display: "inline-block" }}>
                      <StatusMenu status={inv.status} invoiceId={inv.id} invoiceNumber={inv.invoiceNumber} />
                    </div>
                  </Td>
                  <Td>
                    <div onClick={(e) => e.stopPropagation()} style={{ display: "inline-block" }}>
                      <SentMenu sent={inv.sent} invoiceId={inv.id} invoiceNumber={inv.invoiceNumber} />
                    </div>
                  </Td>
                  <Td align="right">
                    <div style={{ display: "inline-flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                      {inv.type === "reimbursement" ? (
                        <ReceiptsButton
                          count={receiptCounts[inv.id] ?? 0}
                          onClick={() => setReceiptsFor(inv)}
                        />
                      ) : null}
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

      <ReceiptsPanel
        invoice={receiptsFor}
        open={Boolean(receiptsFor)}
        onOpenChange={(v) => { if (!v) setReceiptsFor(null); }}
      />

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

function ReceiptsButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={`Receipts (${count})`}
      title={count ? `${count} receipt${count === 1 ? "" : "s"}` : "Add receipts"}
      style={{
        ...rowIconStyle,
        background: count > 0 ? "rgba(29,60,142,0.10)" : rowIconStyle.background,
        color: count > 0 ? "var(--sign-green)" : (rowIconStyle.color as string),
        borderColor: count > 0 ? "rgba(29,60,142,0.25)" : "var(--hair)",
        width: "auto",
        paddingLeft: 8,
        paddingRight: count > 0 ? 8 : 10,
        gap: 4,
      }}
    >
      <Paperclip className="h-3.5 w-3.5" />
      {count > 0 ? <span style={{ fontSize: 11, fontWeight: 600 }}>{count}</span> : null}
    </button>
  );
}

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

// Marks each invoice as income vs a recoupment (a reimbursement of receipted
// costs). Click to toggle — mirrors the inline-editable Status / Sent cells.
const TYPE_META = {
  invoice: {
    Icon: Banknote,
    label: "Income",
    fg: "var(--sign-green)",
    bg: "rgba(29,60,142,0.10)",
    border: "rgba(29,60,142,0.22)",
  },
  reimbursement: {
    Icon: Receipt,
    label: "Recoupment",
    fg: "#a85b2a",
    bg: "rgba(201,100,66,0.12)",
    border: "rgba(201,100,66,0.30)",
  },
} as const;

function TypeMarker({
  type,
  invoiceId,
  invoiceNumber,
}: {
  type: Invoice["type"];
  invoiceId: string;
  invoiceNumber: string;
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<Invoice["type"]>(type);

  useEffect(() => { setOptimistic(type); }, [type]);

  function toggle() {
    const next: Invoice["type"] = optimistic === "reimbursement" ? "invoice" : "reimbursement";
    setOptimistic(next);
    startTransition(async () => {
      const r = await setInvoiceType(invoiceId, next);
      if ("error" in r && r.error) {
        setOptimistic(type);
        toast.error(r.error);
      } else {
        toast.success(`${invoiceNumber} → ${TYPE_META[next].label}`);
      }
    });
  }

  const m = TYPE_META[optimistic];
  const Icon = m.Icon;
  const other = optimistic === "reimbursement" ? "Income" : "Recoupment";
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      title={`${m.label} — click to mark as ${other}`}
      aria-label={`Type: ${m.label}. Click to mark as ${other}.`}
      style={{
        width: 26,
        height: 26,
        borderRadius: 6,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: m.bg,
        color: m.fg,
        border: `1px solid ${m.border}`,
        cursor: pending ? "wait" : "pointer",
        opacity: pending ? 0.6 : 1,
        flex: "none",
      }}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

const SENT_TONES = {
  true: { bg: "rgba(29,60,142,0.12)", fg: "var(--sign-green)", label: "Sent" },
  false: { bg: "rgba(26,22,18,0.06)", fg: "var(--ink-soft)", label: "Not sent" },
} as const;

function SentMenu({
  sent,
  invoiceId,
  invoiceNumber,
}: {
  sent: boolean;
  invoiceId: string;
  invoiceNumber: string;
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<boolean>(sent);

  useEffect(() => { setOptimistic(sent); }, [sent]);

  function pick(next: boolean) {
    if (next === optimistic) return;
    setOptimistic(next);
    startTransition(async () => {
      const r = await setInvoiceSent(invoiceId, next);
      if ("error" in r && r.error) {
        setOptimistic(sent);
        toast.error(r.error);
      } else {
        toast.success(`${invoiceNumber} → ${next ? "Sent" : "Not sent"}`);
      }
    });
  }

  const t = SENT_TONES[optimistic ? "true" : "false"];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={pending}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 10px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            background: t.bg,
            color: t.fg,
            border: "none",
            cursor: pending ? "wait" : "pointer",
            opacity: pending ? 0.7 : 1,
          }}
        >
          {t.label}
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2.5 4 5 6.5 7.5 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4} style={{ minWidth: 140 }}>
        {[true, false].map((s) => {
          const tone = SENT_TONES[s ? "true" : "false"];
          const active = s === optimistic;
          return (
            <DropdownMenuItem key={String(s)} onSelect={() => pick(s)}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flex: 1 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: tone.fg,
                    flex: "none",
                  }}
                />
                <span style={{ fontSize: 13 }}>{tone.label}</span>
              </span>
              {active ? <Check className="h-3.5 w-3.5" style={{ color: "var(--ink-soft)" }} /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const STATUS_TONES: Record<Invoice["status"], { bg: string; fg: string; label: string }> = {
  draft: { bg: "rgba(26,22,18,0.06)", fg: "var(--ink-soft)", label: "Draft" },
  pending: { bg: "rgba(201,100,66,0.14)", fg: "#a01e1e", label: "Unpaid" },
  overdue: { bg: "rgba(160,30,30,0.14)", fg: "#a01e1e", label: "Overdue" },
  paid: { bg: "rgba(29,60,142,0.12)", fg: "var(--sign-green)", label: "Paid" },
};

const STATUS_ORDER: Invoice["status"][] = ["draft", "pending", "overdue", "paid"];

function StatusMenu({
  status,
  invoiceId,
  invoiceNumber,
}: {
  status: Invoice["status"];
  invoiceId: string;
  invoiceNumber: string;
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<Invoice["status"]>(status);

  // Keep the local optimistic value synced when the server data changes
  useEffect(() => { setOptimistic(status); }, [status]);

  function pick(next: Invoice["status"]) {
    if (next === optimistic) return;
    setOptimistic(next);
    startTransition(async () => {
      const r = await setInvoiceStatus(invoiceId, next);
      if ("error" in r && r.error) {
        setOptimistic(status);
        toast.error(r.error);
      } else {
        toast.success(`${invoiceNumber} → ${STATUS_TONES[next].label}`);
      }
    });
  }

  const t = STATUS_TONES[optimistic];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={pending}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 10px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            background: t.bg,
            color: t.fg,
            border: "none",
            cursor: pending ? "wait" : "pointer",
            opacity: pending ? 0.7 : 1,
          }}
        >
          {t.label}
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2.5 4 5 6.5 7.5 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4} style={{ minWidth: 140 }}>
        {STATUS_ORDER.map((s) => {
          const tone = STATUS_TONES[s];
          const active = s === optimistic;
          return (
            <DropdownMenuItem key={s} onSelect={() => pick(s)}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flex: 1 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: tone.fg,
                    flex: "none",
                  }}
                />
                <span style={{ fontSize: 13 }}>{tone.label}</span>
              </span>
              {active ? <Check className="h-3.5 w-3.5" style={{ color: "var(--ink-soft)" }} /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
