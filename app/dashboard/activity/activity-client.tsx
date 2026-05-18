"use client";

import { useMemo, useState } from "react";
import { Eyebrow } from "@/components/brand/eyebrow";
import { PageFooter } from "@/components/brand/page-footer";
import { FilterPills } from "@/components/dashboard/filter-pills";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Input } from "@/components/ui/input";
import { activityCategory, describeActivity } from "@/lib/activity-format";
import { formatDate } from "@/lib/utils";
import type { ActivityEvent } from "@/lib/db/schema";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "auth", label: "Auth" },
  { value: "invoices", label: "Invoices" },
  { value: "deals", label: "Deals" },
  { value: "contacts", label: "Contacts" },
  { value: "tasks", label: "Tasks" },
  { value: "documents", label: "Documents" },
  { value: "team", label: "Team" },
  { value: "workspace", label: "Workspace" },
  { value: "profile", label: "Profile" },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];

function relativeTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(date, { month: "short", day: "numeric", year: "numeric" });
}

function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function groupByDay(events: ActivityEvent[]) {
  const out: { day: string; items: ActivityEvent[] }[] = [];
  let currentKey = "";
  for (const ev of events) {
    const d = new Date(ev.createdAt);
    const key = d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    if (key !== currentKey) {
      currentKey = key;
      out.push({ day: key, items: [] });
    }
    out[out.length - 1].items.push(ev);
  }
  return out;
}

export function ActivityClient({ events }: { events: ActivityEvent[] }) {
  const [filter, setFilter] = useState<Category>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return events.filter((ev) => {
      if (filter !== "all" && activityCategory(ev.action) !== filter) return false;
      if (q) {
        const haystack = `${ev.actorName ?? ""} ${ev.action} ${ev.entityLabel ?? ""} ${describeActivity(ev.action, ev.entityLabel)}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [events, filter, query]);

  const groups = useMemo(() => groupByDay(filtered), [filtered]);

  return (
    <div style={{ padding: "32px 48px 60px", display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Eyebrow size={10} spacing={0.36}>№ 04 · Trail</Eyebrow>
        <Eyebrow size={10} spacing={0.32}>{events.length} events</Eyebrow>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <Input
          placeholder="Search by actor, entity, or action…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
        <FilterPills<Category>
          value={filter}
          options={CATEGORIES.map((c) => ({ ...c }))}
          onChange={setFilter}
        />
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: "var(--paper)", border: "1px solid var(--hair)", borderRadius: 10 }}>
          <EmptyState
            title={events.length === 0 ? "No activity yet" : "Nothing matches that filter"}
            description={
              events.length === 0
                ? "Sign-ins, edits, and other workspace events will show up here."
                : "Try a different category or clear the search."
            }
          />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {groups.map((group) => (
            <section
              key={group.day}
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
                  padding: "14px 22px",
                  borderBottom: "1px solid var(--hair)",
                  background: "var(--cream-light)",
                }}
              >
                <Eyebrow size={10}>{group.day}</Eyebrow>
                <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>{group.items.length} events</span>
              </header>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {group.items.map((ev, idx) => (
                  <li
                    key={ev.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 14,
                      padding: "16px 22px",
                      borderTop: idx === 0 ? "none" : "1px solid var(--hair)",
                    }}
                  >
                    <span
                      style={{
                        flex: "none",
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        background: "var(--sign-green)",
                        color: "#fff",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {initials(ev.actorName)}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, color: "var(--ink)" }}>
                        <strong style={{ fontWeight: 600 }}>{ev.actorName ?? "Someone"}</strong>{" "}
                        <span style={{ color: "var(--ink-soft)" }}>{describeActivity(ev.action, ev.entityLabel)}</span>
                      </div>
                      <div style={{ marginTop: 4, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <CategoryPill category={activityCategory(ev.action)} />
                        <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>{relativeTime(ev.createdAt)}</span>
                        <span style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>
                          {new Date(ev.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <PageFooter />
    </div>
  );
}

function CategoryPill({ category }: { category: string }) {
  return (
    <span
      className="mono"
      style={{
        fontSize: 9.5,
        letterSpacing: "0.2em",
        padding: "3px 9px",
        borderRadius: 999,
        background: "rgba(10,58,28,0.08)",
        color: "var(--sign-green)",
      }}
    >
      {category}
    </span>
  );
}
