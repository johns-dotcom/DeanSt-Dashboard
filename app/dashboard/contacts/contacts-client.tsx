"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Users,
  Mail,
  Phone,
  MapPin,
  LayoutGrid,
  Table as TableIcon,
  ChevronDown,
  ChevronUp,
  StickyNote,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { FilterPills } from "@/components/dashboard/filter-pills";
import { EmptyState } from "@/components/dashboard/empty-state";
import { SlideOver, SlideOverContent } from "@/components/dashboard/slide-over";
import { ContactForm } from "./contact-form";
import { cn } from "@/lib/utils";
import type { Contact } from "@/lib/db/schema";

const AVATAR_COLORS = [
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-orange-100 text-orange-700",
];

function avatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

type ViewMode = "cards" | "table";
type SortKey = "name" | "role" | "industry" | "clients" | "city" | "email" | "phone" | "notes";
type SortDir = "asc" | "desc";
type SortOption =
  | "name_asc"
  | "name_desc"
  | "industry_asc"
  | "role_asc"
  | "recently_added"
  | "recently_updated";

const SORT_LABEL: Record<SortOption, string> = {
  name_asc: "Name (A–Z)",
  name_desc: "Name (Z–A)",
  industry_asc: "Category",
  role_asc: "Role",
  recently_added: "Recently added",
  recently_updated: "Recently updated",
};

const PAGE_SIZE_CARDS = 120;
const PAGE_SIZE_TABLE = 200;
const UNCATEGORIZED = "__uncat__";

function strCmp(a: string | null | undefined, b: string | null | undefined) {
  return (a ?? "").localeCompare(b ?? "", undefined, { sensitivity: "base" });
}

function compareForSort(a: Contact, b: Contact, opt: SortOption): number {
  switch (opt) {
    case "name_asc": return strCmp(a.name, b.name);
    case "name_desc": return strCmp(b.name, a.name);
    case "industry_asc": return strCmp(a.industry, b.industry) || strCmp(a.name, b.name);
    case "role_asc": return strCmp(a.role, b.role) || strCmp(a.name, b.name);
    case "recently_added": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    case "recently_updated": return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  }
}

