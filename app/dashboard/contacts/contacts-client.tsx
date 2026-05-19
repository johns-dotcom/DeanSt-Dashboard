"use client";

import { useMemo, useState } from "react";
import { Plus, Users, Mail, Phone } from "lucide-react";
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

const PAGE_SIZE = 120;
const UNCATEGORIZED = "__uncat__";

export function ContactsClient({ contacts }: { contacts: Contact[] }) {
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

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

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return contacts.filter((c) => {
      if (filter !== "all") {
        if (filter === UNCATEGORIZED) {
          if (c.industry) return false;
        } else if (c.industry !== filter) {
          return false;
        }
      }
      if (q && !`${c.name} ${c.role ?? ""} ${c.email ?? ""} ${c.industry ?? ""} ${(c.clients ?? []).join(" ")}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [contacts, filter, query]);

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

  return (
    <div style={{ padding: "32px 48px 60px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Input
          placeholder="Search by name, role, brand, email…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPageSize(PAGE_SIZE); }}
          className="max-w-xs"
        />
        <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>
          {filtered.length} of {contacts.length} contacts
        </span>
      </div>

      <FilterPills<string>
        value={filter}
        options={pillOptions}
        onChange={(v) => { setFilter(v); setPageSize(PAGE_SIZE); }}
      />

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
          description="Try a different category or search term."
        />
      ) : (
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
                        style={{
                          fontSize: 9,
                          letterSpacing: "0.18em",
                          padding: "2px 7px",
                          borderRadius: 999,
                          background: "rgba(10,58,28,0.10)",
                          color: "var(--sign-green)",
                        }}
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
            <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
              <button
                onClick={() => setPageSize((p) => p + PAGE_SIZE)}
                style={{
                  background: "var(--cream-light)",
                  border: "1px solid var(--hair)",
                  borderRadius: 8,
                  padding: "10px 18px",
                  fontSize: 13,
                  cursor: "pointer",
                  color: "var(--ink)",
                }}
              >
                Load {Math.min(PAGE_SIZE, filtered.length - pageSize)} more
              </button>
            </div>
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
