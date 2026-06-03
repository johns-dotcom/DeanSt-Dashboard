"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  LogIn,
  FileText,
  TrendingUp,
  Users,
  CheckSquare,
  FolderClosed,
  UserCog,
  Settings,
  RefreshCw,
  ArrowDown,
  ArrowUp,
  DollarSign,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { actionTitle, activityCategory, detailsText } from "@/lib/activity-format";
import type { ActivityEvent, Role } from "@/lib/db/schema";

type Category = "all" | "auth" | "invoices" | "deals" | "contacts" | "tasks" | "documents" | "team" | "settings";
type RangeKey = "today" | "7d" | "30d" | "all";
type SortDir = "desc" | "asc";

const CATEGORIES: { value: Category; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "all", label: "All Activity", Icon: Activity },
  { value: "auth", label: "Sign-ins", Icon: LogIn },
  { value: "invoices", label: "Invoices", Icon: DollarSign },
  { value: "deals", label: "Deals", Icon: TrendingUp },
  { value: "contacts", label: "Contacts", Icon: Users },
  { value: "tasks", label: "Tasks", Icon: CheckSquare },
  { value: "documents", label: "Documents", Icon: FolderClosed },
  { value: "team", label: "Team", Icon: UserCog },
  { value: "settings", label: "Settings", Icon: Settings },
];

const ACTION_ICON: Record<string, { Icon: React.ComponentType<{ className?: string }>; tint: { bg: string; fg: string } }> = {
  auth: { Icon: LogIn, tint: { bg: "rgba(33, 110, 200, 0.10)", fg: "#216ec8" } },
  invoice: { Icon: DollarSign, tint: { bg: "rgba(29,60,142,0.12)", fg: "var(--sign-green)" } },
  deal: { Icon: TrendingUp, tint: { bg: "rgba(201, 130, 30, 0.14)", fg: "#a36408" } },
  contact: { Icon: Users, tint: { bg: "rgba(124, 58, 200, 0.10)", fg: "#7a3acb" } },
  task: { Icon: CheckSquare, tint: { bg: "rgba(33, 130, 165, 0.10)", fg: "#1f7ea3" } },
  document: { Icon: FolderClosed, tint: { bg: "rgba(214, 96, 36, 0.12)", fg: "#b85214" } },
  member: { Icon: UserCog, tint: { bg: "rgba(190, 50, 90, 0.10)", fg: "#a83055" } },
  workspace: { Icon: Settings, tint: { bg: "rgba(26, 22, 18, 0.08)", fg: "var(--ink-soft)" } },
  profile: { Icon: Settings, tint: { bg: "rgba(26, 22, 18, 0.08)", fg: "var(--ink-soft)" } },
};

const ROLE_PILL: Record<Role, { bg: string; fg: string; label: string }> = {
  admin: { bg: "rgba(29,60,142,0.12)", fg: "var(--sign-green)", label: "admin" },
  member: { bg: "rgba(33, 110, 200, 0.10)", fg: "#216ec8", label: "member" },
  view_only: { bg: "rgba(26, 22, 18, 0.08)", fg: "var(--ink-soft)", label: "view only" },
};

type MemberOption = {
  id: string;
  userId: string;
  displayName: string;
  avatarInitials: string;
  role: Role;
};