export function ContactsClient({ contacts }: { contacts: Contact[] }) {
  const [filter, setFilter] = useState<string>("all");
  const [brand, setBrand] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [hasEmail, setHasEmail] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);
  const [hasNotes, setHasNotes] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>("name_asc");
  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [view, setView] = useState<ViewMode>("cards");
  const [tableSortKey, setTableSortKey] = useState<SortKey>("name");
  const [tableSortDir, setTableSortDir] = useState<SortDir>("asc");
  const [pageSize, setPageSize] = useState(PAGE_SIZE_CARDS);

  useEffect(() => {
    const stored = localStorage.getItem("deanst.contacts.view");
    if (stored === "cards" || stored === "table") {
      setView(stored);
      setPageSize(stored === "cards" ? PAGE_SIZE_CARDS : PAGE_SIZE_TABLE);
    }
  }, []);

  function changeView(next: ViewMode) {
    setView(next);
    localStorage.setItem("deanst.contacts.view", next);
    setPageSize(next === "cards" ? PAGE_SIZE_CARDS : PAGE_SIZE_TABLE);
  }

  function toggleTableSort(key: SortKey) {
    if (tableSortKey === key) setTableSortDir(tableSortDir === "asc" ? "desc" : "asc");
    else { setTableSortKey(key); setTableSortDir("asc"); }
  }

  const { industries, uncategorizedCount } = useMemo(() => {
    const counts = new Map<string, number>();
    let uncat = 0;
    for (const c of contacts) {
      if (c.industry) counts.set(c.industry, (counts.get(c.industry) ?? 0) + 1);
      else uncat++;
    }
    const arr = Array.from(counts.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([value, count]) => ({ value, label: value, count }));
    return { industries: arr, uncategorizedCount: uncat };
  }, [contacts]);

  // Brands within the currently selected industry
  const brands = useMemo(() => {
    if (filter === "all" || filter === UNCATEGORIZED) return [];
    const counts = new Map<string, number>();
    for (const c of contacts) {
      if (c.industry !== filter) continue;
      for (const cl of c.clients ?? []) {
        if (cl) counts.set(cl, (counts.get(cl) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([value, count]) => ({ value, label: value, count }));
  }, [contacts, filter]);

  useEffect(() => { setBrand("all"); }, [filter]);

  const activeQuickFilters = [hasEmail, hasPhone, hasNotes].filter(Boolean).length;

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const out = contacts.filter((c) => {
      if (filter !== "all") {
        if (filter === UNCATEGORIZED) { if (c.industry) return false; }
        else if (c.industry !== filter) return false;
      }
      if (brand !== "all" && !(c.clients ?? []).includes(brand)) return false;
      if (hasEmail && !c.email) return false;
      if (hasPhone && !c.phone) return false;
      if (hasNotes && !c.notes) return false;
      if (q && !`${c.name} ${c.role ?? ""} ${c.email ?? ""} ${c.industry ?? ""} ${c.city ?? ""} ${(c.clients ?? []).join(" ")}`.toLowerCase().includes(q)) return false;
      return true;
    });

    if (view === "table") {
      const dir = tableSortDir === "asc" ? 1 : -1;
      out.sort((a, b) => {
        const va = tableSortKey === "clients" ? (a.clients ?? []).join(", ") : (a as unknown as Record<SortKey, string | null>)[tableSortKey];
        const vb = tableSortKey === "clients" ? (b.clients ?? []).join(", ") : (b as unknown as Record<SortKey, string | null>)[tableSortKey];
        return strCmp(va, vb) * dir;
      });
    } else {
      out.sort((a, b) => compareForSort(a, b, sortOption));
    }
    return out;
  }, [contacts, filter, brand, query, hasEmail, hasPhone, hasNotes, sortOption, view, tableSortKey, tableSortDir]);

  const visible = filtered.slice(0, pageSize);

  const pillOptions = useMemo(() => {
    const opts: { value: string; label: string; count?: number }[] = [
      { value: "all", label: "All", count: contacts.length },
      ...industries,
    ];
    if (uncategorizedCount > 0) {
      opts.push({ value: UNCATEGORIZED, label: "Uncategorized", count: uncategorizedCount });
    }
    return opts;
  }, [industries, uncategorizedCount, contacts.length]);

  const industryNames = useMemo(() => industries.map((i) => i.value), [industries]);

  const resetAll = () => {
    setFilter("all"); setBrand("all"); setQuery("");
    setHasEmail(false); setHasPhone(false); setHasNotes(false);
    setSortOption("name_asc");
  };

  const anyFilterActive =
    filter !== "all" || brand !== "all" || query.trim() !== "" || activeQuickFilters > 0;

  return (
    <div style={{ padding: "32px 48px 60px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 280 }}>
          <Input
            placeholder="Search by name, role, brand, email…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPageSize(view === "cards" ? PAGE_SIZE_CARDS : PAGE_SIZE_TABLE); }}
            className="max-w-xs"
          />
          <SortDropdown value={sortOption} onChange={setSortOption} disabled={view === "table"} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>
            {filtered.length} of {contacts.length} contacts
          </span>
          <ViewToggle value={view} onChange={changeView} />
        </div>
      </div>

      <FilterPills<string>
        value={filter}
        options={pillOptions}
        onChange={(v) => { setFilter(v); setPageSize(view === "cards" ? PAGE_SIZE_CARDS : PAGE_SIZE_TABLE); }}
      />

      {brands.length > 1 ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: "0.24em", color: "var(--ink-faint)", marginRight: 4 }}>
            Brand
          </span>
          <FilterPills<string>
            value={brand}
            options={[{ value: "all", label: `All ${filter}`, count: filtered.length }, ...brands]}
            onChange={(v) => { setBrand(v); setPageSize(view === "cards" ? PAGE_SIZE_CARDS : PAGE_SIZE_TABLE); }}
          />
        </div>
      ) : null}

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span className="mono" style={{ fontSize: 10, letterSpacing: "0.24em", color: "var(--ink-faint)", marginRight: 4 }}>
          Has
        </span>
        <QuickChip active={hasEmail} onClick={() => { setHasEmail(!hasEmail); setPageSize(view === "cards" ? PAGE_SIZE_CARDS : PAGE_SIZE_TABLE); }} icon={<Mail className="h-3 w-3" />} label="Email" />
        <QuickChip active={hasPhone} onClick={() => { setHasPhone(!hasPhone); setPageSize(view === "cards" ? PAGE_SIZE_CARDS : PAGE_SIZE_TABLE); }} icon={<Phone className="h-3 w-3" />} label="Phone" />
        <QuickChip active={hasNotes} onClick={() => { setHasNotes(!hasNotes); setPageSize(view === "cards" ? PAGE_SIZE_CARDS : PAGE_SIZE_TABLE); }} icon={<StickyNote className="h-3 w-3" />} label="Notes" />
        {anyFilterActive ? (
          <button
            onClick={resetAll}
            style={{
              marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4,
              padding: "6px 10px", fontSize: 12, background: "transparent",
              border: "none", color: "var(--ink-faint)", cursor: "pointer",
            }}
          >
            <X className="h-3 w-3" /> Clear all filters
          </button>
        ) : null}
      </div>

      {filtered.length === 0 && contacts.length === 0 ? (
        <EmptyState
          icon={<Users className="h-4 w-4" />}
          title="No contacts yet"
          description="Add brands, agencies, partners, and the people behind them."
          action={<button onClick={() => setOpenNew(true)} className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"><Plus className="inline h-4 w-4" /> Add contact</button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-4 w-4" />}
          title="No matches"
          description="Try a different category or clear some filters."
        />
      ) : view === "cards" ? (
        <>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
            {visible.map((c) => (
              <button
                key={c.id}
                onClick={() => setEditing(c)}
                className="group flex flex-col items-start rounded-lg border-hairline border-border bg-surface p-4 text-left transition-colors hover:bg-hover"
              >
                <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium", avatarColor(c.name))}>
                  {initials(c.name) || "?"}
                </span>
                <div className="mt-3 line-clamp-1 text-sm font-medium">{c.name}</div>
                <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground" style={{ minHeight: "2.4em" }}>
                  {c.role || ""}
                </div>
                {(c.industry || c.clients?.length) ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.industry ? (
                      <span
                        className="mono"
                        style={{ fontSize: 9, letterSpacing: "0.18em", padding: "2px 7px", borderRadius: 999, background: "rgba(29,60,142,0.10)", color: "var(--sign-green)" }}
                      >
                        {c.industry}
                      </span>
                    ) : null}
                    {(c.clients ?? []).slice(0, 2).map((cl) => (
                      <span key={cl} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground line-clamp-1" style={{ maxWidth: 110 }}>{cl}</span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-2.5 flex flex-col gap-0.5 text-[11px] text-muted-foreground w-full overflow-hidden">
                  {c.email ? (
                    <span className="inline-flex items-center gap-1 truncate"><Mail className="h-3 w-3 flex-none" /><span className="truncate">{c.email}</span></span>
                  ) : null}
                  {c.phone ? (
                    <span className="inline-flex items-center gap-1 truncate"><Phone className="h-3 w-3 flex-none" /><span className="truncate">{c.phone}</span></span>
                  ) : null}
                  {c.city ? (
                    <span className="inline-flex items-center gap-1 truncate"><MapPin className="h-3 w-3 flex-none" /><span className="truncate">{c.city}</span></span>
                  ) : null}
                </div>
              </button>
            ))}
            <button
              onClick={() => setOpenNew(true)}
              className="flex min-h-[160px] flex-col items-center justify-center gap-1 rounded-lg border-hairline border-dashed border-border bg-surface text-xs text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
              Add contact
            </button>
          </div>
          {filtered.length > pageSize ? (
            <LoadMore remaining={filtered.length - pageSize} pageSize={PAGE_SIZE_CARDS} onClick={() => setPageSize((p) => p + PAGE_SIZE_CARDS)} />
          ) : null}
        </>
      ) : (
        <>
          <div style={{ background: "var(--paper)", border: "1px solid var(--hair)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Arial, sans-serif" }}>
                <thead>
                  <tr style={{ background: "var(--cream-light)" }}>
                    <SortableTh label="Name" sortKey="name" current={tableSortKey} dir={tableSortDir} onClick={toggleTableSort} width={220} />
                    <SortableTh label="Role" sortKey="role" current={tableSortKey} dir={tableSortDir} onClick={toggleTableSort} />
                    <SortableTh label="Category" sortKey="industry" current={tableSortKey} dir={tableSortDir} onClick={toggleTableSort} width={170} />
                    <SortableTh label="Brands" sortKey="clients" current={tableSortKey} dir={tableSortDir} onClick={toggleTableSort} width={190} />
                    <SortableTh label="City" sortKey="city" current={tableSortKey} dir={tableSortDir} onClick={toggleTableSort} width={130} />
                    <SortableTh label="Email" sortKey="email" current={tableSortKey} dir={tableSortDir} onClick={toggleTableSort} width={220} />
                    <SortableTh label="Phone" sortKey="phone" current={tableSortKey} dir={tableSortDir} onClick={toggleTableSort} width={140} />
                    <SortableTh label="Notes" sortKey="notes" current={tableSortKey} dir={tableSortDir} onClick={toggleTableSort} width={240} />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setEditing(c)}
                      style={{ borderTop: "1px solid var(--hair)", cursor: "pointer" }}
                      className="hover:bg-hover"
                    >
                      <Td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-medium flex-none", avatarColor(c.name))}>
                            {initials(c.name) || "?"}
                          </span>
                          <span style={{ fontWeight: 500 }}>{c.name}</span>
                        </div>
                      </Td>
                      <Td>{c.role || <span style={{ color: "var(--ink-faint)" }}>—</span>}</Td>
                      <Td>
                        {c.industry ? (
                          <span
                            className="mono"
                            style={{ fontSize: 9, letterSpacing: "0.18em", padding: "2px 7px", borderRadius: 999, background: "rgba(29,60,142,0.10)", color: "var(--sign-green)" }}
                          >
                            {c.industry}
                          </span>
                        ) : <span style={{ color: "var(--ink-faint)" }}>—</span>}
                      </Td>
                      <Td title={(c.clients ?? []).join(", ")}>
                        {(c.clients ?? []).length > 0 ? (
                          <span style={{ color: "var(--ink-soft)" }}>{c.clients.join(", ")}</span>
                        ) : <span style={{ color: "var(--ink-faint)" }}>—</span>}
                      </Td>
                      <Td title={c.city ?? undefined}>
                        {c.city ? (
                          <span style={{ color: "var(--ink-soft)" }}>{c.city}</span>
                        ) : <span style={{ color: "var(--ink-faint)" }}>—</span>}
                      </Td>
                      <Td>
                        {c.email ? (
                          <a
                            href={`mailto:${c.email}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: "var(--sign-green)", textDecoration: "none" }}
                          >
                            {c.email}
                          </a>
                        ) : <span style={{ color: "var(--ink-faint)" }}>—</span>}
                      </Td>
                      <Td>
                        {c.phone ? (
                          <span style={{ color: "var(--ink-soft)" }}>{c.phone}</span>
                        ) : <span style={{ color: "var(--ink-faint)" }}>—</span>}
                      </Td>
                      <Td title={c.notes ?? undefined}>
                        {c.notes ? (
                          <span style={{ color: "var(--ink-soft)" }}>{c.notes}</span>
                        ) : <span style={{ color: "var(--ink-faint)" }}>—</span>}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {filtered.length > pageSize ? (
            <LoadMore remaining={filtered.length - pageSize} pageSize={PAGE_SIZE_TABLE} onClick={() => setPageSize((p) => p + PAGE_SIZE_TABLE)} />
          ) : null}
        </>
      )}

      <SlideOver open={openNew} onOpenChange={setOpenNew}>
        <SlideOverContent title="New contact" description="Add someone to your team's rolodex.">
          <ContactForm onDone={() => setOpenNew(false)} industries={industryNames} />
        </SlideOverContent>
      </SlideOver>

      <SlideOver open={Boolean(editing)} onOpenChange={(v) => !v && setEditing(null)}>
        <SlideOverContent title="Edit contact" description="Update contact info.">
          {editing ? <ContactForm contact={editing} onDone={() => setEditing(null)} industries={industryNames} /> : null}
        </SlideOverContent>
      </SlideOver>
    </div>
  );
}

function SortDropdown({
  value,
  onChange,
  disabled,
}: {
  value: SortOption;
  onChange: (v: SortOption) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SortOption)}
      disabled={disabled}
      title={disabled ? "Sort by clicking column headers in table view" : "Sort contacts"}
      style={{
        padding: "8px 30px 8px 12px",
        background: "var(--cream-light)",
        border: "1px solid var(--hair)",
        borderRadius: 8,
        color: disabled ? "var(--ink-faint)" : "var(--ink)",
        fontSize: 13,
        fontFamily: "inherit",
        appearance: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        backgroundImage:
          "linear-gradient(45deg, transparent 50%, var(--ink-soft) 50%), linear-gradient(135deg, var(--ink-soft) 50%, transparent 50%)",
        backgroundPosition: "calc(100% - 14px) 17px, calc(100% - 9px) 17px",
        backgroundSize: "5px 5px",
        backgroundRepeat: "no-repeat",
      }}
    >
      {(Object.keys(SORT_LABEL) as SortOption[]).map((k) => (
        <option key={k} value={k}>Sort: {SORT_LABEL[k]}</option>
      ))}
    </select>
  );
}

function QuickChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "5px 11px", fontSize: 12,
        background: active ? "var(--ink)" : "var(--cream-light)",
        color: active ? "var(--cream)" : "var(--ink-soft)",
        border: active ? "1px solid var(--ink)" : "1px solid var(--hair)",
        borderRadius: 999, cursor: "pointer",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  const baseBtn: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "5px 10px", fontSize: 12,
    background: "transparent", border: "none", cursor: "pointer",
    color: "var(--ink-soft)", borderRadius: 6,
  };
  const active: React.CSSProperties = { background: "var(--paper)", color: "var(--ink)", boxShadow: "0 0 0 1px var(--hair)" };
  return (
    <div style={{ display: "inline-flex", padding: 3, background: "var(--cream-light)", border: "1px solid var(--hair)", borderRadius: 8 }}>
      <button onClick={() => onChange("cards")} style={{ ...baseBtn, ...(value === "cards" ? active : {}) }}>
        <LayoutGrid className="h-3.5 w-3.5" /> Cards
      </button>
      <button onClick={() => onChange("table")} style={{ ...baseBtn, ...(value === "table" ? active : {}) }}>
        <TableIcon className="h-3.5 w-3.5" /> Table
      </button>
    </div>
  );
}

function SortableTh({
  label,
  sortKey,
  current,
  dir,
  onClick,
  width,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onClick: (key: SortKey) => void;
  width?: number;
}) {
  const active = current === sortKey;
  return (
    <th
      className="mono"
      style={{
        textAlign: "left", padding: "12px 16px", fontSize: 10,
        letterSpacing: "0.24em", color: active ? "var(--ink)" : "var(--ink-faint)",
        fontWeight: 400, cursor: "pointer", userSelect: "none", width,
      }}
      onClick={() => onClick(sortKey)}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        {label}
        {active ? (dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null}
      </span>
    </th>
  );
}

function Td({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <td
      title={title}
      style={{
        padding: "12px 16px", fontSize: 13.5, color: "var(--ink)",
        verticalAlign: "middle", whiteSpace: "nowrap",
        overflow: "hidden", textOverflow: "ellipsis", maxWidth: 0,
      }}
    >
      {children}
    </td>
  );
}

function LoadMore({ remaining, pageSize, onClick }: { remaining: number; pageSize: number; onClick: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
      <button
        onClick={onClick}
        style={{
          background: "var(--cream-light)", border: "1px solid var(--hair)",
          borderRadius: 8, padding: "10px 18px", fontSize: 13,
          cursor: "pointer", color: "var(--ink)",
        }}
      >
        Load {Math.min(pageSize, remaining)} more
      </button>
    </div>
  );
}
