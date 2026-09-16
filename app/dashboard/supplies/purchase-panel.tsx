"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SlideOver, SlideOverContent } from "@/components/dashboard/slide-over";
import { formatCurrency, formatDate } from "@/lib/utils";
import { statsForPurchases } from "@/lib/supplies";
import { logSupplyPurchase, deleteSupplyPurchase } from "./actions";
import { inputStyle, labelStyle } from "./supply-form";
import type { Supply, SupplyPurchase } from "@/lib/db/schema";

export function PurchasePanel({
  supply,
  purchases,
  open,
  onOpenChange,
}: {
  supply: Supply | null;
  purchases: SupplyPurchase[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <SlideOver open={open} onOpenChange={onOpenChange}>
      <SlideOverContent
        title={supply ? supply.name : "Purchases"}
        description={supply ? [supply.vendor, supply.location].filter(Boolean).join(" · ") : ""}
      >
        {supply ? <PurchaseBody supply={supply} purchases={purchases} /> : null}
      </SlideOverContent>
    </SlideOver>
  );
}

function PurchaseBody({ supply, purchases }: { supply: Supply; purchases: SupplyPurchase[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ purchasedOn: today, vendor: "", quantity: "1", totalCost: "", notes: "" });
  const [pending, startTransition] = useTransition();
  const stats = statsForPurchases(purchases, new Date().getFullYear());

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await logSupplyPurchase({
        supply_id: supply.id,
        purchased_on: form.purchasedOn || today,
        vendor: form.vendor,
        quantity: Number(form.quantity || 1),
        total_cost: form.totalCost.trim() === "" ? null : Number(form.totalCost),
        notes: form.notes,
      });
      if ("error" in r && r.error) { toast.error(r.error); return; }
      toast.success(`Logged ${form.quantity} ${supply.unitLabel} · stock updated`);
      setForm({ purchasedOn: today, vendor: "", quantity: "1", totalCost: "", notes: "" });
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this purchase? Its quantity comes back off the shelf.")) return;
    startTransition(async () => {
      const r = await deleteSupplyPurchase(id);
      if (r && "error" in r && r.error) { toast.error(r.error); return; }
      toast.success("Purchase deleted");
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
        <Stat label="On hand" value={`${supply.quantityOnHand} ${supply.unitLabel}`} />
        <Stat label="Spent this year" value={formatCurrency(stats.yearSpend)} />
        <Stat label="All time" value={formatCurrency(stats.totalSpend)} />
      </div>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>Log a purchase</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label style={labelStyle}>Date</label>
            <input
              type="date"
              value={form.purchasedOn}
              onChange={(e) => setForm((p) => ({ ...p, purchasedOn: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Vendor</label>
            <input
              value={form.vendor}
              onChange={(e) => setForm((p) => ({ ...p, vendor: e.target.value }))}
              placeholder={supply.vendor ?? "Staples"}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Quantity ({supply.unitLabel})</label>
            <input
              type="number"
              min={1}
              step={1}
              value={form.quantity}
              onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
              style={inputStyle}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Total cost</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.totalCost}
              onChange={(e) => setForm((p) => ({ ...p, totalCost: e.target.value }))}
              placeholder="0.00"
              style={inputStyle}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={pending}
          style={{
            padding: "10px 14px",
            background: "var(--ink)",
            color: "var(--paper)",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: pending ? "not-allowed" : "pointer",
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? "Saving…" : `Log purchase · adds to stock`}
        </button>
      </form>

      <div>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
          History {stats.purchaseCount ? `· ${stats.purchaseCount}` : ""}
        </div>
        {purchases.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>Nothing bought yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {purchases.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "9px 0",
                  borderTop: "1px solid var(--hair)",
                  fontSize: 13,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div>{formatDate(p.purchasedOn)} · {p.quantity} {supply.unitLabel}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>
                    {[p.vendor, p.notes].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {p.totalCost ? formatCurrency(Number(p.totalCost)) : "—"}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    aria-label="Delete purchase"
                    style={{ background: "transparent", border: "none", color: "var(--ink-faint)", cursor: "pointer" }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-faint)" }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, marginTop: 3 }}>{value}</div>
    </div>
  );
}
