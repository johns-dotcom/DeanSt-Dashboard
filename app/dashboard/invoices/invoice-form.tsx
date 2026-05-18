"use client";

import { useTransition } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Eyebrow } from "@/components/brand/eyebrow";
import { createInvoice, updateInvoice } from "./actions";
import type { Invoice, LineItem } from "@/lib/db/schema";
import type { DraftInvoice } from "./invoices-client";

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: "var(--ink-soft)",
  display: "block",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--cream-light)",
  border: "1px solid var(--hair)",
  borderRadius: 8,
  fontSize: 14,
  color: "var(--ink)",
  fontFamily: "inherit",
  outline: "none",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: 64,
  lineHeight: 1.4,
};

export function InvoiceFormPanel({
  draft,
  setDraft,
  editingInvoice,
  displayNumber,
  onSaved,
  onCancel,
}: {
  draft: DraftInvoice;
  setDraft: React.Dispatch<React.SetStateAction<DraftInvoice>>;
  editingInvoice: Invoice | null;
  displayNumber: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function updateLineItem(idx: number, patch: Partial<LineItem>) {
    setDraft((p) => ({
      ...p,
      lineItems: p.lineItems.map((it, i) => {
        if (i !== idx) return it;
        const next = { ...it, ...patch };
        next.amount = Number((Number(next.quantity || 0) * Number(next.rate || 0)).toFixed(2));
        return next;
      }),
    }));
  }

  function addLineItem() {
    setDraft((p) => ({ ...p, lineItems: [...p.lineItems, { description: "", quantity: 1, rate: 0, amount: 0 }] }));
  }

  function removeLineItem(idx: number) {
    setDraft((p) => ({
      ...p,
      lineItems: p.lineItems.length === 1 ? p.lineItems : p.lineItems.filter((_, i) => i !== idx),
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.client.trim()) { toast.error("Bill To is required"); return; }
    if (draft.lineItems.some((it) => !it.description.trim())) {
      toast.error("Each line item needs a description");
      return;
    }
    startTransition(async () => {
      const composedDescription = draft.address.trim()
        ? `${draft.address.trim()}${draft.description.trim() ? "\n\n" + draft.description.trim() : ""}`
        : draft.description.trim();
      const payload = {
        client: draft.client.trim(),
        type: draft.type,
        description: composedDescription || null,
        line_items: draft.lineItems,
        tax_rate: 0,
        issued_date: new Date().toISOString().slice(0, 10),
        due_date: draft.dueDate || null,
        status: draft.status,
      };
      const result = editingInvoice
        ? await updateInvoice(editingInvoice.id, payload)
        : await createInvoice(payload);
      if ("error" in result && result.error) { toast.error(result.error); return; }
      toast.success(editingInvoice ? "Invoice updated" : `Invoice ${displayNumber} created`);
      onSaved();
    });
  }

  return (
    <section
      style={{
        background: "var(--paper)",
        border: "1px solid var(--hair)",
        borderRadius: 10,
        padding: "26px 26px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3
            style={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: 19,
              fontWeight: 600,
              letterSpacing: "-0.01em",
            }}
          >
            {editingInvoice ? "Edit invoice" : "New invoice"}
          </h3>
          {editingInvoice ? (
            <button
              onClick={onCancel}
              type="button"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--ink-soft)",
                fontSize: 12,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <X className="h-3.5 w-3.5" /> Discard
            </button>
          ) : null}
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>
          {editingInvoice ? `Editing ${editingInvoice.invoiceNumber}` : `Invoice ${displayNumber} will be created`}
        </div>
      </div>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle}>Bill To</label>
          <textarea
            placeholder="Company name&#10;Contact name"
            value={draft.client}
            onChange={(e) => setDraft((p) => ({ ...p, client: e.target.value }))}
            rows={2}
            style={textareaStyle}
            required
          />
        </div>

        <div>
          <label style={labelStyle}>Address</label>
          <textarea
            placeholder="Street address, city, state, zip"
            value={draft.address}
            onChange={(e) => setDraft((p) => ({ ...p, address: e.target.value }))}
            rows={2}
            style={textareaStyle}
          />
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Line items</label>
            <button
              type="button"
              onClick={addLineItem}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--sign-green)",
                fontSize: 12,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Plus className="h-3 w-3" /> Add item
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {draft.lineItems.map((it, idx) => (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 110px 28px", gap: 8 }}>
                <input
                  placeholder="Description"
                  value={it.description}
                  onChange={(e) => updateLineItem(idx, { description: e.target.value })}
                  style={inputStyle}
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={it.amount || ""}
                  onChange={(e) => {
                    const v = Number(e.target.value || 0);
                    updateLineItem(idx, { quantity: 1, rate: v, amount: v });
                  }}
                  style={{ ...inputStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" }}
                />
                <button
                  type="button"
                  onClick={() => removeLineItem(idx)}
                  disabled={draft.lineItems.length === 1}
                  style={{
                    width: 28,
                    height: 38,
                    background: "transparent",
                    border: "none",
                    color: "var(--ink-faint)",
                    cursor: draft.lineItems.length === 1 ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <Eyebrow size={9}>Due</Eyebrow>
            <input
              type="date"
              value={draft.dueDate}
              onChange={(e) => setDraft((p) => ({ ...p, dueDate: e.target.value }))}
              style={{ ...inputStyle, marginTop: 4 }}
            />
          </div>
          <div>
            <Eyebrow size={9}>Status</Eyebrow>
            <select
              value={draft.status}
              onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value as Invoice["status"] }))}
              style={{ ...inputStyle, marginTop: 4 }}
            >
              <option value="draft">Draft</option>
              <option value="pending">Unpaid</option>
              <option value="overdue">Overdue</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          style={{
            marginTop: 4,
            padding: "12px 16px",
            background: "var(--ink)",
            color: "var(--cream)",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: "0.02em",
            cursor: pending ? "not-allowed" : "pointer",
            opacity: pending ? 0.6 : 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Plus className="h-4 w-4" />
          {pending ? "Saving…" : editingInvoice ? "Save changes" : "Create invoice"}
        </button>
      </form>
    </section>
  );
}