function relative(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const s = (Date.now() - date.getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function absolute(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function cutoffFor(range: RangeKey): number {
  const now = Date.now();
  if (range === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  if (range === "7d") return now - 7 * 86400 * 1000;
  if (range === "30d") return now - 30 * 86400 * 1000;
  return 0;
}

function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function ActivityClient({ events, members }: { events: ActivityEvent[]; members: MemberOption[] }) {
  const router = useRouter();
  const [category, setCategory] = useState<Category>("all");
  const [search, setSearch] = useState("");
  const [memberId, setMemberId] = useState<"all" | string>("all");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [range, setRange] = useState<RangeKey>("7d");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [refreshing, startRefresh] = useTransition();

  const memberById = useMemo(() => {
    const map = new Map<string, MemberOption>();
    for (const m of members) map.set(m.id, m);
    return map;
  }, [members]);

  const filtered = useMemo(() => {
    const cutoff = cutoffFor(range);
    const q = search.toLowerCase().trim();
    const out = events.filter((e) => {
      if (category !== "all" && activityCategory(e.action) !== category) return false;
      if (memberId !== "all" && e.actorMemberId !== memberId) return false;
      if (roleFilter !== "all") {
        const m = e.actorMemberId ? memberById.get(e.actorMemberId) : null;
        if (!m || m.role !== roleFilter) return false;
      }
      if (cutoff && new Date(e.createdAt).getTime() < cutoff) return false;
      if (q) {
        const hay = `${e.actorName ?? ""} ${actionTitle(e.action)} ${e.entityLabel ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    out.sort((a, b) => {
      const t = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "desc" ? -t : t;
    });
    return out;
  }, [events, category, memberId, roleFilter, range, search, sortDir, memberById]);

  return (
    <div style={{ padding: "32px 48px 60px", display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1
            style={{
              fontFamily: "Arial, sans-serif",
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
            }}
          >
            Activity History
          </h1>
          <div style={{ marginTop: 4, fontSize: 13.5, color: "var(--ink-soft)" }}>
            {filtered.length} events matching filters
          </div>
        </div>
        <button
          onClick={() => startRefresh(() => router.refresh())}
          disabled={refreshing}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            background: "var(--cream-light)",
            border: "1px solid var(--hair)",
            borderRadius: 8,
            color: "var(--ink)",
            fontSize: 13,
            cursor: refreshing ? "not-allowed" : "pointer",
            opacity: refreshing ? 0.6 : 1,
          }}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {CATEGORIES.map(({ value, label, Icon }) => {
          const active = category === value;
          return (
            <button
              key={value}
              onClick={() => setCategory(value)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                background: active ? "var(--ink)" : "var(--cream-light)",
                color: active ? "var(--cream)" : "var(--ink)",
                border: active ? "1px solid var(--ink)" : "1px solid var(--hair)",
                borderRadius: 999,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
          background: "var(--paper)",
          border: "1px solid var(--hair)",
          borderRadius: 10,
          padding: 14,
        }}
      >
        <Input
          placeholder="Search user or action…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <NativeSelect
          value={memberId}
          onChange={setMemberId}
          options={[{ value: "all", label: "All users" }, ...members.map((m) => ({ value: m.id, label: m.displayName }))]}
        />
        <NativeSelect
          value={roleFilter}
          onChange={(v) => setRoleFilter(v as "all" | Role)}
          options={[
            { value: "all", label: "All roles" },
            { value: "admin", label: "Admin" },
            { value: "member", label: "Member" },
            { value: "view_only", label: "View only" },
          ]}
        />
        <div style={{ display: "inline-flex", borderRadius: 8, border: "1px solid var(--hair)", overflow: "hidden" }}>
          {(["today", "7d", "30d", "all"] as RangeKey[]).map((k, i) => {
            const labels = { today: "Today", "7d": "Last 7d", "30d": "Last 30d", all: "All time" };
            const active = range === k;
            return (
              <button
                key={k}
                onClick={() => setRange(k)}
                style={{
                  padding: "8px 14px",
                  background: active ? "var(--ink)" : "var(--cream-light)",
                  color: active ? "var(--cream)" : "var(--ink)",
                  border: "none",
                  borderLeft: i === 0 ? "none" : "1px solid var(--hair)",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {labels[k]}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            background: "var(--cream-light)",
            border: "1px solid var(--hair)",
            borderRadius: 8,
            color: "var(--ink)",
            fontSize: 13,
            cursor: "pointer",
            marginLeft: "auto",
          }}
        >
          {sortDir === "desc" ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
          {sortDir === "desc" ? "Newest" : "Oldest"}
        </button>
      </div>

      <div
        style={{
          background: "var(--paper)",
          border: "1px solid var(--hair)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ padding: "48px 26px", textAlign: "center" }}>
            <div className="serif" style={{ fontSize: 22, color: "var(--ink)", fontStyle: "italic" }}>
              No activity matches your filters.
            </div>
            <div style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 6 }}>
              Try a wider date range or clear the search.
            </div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Arial, sans-serif" }}>
            <thead>
              <tr style={{ background: "var(--cream-light)" }}>
                <Th width={240}>User</Th>
                <Th>Action</Th>
                <Th>Details</Th>
                <Th width={190}>Time {sortDir === "desc" ? "↓" : "↑"}</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const member = e.actorMemberId ? memberById.get(e.actorMemberId) : undefined;
                const cat = e.action.split(".")[0];
                const icon = ACTION_ICON[cat] ?? { Icon: Activity, tint: { bg: "var(--cream-deep)", fg: "var(--ink-soft)" } };
                const Icon = icon.Icon;
                const role = member?.role ?? null;
                const details = detailsText(e.action, e.metadata);
                return (
                  <tr key={e.id} style={{ borderTop: "1px solid var(--hair)" }}>
                    <Td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: "50%",
                            background: role ? ROLE_PILL[role].bg : "var(--cream-deep)",
                            color: role ? ROLE_PILL[role].fg : "var(--ink-soft)",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 600,
                            flex: "none",
                          }}
                        >
                          {initials(e.actorName)}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>
                            {e.actorName ?? "Unknown"}
                          </div>
                          {role ? (
                            <span
                              style={{
                                display: "inline-block",
                                marginTop: 3,
                                padding: "1px 7px",
                                borderRadius: 4,
                                background: ROLE_PILL[role].bg,
                                color: ROLE_PILL[role].fg,
                                fontSize: 11,
                                fontWeight: 500,
                              }}
                            >
                              {ROLE_PILL[role].label}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: icon.tint.bg,
                            color: icon.tint.fg,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flex: "none",
                          }}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
                            {actionTitle(e.action)}
                          </div>
                          {e.entityLabel ? (
                            <div
                              style={{
                                fontSize: 12.5,
                                color: "var(--ink-soft)",
                                marginTop: 2,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: 320,
                              }}
                            >
                              {e.entityLabel}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <span style={{ color: details === "—" ? "var(--ink-faint)" : "var(--ink-soft)", fontSize: 13.5 }}>
                        {details}
                      </span>
                    </Td>
                    <Td>
                      <div style={{ fontSize: 13.5, fontWeight: 500 }}>{absolute(e.createdAt)}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 2 }}>{relative(e.createdAt)}</div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Th({ children, width }: { children: React.ReactNode; width?: number }) {
  return (
    <th
      className="mono"
      style={{
        textAlign: "left",
        padding: "12px 18px",
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

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td style={{ padding: "14px 18px", verticalAlign: "middle" }}>{children}</td>
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
        background: "var(--cream-light)",
        border: "1px solid var(--hair)",
        borderRadius: 8,
        color: "var(--ink)",
        fontSize: 13,
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
