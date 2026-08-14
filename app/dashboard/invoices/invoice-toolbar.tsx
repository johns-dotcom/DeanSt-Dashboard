"use client";

import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_FILTERS,
  hasActiveFilters,
  type GroupKey,
  type InvoiceFilterState,
  type RangeKey,
  type SentFilter,
  type StatusFilter,
  type TypeFilter,
} from "@/lib/invoice-filters";

// Status pills are one mutually-exclusive row: the coarse open/closed split
// sits alongside the individual statuses so no contradictory pair is reachable.
// "pending" reads as "Unpaid" here, matching the inline StatusMenu labels.
const STATUS_PILLS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Unpaid" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
];

const RANGES: { value: RangeKey; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "month", label: "This month" },
  { value: "3m", label: "Last 3 mo" },
  { value: "year", label: "This year" },
  { value: "last-year", label: "Last year" },
];

export function InvoiceToolbar({
  state,
  onChange,
  counts,
}: {
  state: InvoiceFilterState;
  onChange: (next: InvoiceFilterState) => void;
  counts: Record<StatusFilter, number>;
}) {
  const set = <K extends keyof InvoiceFilterState>(key: K, value: InvoiceFilterState[K]) =>
    onChange({ ...state, [key]: value });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "14px 26px",
        borderBottom: "1px solid var(--hair)",
        background: "var(--cream-light)",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {STATUS_PILLS.map(({ value, label }) => {
          const active = state.status === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => set("status", value)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                background: active ? "var(--ink)" : "var(--paper)",
                color: active ? "var(--cream)" : "var(--ink)",
                border: `1px solid ${active ? "var(--ink)" : "var(--hair)"}`,
                borderRadius: 999,
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              {label}
              <span style={{ color: active ? "var(--cream)" : "var(--ink-faint)", fontSize: 11.5 }}>
                {counts[value] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <div style={{ position: "relative" }}>
          <Search
            className="h-3.5 w-3.5"
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--ink-faint)",
              pointerEvents: "none",
            }}
          />
          <Input
            placeholder="Search number, client, description…"
            value={state.query}
            onChange={(e) => set("query", e.target.value)}
            className="w-64 pl-8"
          />
        </div>

        <NativeSelect
          value={state.type}
          onChange={(v) => set("type", v as TypeFilter)}
          options={[
            { value: "all", label: "All types" },
            { value: "invoice", label: "Income" },
            { value: "reimbursement", label: "Recoupment" },
          ]}
        />
        <NativeSelect
          value={state.sent}
          onChange={(v) => set("sent", v as SentFilter)}
          options={[
            { value: "all", label: "Sent & unsent" },
            { value: "sent", label: "Sent" },
            { value: "unsent", label: "Not sent" },
          ]}
        />
        <NativeSelect
          value={state.group}
          onChange={(v) => set("group", v as GroupKey)}
          options={[
            { value: "month", label: "Group: Month" },
            { value: "quarter", label: "Group: Quarter" },
            { value: "year", label: "Group: Year" },
            { value: "client", label: "Group: Client" },
            { value: "none", label: "Group: None" },
          ]}
        />

        <div style={{ display: "inline-flex", borderRadius: 8, border: "1px solid var(--hair)", overflow: "hidden" }}>
          {RANGES.map(({ value, label }, i) => {
            const active = state.range === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => set("range", value)}
                style={{
                  padding: "8px 12px",
                  background: active ? "var(--ink)" : "var(--paper)",
                  color: active ? "var(--cream)" : "var(--ink)",
                  border: "none",
                  borderLeft: i === 0 ? "none" : "1px solid var(--hair)",
                  fontSize: 12.5,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          {hasActiveFilters(state) ? (
            <button
              type="button"
              onClick={() => onChange({ ...DEFAULT_FILTERS, group: state.group, sort: state.sort })}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--ink-soft)",
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              Clear filters
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => set("sort", state.sort === "desc" ? "asc" : "desc")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 12px",
              background: "var(--paper)",
              border: "1px solid var(--hair)",
              borderRadius: 8,
              color: "var(--ink)",
              fontSize: 12.5,
              cursor: "pointer",
            }}
          >
            {state.sort === "desc" ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
            {state.sort === "desc" ? "Newest" : "Oldest"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NativeSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: "8px 30px 8px 12px",
        background: "var(--paper)",
        border: "1px solid var(--hair)",
        borderRadius: 8,
        color: "var(--ink)",
        fontSize: 12.5,
        fontFamily: "inherit",
        appearance: "none",
        backgroundImage:
          "linear-gradient(45deg, transparent 50%, var(--ink-soft) 50%), linear-gradient(135deg, var(--ink-soft) 50%, transparent 50%)",
        backgroundPosition: "calc(100% - 14px) 17px, calc(100% - 9px) 17px",
        backgroundSize: "5px 5px",
        backgroundRepeat: "no-repeat",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
