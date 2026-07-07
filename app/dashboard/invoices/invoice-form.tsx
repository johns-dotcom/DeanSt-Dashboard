"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, X, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { Eyebrow } from "@/components/brand/eyebrow";
import { Toggle } from "@/components/brand/toggle";
import { Checkbox } from "@/components/ui/checkbox";
import { ReceiptsManager } from "./receipts-manager";
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
  // Receipts staged for a brand-new reimbursement. They're held locally and
  // only uploaded once the invoice is created — so adding receipts never
  // forces the invoice to save, and several can be staged first.
  const [staged, setStaged] = useState<File[]>([]);

  // Clear staged files whenever we switch which invoice the form is on
  // (new → edit, edit → other, edit → new).
  useEffect(() => { setStaged([]); }, [editingInvoice?.id]);

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

      // Now that the invoice exists, attach any staged receipts to it.
      const stagedCount = staged.length;
      const newInvoiceId =
        !editingInvoice && "id" in result && typeof result.id === "string" ? result.id : null;
      if (newInvoiceId && stagedCount > 0) {
        const failures: string[] = [];
        for (const file of staged) {
          try {
            const form = new FormData();
            form.append("file", file);
            form.append("invoiceId", newInvoiceId);
            const res = await fetch("/api/upload/receipt", { method: "POST", body: form });
            if (!res.ok) {
              const body = await res.json().catch(() => ({ error: `Upload failed (${res.status})` }));
              throw new Error(body.error ?? `Upload failed (${res.status})`);
            }
          } catch (err) {
            failures.push(`${file.name}: ${err instanceof Error ? err.message : "failed"}`);
          }
        }
        if (failures.length) toast.error(`Invoice created, but some receipts didn't upload:\n${failures.join("\n")}`);
      }

      setStaged([]);
      toast.success(
        editingInvoice
          ? "Invoice updated"
          : `Invoice ${displayNumber} created${stagedCount ? ` · ${stagedCount} receipt${stagedCount === 1 ? "" : "s"}` : ""}`
      );
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
              fontFamily: 'Arial, sans-serif',
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

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 14px",
          background: "var(--cream-light)",
          border: "1px solid var(--hair)",
          borderRadius: 8,
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>Reimbursement</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2 }}>
            Attach receipts and track expenses paid out of pocket.
          </div>
        </div>
        <Toggle
          checked={draft.type === "reimbursement"}
          onCheckedChange={(v) => setDraft((p) => ({ ...p, type: v ? "reimbursement" : "invoice" }))}
          ariaLabel="Toggle reimbursement"
        />
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
          <div style={{ display: "flex", flexDirection: "column", gap: draft.type === "reimbursement" ? 12 : 10 }}>
            {draft.lineItems.map((it, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  // For reimbursements, box each line item so its receipt
                  // checkbox is clearly tied to this item, not the next.
                  ...(draft.type === "reimbursement"
                    ? { border: "1px solid var(--hair)", borderRadius: 10, padding: 12 }
                    : {}),
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 28px", gap: 8 }}>
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
                <input
                  placeholder="Add a longer description (optional)"
                  value={it.notes ?? ""}
                  onChange={(e) => updateLineItem(idx, { notes: e.target.value })}
                  style={{
                    ...inputStyle,
                    width: "calc(100% - 36px)",
                    padding: "7px 10px",
                    fontSize: 12.5,
                    color: "var(--ink-soft)",
                    background: "transparent",
                    borderStyle: "dashed",
                  }}
                />
                {draft.type === "reimbursement" ? (
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      fontSize: 12,
                      color: it.receiptUploaded ? "var(--sign-green)" : "var(--ink-soft)",
                      cursor: "pointer",
                      marginTop: 8,
                      paddingTop: 10,
                      borderTop: "1px solid var(--hair)",
                      userSelect: "none",
                    }}
                  >
                    <Checkbox
                      checked={Boolean(it.receiptUploaded)}
                      onCheckedChange={(v) => updateLineItem(idx, { receiptUploaded: v === true })}
                    />
                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      Receipt uploaded
                      {it.description.trim() ? (
                        <span style={{ color: "var(--ink-faint)" }}> · {it.description.trim()}</span>
                      ) : null}
                    </span>
                  </label>
                ) : null}
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

      {editingInvoice && draft.type === "reimbursement" ? (
        <div
          style={{
            borderTop: "1px solid var(--hair)",
            paddingTop: 18,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 600 }}>Receipts</h4>
            <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>
              Drop in PDFs, photos, or screenshots — multiple files supported.
            </p>
          </div>
          <ReceiptsManager invoiceId={editingInvoice.id} compact />
        </div>
      ) : !editingInvoice && draft.type === "reimbursement" ? (
        <div
          style={{
            borderTop: "1px solid var(--hair)",
            paddingTop: 18,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 600 }}>Receipts</h4>
            <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>
              Add as many as you need — they stay staged and attach when you create the reimbursement.
            </p>
          </div>
          <ReceiptStager files={staged} setFiles={setStaged} disabled={pending} />
        </div>
      ) : null}
    </section>
  );
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Stages receipt files locally (no upload). The invoice form uploads them
// after the reimbursement is created, so nothing persists until you save.
function ReceiptStager({
  files,
  setFiles,
  disabled,
}: {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  disabled?: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);

  function add(list: FileList | File[] | null) {
    if (!list) return;
    const arr = Array.from(list);
    if (arr.length === 0) return;
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`));
      return [...prev, ...arr.filter((f) => !seen.has(`${f.name}:${f.size}`))];
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); add(e.dataTransfer.files); }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          padding: "18px 16px",
          border: `1.5px dashed ${dragOver ? "var(--sign-green)" : "var(--hair)"}`,
          borderRadius: 10,
          background: dragOver ? "rgba(29,60,142,0.06)" : "var(--cream-light)",
          color: "var(--ink-soft)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.7 : 1,
          transition: "background 120ms, border-color 120ms",
        }}
      >
        <Upload className="h-5 w-5" style={{ color: "var(--sign-green)" }} />
        <div style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 500 }}>Drop receipts here</div>
        <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>or click to browse · PDF, images, anything</div>
        <input
          type="file"
          multiple
          hidden
          disabled={disabled}
          onChange={(e) => { add(e.target.files); e.target.value = ""; }}
        />
      </label>

      {files.length > 0 ? (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, border: "1px solid var(--hair)", borderRadius: 8, overflow: "hidden" }}>
          {files.map((f, i) => (
            <li
              key={`${f.name}:${f.size}:${i}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                borderTop: i === 0 ? "none" : "1px solid var(--hair)",
                background: i % 2 === 0 ? "transparent" : "var(--cream-light)",
              }}
            >
              <FileText className="h-4 w-4 flex-none" style={{ color: "var(--ink-soft)" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={f.name}>
                  {f.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 1 }}>{fmtSize(f.size)} · staged</div>
              </div>
              <button
                type="button"
                onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                title="Remove"
                style={{ width: 28, height: 28, borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "1px solid var(--hair)", color: "var(--ink-soft)", cursor: "pointer" }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
