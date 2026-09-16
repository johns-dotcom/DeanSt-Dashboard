"use client";

import { useMemo, useState, useTransition } from "react";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Eyebrow } from "@/components/brand/eyebrow";
import { PageFooter } from "@/components/brand/page-footer";
import { SlideOver, SlideOverContent } from "@/components/dashboard/slide-over";
import { formatCurrency, formatDate } from "@/lib/utils";
import { categoriesOf, spendInMonth, statsBySupply } from "@/lib/supplies";
import { SupplyForm, inputStyle, labelStyle } from "./supply-form";
import { PurchasePanel } from "./purchase-panel";
import {
  createSupplyRequest,
  deleteSupply,
  deleteSupplyRequest,
  setSupplyQuantity,
  setSupplyReorderFlag,
  setSupplyRequestStatus,
} from "./actions";
import type { Supply, SupplyPurchase, SupplyRequest, SupplyRequestStatus } from "@/lib/db/schema";

const REQUEST_STATUSES: { value: SupplyRequestStatus; label: string }[] = [
  { value: "requested", label: "Requested" },
  { value: "ordered", label: "Ordered" },
  { value: "received", label: "Received" },
];

export function SuppliesClient({
  supplies,
  purchases,
  requests,
}: {
  supplies: Supply[];
  purchases: SupplyPurchase[];
  requests: SupplyRequest[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [formFor, setFormFor] = useState<Supply | null | "new">(null);
  const [historyFor, setHistoryFor] = useState<Supply | null>(null);

  const categories = useMemo(() => categoriesOf(supplies), [supplies]);
  const stats = useMemo(() => statsBySupply(supplies, purchases, new Date().getFullYear()), [supplies, purchases]);
  const monthSpend = useMemo(
    () => spendInMonth(purchases, new Date().toISOString().slice(0, 7)),
    [purchases]
  );
  const flaggedCount = supplies.filter((s) => s.needsReorder).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return supplies.filter((s) => {
      if (flaggedOnly && !s.needsReorder) return false;
      if (category !== "all" && (s.category ?? "") !== category) return false;
      if (q) {
        const hay = `${s.name} ${s.category ?? ""} ${s.vendor ?? ""} ${s.location ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [supplies, query, category, flaggedOnly]);

  // Purchases for the open item, newest first (the page query already sorts).
  const historyPurchases = useMemo(
    () => (historyFor ? purchases.filter((p) => p.supplyId === historyFor.id) : []),
    [historyFor, purchases]
  );

  return (
    <div style={{ padding: "32px 48px 60px", display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Eyebrow size={10} spacing={0.36}>№ 06 · Office</Eyebrow>
        <Eyebrow size={10} spacing={0.32}>
          {supplies.length} items · {flaggedCount} flagged · {formatCurrency(monthSpend)} this month
        </Eyebrow>
      </div>

      <section style={panelStyle}>
        <header style={headerStyle}>
          <div>
            <Eyebrow size={10}>Supplies</Eyebrow>
            <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em", marginTop: 4 }}>
              {visible.length === supplies.length
                ? `${supplies.length} on the shelf`
                : `${visible.length} of ${supplies.length} on the shelf`}
            </div>
          </div>
          <button type="button" onClick={() => setFormFor("new")} style={primaryButtonStyle}>
            <Plus className="h-4 w-4" /> Add item
          </button>
        </header>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
            padding: "14px 26px",
            borderBottom: "1px solid var(--hair)",
            background: "var(--cream-light)",
          }}
        >
          <input
            placeholder="Search item, vendor, location…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ ...inputStyle, width: 260, background: "var(--paper)" }}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ ...inputStyle, width: "auto", background: "var(--paper)" }}
          >
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            type="button"
            onClick={() => setFlaggedOnly((v) => !v)}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              fontSize: 12.5,
              cursor: "pointer",
              background: flaggedOnly ? "var(--ink)" : "var(--paper)",
              color: flaggedOnly ? "var(--cream)" : "var(--ink)",
              border: `1px solid ${flaggedOnly ? "var(--ink)" : "var(--hair)"}`,
            }}
          >
            Needs reordering {flaggedCount}
          </button>
        </div>

        {supplies.length === 0 ? (
          <Empty title="Nothing on the shelf yet." hint="Add your first supply to start tracking it." />
        ) : visible.length === 0 ? (
          <Empty title="No supplies match." hint="Try a different search or category." />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Arial, sans-serif" }}>
            <thead>
              <tr style={{ background: "var(--cream-light)" }}>
                <Th>Item</Th>
                <Th width={130}>On hand</Th>
                <Th align="right" width={90}>Unit $</Th>
                <Th width={140}>Vendor</Th>
                <Th width={130}>Location</Th>
                <Th width={110}>Last bought</Th>
                <Th align="right" width={100}>YTD</Th>
                <Th width={110}>Reorder</Th>
                <Th align="right" width={110}>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => {
                const st = stats[s.id];
                return (
                  <tr key={s.id} style={{ borderTop: "1px solid var(--hair)" }}>
                    <Td>
                      <button
                        type="button"
                        onClick={() => setHistoryFor(s)}
                        style={{
                          background: "transparent",
                          border: "none",
                          padding: 0,
                          font: "inherit",
                          color: "var(--ink)",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        {s.name}
                      </button>
                      {s.category ? (
                        <div style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{s.category}</div>
                      ) : null}
                    </Td>
                    <Td>
                      <QuantityCell supply={s} />
                    </Td>
                    <Td align="right">
                      <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--ink-soft)" }}>
                        {s.unitCost ? formatCurrency(Number(s.unitCost)) : "—"}
                      </span>
                    </Td>
                    <Td>
                      {s.reorderUrl ? (
                        <a
                          href={s.reorderUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--sign-green)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
                        >
                          {s.vendor || "Reorder"} <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span style={{ color: "var(--ink-soft)" }}>{s.vendor || "—"}</span>
                      )}
                    </Td>
                    <Td><span style={{ color: "var(--ink-soft)" }}>{s.location || "—"}</span></Td>
                    <Td>
                      <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>
                        {st?.lastPurchasedOn ? formatDate(st.lastPurchasedOn) : "—"}
                      </span>
                    </Td>
                    <Td align="right">
                      <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--ink-soft)" }}>
                        {st && st.yearSpend > 0 ? formatCurrency(st.yearSpend) : "—"}
                      </span>
                    </Td>
                    <Td><ReorderFlag supply={s} /></Td>
                    <Td align="right">
                      <div style={{ display: "inline-flex", gap: 4 }}>
                        <RowIcon onClick={() => setFormFor(s)} aria-label="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </RowIcon>
                        <DeleteSupplyButton supply={s} />
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <RequestsSection requests={requests} supplies={supplies} />

      <SlideOver open={formFor !== null} onOpenChange={(v) => { if (!v) setFormFor(null); }}>
        <SlideOverContent
          title={formFor && formFor !== "new" ? `Edit · ${formFor.name}` : "Add supply"}
          description={formFor && formFor !== "new" ? "Changes apply to this item everywhere." : "What you keep in the office."}
        >
          {formFor !== null ? (
            <SupplyForm
              editing={formFor === "new" ? null : formFor}
              categories={categories}
              onDone={() => setFormFor(null)}
            />
          ) : null}
        </SlideOverContent>
      </SlideOver>

      <PurchasePanel
        supply={historyFor}
        purchases={historyPurchases}
        open={historyFor !== null}
        onOpenChange={(v) => { if (!v) setHistoryFor(null); }}
      />

      <PageFooter />
    </div>
  );
}

/**
 * Stock is edited in place as things get used. The value commits on blur or
 * Enter, so a multi-digit count doesn't fire a write per keystroke.
 */
function QuantityCell({ supply }: { supply: Supply }) {
  const [value, setValue] = useState(String(supply.quantityOnHand));
  const [pending, startTransition] = useTransition();

  function commit() {
    const next = Number(value);
    if (!Number.isInteger(next) || next < 0) {
      setValue(String(supply.quantityOnHand));
      toast.error("Quantity must be a whole number");
      return;
    }
    if (next === supply.quantityOnHand) return;
    startTransition(async () => {
      const r = await setSupplyQuantity(supply.id, next);
      if (r && "error" in r && r.error) {
        setValue(String(supply.quantityOnHand));
        toast.error(r.error);
      }
    });
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 6 }}>
      <input
        type="number"
        min={0}
        step={1}
        value={value}
        disabled={pending}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        aria-label={`On hand · ${supply.name}`}
        style={{
          width: 62,
          padding: "5px 7px",
          background: "var(--cream-light)",
          border: "1px solid var(--hair)",
          borderRadius: 6,
          color: "var(--ink)",
          fontSize: 13,
          fontVariantNumeric: "tabular-nums",
        }}
      />
      <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>{supply.unitLabel}</span>
    </span>
  );
}

function ReorderFlag({ supply }: { supply: Supply }) {
  const [pending, startTransition] = useTransition();
  const on = supply.needsReorder;
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await setSupplyReorderFlag(supply.id, !on);
          if (r && "error" in r && r.error) toast.error(r.error);
        })
      }
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 600,
        letterSpacing: "0.04em",
        cursor: pending ? "not-allowed" : "pointer",
        background: on ? "rgba(201,100,66,0.12)" : "transparent",
        color: on ? "#a85b2a" : "var(--ink-faint)",
        border: `1px solid ${on ? "rgba(201,100,66,0.30)" : "var(--hair)"}`,
      }}
    >
      {on ? "REORDER" : "OK"}
    </button>
  );
}

function DeleteSupplyButton({ supply }: { supply: Supply }) {
  const [pending, startTransition] = useTransition();
  return (
    <RowIcon
      aria-label="Delete"
      onClick={() => {
        if (!confirm(`Delete ${supply.name}? Its purchase history goes with it.`)) return;
        startTransition(async () => {
          const r = await deleteSupply(supply.id);
          if (r && "error" in r && r.error) { toast.error(r.error); return; }
          toast.success("Supply deleted");
        });
      }}
    >
      <Trash2 className="h-3.5 w-3.5" style={{ opacity: pending ? 0.5 : 1 }} />
    </RowIcon>
  );
}

function RequestsSection({ requests, supplies }: { requests: SupplyRequest[]; supplies: Supply[] }) {
  const [item, setItem] = useState("");
  const [supplyId, setSupplyId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [pending, startTransition] = useTransition();
  const open = requests.filter((r) => r.status !== "received").length;

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!item.trim()) { toast.error("What do you need?"); return; }
    startTransition(async () => {
      const r = await createSupplyRequest({
        item: item.trim(),
        supply_id: supplyId || null,
        quantity: quantity.trim() === "" ? null : Number(quantity),
        notes: null,
      });
      if ("error" in r && r.error) { toast.error(r.error); return; }
      toast.success("Request added");
      setItem(""); setSupplyId(""); setQuantity("");
    });
  }

  return (
    <section style={panelStyle}>
      <header style={headerStyle}>
        <div>
          <Eyebrow size={10}>Requests</Eyebrow>
          <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em", marginTop: 4 }}>
            {open} open
          </div>
        </div>
      </header>

      <form
        onSubmit={add}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "flex-end",
          padding: "14px 26px",
          borderBottom: "1px solid var(--hair)",
          background: "var(--cream-light)",
        }}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={labelStyle}>Item</label>
          <input
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder="Standing desk"
            style={{ ...inputStyle, background: "var(--paper)" }}
          />
        </div>
        <div style={{ width: 90 }}>
          <label style={labelStyle}>Qty</label>
          <input
            type="number"
            min={1}
            step={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            style={{ ...inputStyle, background: "var(--paper)" }}
          />
        </div>
        <div style={{ width: 200 }}>
          {/* Optional: point the request at something already in the catalog. */}
          <label style={labelStyle}>Existing supply</label>
          <select
            value={supplyId}
            onChange={(e) => {
              setSupplyId(e.target.value);
              const match = supplies.find((s) => s.id === e.target.value);
              if (match && !item.trim()) setItem(match.name);
            }}
            style={{ ...inputStyle, background: "var(--paper)" }}
          >
            <option value="">Not in the catalog</option>
            {supplies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <button type="submit" disabled={pending} style={{ ...primaryButtonStyle, marginBottom: 1 }}>
          <Plus className="h-4 w-4" /> {pending ? "Adding…" : "Request"}
        </button>
      </form>

      {requests.length === 0 ? (
        <Empty title="No requests." hint="Anyone on the team can ask for something here." />
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Arial, sans-serif" }}>
          <thead>
            <tr style={{ background: "var(--cream-light)" }}>
              <Th>Item</Th>
              <Th width={70}>Qty</Th>
              <Th width={160}>Requested by</Th>
              <Th width={110}>Asked</Th>
              <Th width={320}>Status</Th>
              <Th align="right" width={80}>{""}</Th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--hair)" }}>
                <Td>{r.item}</Td>
                <Td><span style={{ color: "var(--ink-soft)" }}>{r.quantity ?? "—"}</span></Td>
                <Td><span style={{ color: "var(--ink-soft)" }}>{r.requestedByName ?? "—"}</span></Td>
                <Td><span style={{ color: "var(--ink-soft)", fontSize: 13 }}>{formatDate(r.createdAt)}</span></Td>
                <Td><RequestStatus request={r} /></Td>
                <Td align="right"><DeleteRequestButton request={r} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function RequestStatus({ request }: { request: SupplyRequest }) {
  const [pending, startTransition] = useTransition();
  return (
    <div style={{ display: "inline-flex", borderRadius: 8, border: "1px solid var(--hair)", overflow: "hidden" }}>
      {REQUEST_STATUSES.map(({ value, label }, i) => {
        const active = request.status === value;
        return (
          <button
            key={value}
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await setSupplyRequestStatus(request.id, value);
                if (r && "error" in r && r.error) toast.error(r.error);
              })
            }
            style={{
              padding: "6px 12px",
              fontSize: 12,
              cursor: pending ? "not-allowed" : "pointer",
              background: active ? "var(--ink)" : "var(--paper)",
              color: active ? "var(--cream)" : "var(--ink-soft)",
              border: "none",
              borderLeft: i === 0 ? "none" : "1px solid var(--hair)",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function DeleteRequestButton({ request }: { request: SupplyRequest }) {
  const [pending, startTransition] = useTransition();
  return (
    <RowIcon
      aria-label="Delete request"
      onClick={() => {
        if (!confirm(`Remove the request for ${request.item}?`)) return;
        startTransition(async () => {
          const r = await deleteSupplyRequest(request.id);
          if (r && "error" in r && r.error) { toast.error(r.error); return; }
          toast.success("Request removed");
        });
      }}
    >
      <Trash2 className="h-3.5 w-3.5" style={{ opacity: pending ? 0.5 : 1 }} />
    </RowIcon>
  );
}

/* ── shared bits, matching the ledger styling on the invoices page ── */

const panelStyle: React.CSSProperties = {
  background: "var(--paper)",
  border: "1px solid var(--hair)",
  borderRadius: 10,
  overflow: "hidden",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "18px 26px",
  borderBottom: "1px solid var(--hair)",
};

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "9px 14px",
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "Arial, sans-serif",
  background: "var(--ink)",
  color: "var(--paper)",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};

function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <div style={{ padding: "56px 26px", textAlign: "center" }}>
      <div className="serif" style={{ fontSize: 22, color: "var(--ink)", fontStyle: "italic" }}>{title}</div>
      <div style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 6 }}>{hint}</div>
    </div>
  );
}

function Th({ children, align = "left", width }: { children: React.ReactNode; align?: "left" | "right"; width?: number }) {
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

function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <td style={{ padding: "14px 18px", textAlign: align, fontSize: 14, color: "var(--ink)", verticalAlign: "middle" }}>
      {children}
    </td>
  );
}

function RowIcon({
  children,
  onClick,
  ...rest
}: { children: React.ReactNode; onClick: () => void } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      {...rest}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        background: "var(--cream-light)",
        border: "1px solid var(--hair)",
        borderRadius: 7,
        color: "var(--ink-soft)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
