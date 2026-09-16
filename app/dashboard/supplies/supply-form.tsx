"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { createSupply, updateSupply } from "./actions";
import type { Supply } from "@/lib/db/schema";

export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  background: "var(--cream-light)",
  border: "1px solid var(--hair)",
  borderRadius: 8,
  color: "var(--ink)",
  fontSize: 13,
  fontFamily: "Arial, sans-serif",
};

export const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--ink-faint)",
  marginBottom: 5,
};

const UNIT_LABELS = ["ea", "pk", "bx", "rm", "ct", "rl", "gal", "lb"];

function emptyDraft() {
  return {
    name: "",
    category: "",
    vendor: "",
    reorderUrl: "",
    unitLabel: "ea",
    unitCost: "",
    quantityOnHand: "0",
    location: "",
    notes: "",
  };
}

type Draft = ReturnType<typeof emptyDraft>;

function toDraft(s: Supply): Draft {
  return {
    name: s.name,
    category: s.category ?? "",
    vendor: s.vendor ?? "",
    reorderUrl: s.reorderUrl ?? "",
    unitLabel: s.unitLabel,
    unitCost: s.unitCost ?? "",
    quantityOnHand: String(s.quantityOnHand),
    location: s.location ?? "",
    notes: s.notes ?? "",
  };
}

export function SupplyForm({
  editing,
  categories,
  onDone,
}: {
  editing: Supply | null;
  categories: string[];
  onDone: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(editing ? toDraft(editing) : emptyDraft());
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setDraft(editing ? toDraft(editing) : emptyDraft());
  }, [editing]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) { toast.error("Name is required"); return; }
    startTransition(async () => {
      const payload = {
        name: draft.name,
        category: draft.category,
        vendor: draft.vendor,
        reorder_url: draft.reorderUrl,
        unit_label: draft.unitLabel,
        unit_cost: draft.unitCost.trim() === "" ? null : Number(draft.unitCost),
        quantity_on_hand: Number(draft.quantityOnHand || 0),
        location: draft.location,
        notes: draft.notes,
      };
      const r = editing ? await updateSupply(editing.id, payload) : await createSupply(payload);
      if ("error" in r && r.error) { toast.error(r.error); return; }
      toast.success(editing ? "Supply updated" : "Supply added");
      onDone();
    });
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((p) => ({ ...p, [key]: value }));

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label style={labelStyle}>Item</label>
        <input
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Printer paper"
          style={inputStyle}
          required
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelStyle}>Category</label>
          {/* Free text, with whatever categories are already in use offered as
              suggestions — no fixed list to maintain. */}
          <input
            value={draft.category}
            onChange={(e) => set("category", e.target.value)}
            placeholder="Paper"
            list="supply-categories"
            style={inputStyle}
          />
          <datalist id="supply-categories">
            {categories.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
        <div>
          <label style={labelStyle}>Location</label>
          <input
            value={draft.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="Supply closet"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelStyle}>On hand</label>
          <input
            type="number"
            min={0}
            step={1}
            value={draft.quantityOnHand}
            onChange={(e) => set("quantityOnHand", e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Unit</label>
          <select value={draft.unitLabel} onChange={(e) => set("unitLabel", e.target.value)} style={inputStyle}>
            {UNIT_LABELS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Unit cost</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={draft.unitCost}
            onChange={(e) => set("unitCost", e.target.value)}
            placeholder="0.00"
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Vendor</label>
        <input
          value={draft.vendor}
          onChange={(e) => set("vendor", e.target.value)}
          placeholder="Staples"
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Reorder link</label>
        <input
          type="url"
          value={draft.reorderUrl}
          onChange={(e) => set("reorderUrl", e.target.value)}
          placeholder="https://…"
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Notes</label>
        <textarea
          value={draft.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        style={{
          padding: "11px 16px",
          background: "var(--ink)",
          color: "var(--paper)",
          border: "none",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "Arial, sans-serif",
          cursor: pending ? "not-allowed" : "pointer",
          opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? "Saving…" : editing ? "Save changes" : "Add supply"}
      </button>
    </form>
  );
}
