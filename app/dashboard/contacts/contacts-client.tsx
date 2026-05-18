"use client";

import { useMemo, useState } from "react";
import { Plus, Users, Mail, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FilterPills } from "@/components/dashboard/filter-pills";
import { EmptyState } from "@/components/dashboard/empty-state";
import { SlideOver, SlideOverContent } from "@/components/dashboard/slide-over";
import { ContactForm } from "./contact-form";
import { cn } from "@/lib/utils";
import type { Contact, ContactCategory } from "@/lib/db/schema";

const CATEGORY_LABELS: Record<string, string> = {
  legal: "Legal",
  publicist: "Publicist",
  label_rep: "Label rep",
  glam: "Glam",
  management: "Management",
  venue_promoter: "Venue / promoter",
  other: "Other",
};

const AVATAR_COLORS = [
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
  "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200",
];

function avatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

type Filter = "all" | ContactCategory;

export function ContactsClient({ contacts }: { contacts: Contact[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return contacts.filter((c) => {
      if (filter !== "all" && c.category !== filter) return false;
      if (q && !`${c.name} ${c.role ?? ""} ${c.email ?? ""} ${(c.clients ?? []).join(" ")}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [contacts, filter, query]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <Input
            placeholder="Search by name, role, client…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-xs"
          />
          <FilterPills<Filter>
            value={filter}
            options={[
              { value: "all", label: "All" },
              { value: "legal", label: "Legal" },
              { value: "publicist", label: "Publicist" },
              { value: "label_rep", label: "Label rep" },
              { value: "glam", label: "Glam" },
              { value: "management", label: "Management" },
              { value: "venue_promoter", label: "Venue/promoter" },
              { value: "other", label: "Other" },
            ]}
            onChange={setFilter}
          />
        </div>
      </div>

      {filtered.length === 0 && contacts.length === 0 ? (
        <EmptyState
          icon={<Users className="h-4 w-4" />}
          title="No contacts yet"
          description="Track legal, publicists, label reps, and more."
          action={<button onClick={() => setOpenNew(true)} className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"><Plus className="inline h-4 w-4" /> Add contact</button>}
        />
      ) : (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(190px,1fr))]">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => setEditing(c)}
              className="group flex flex-col items-start rounded-lg border-hairline border-border bg-surface p-4 text-left transition-colors hover:bg-hover"
            >
              <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium", avatarColor(c.name))}>
                {initials(c.name) || "?"}
              </span>
              <div className="mt-3 line-clamp-1 text-sm font-medium">{c.name}</div>
              <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{c.role || (c.category ? CATEGORY_LABELS[c.category] : "")}</div>
              {c.clients?.length ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {c.clients.slice(0, 3).map((cl) => (
                    <span key={cl} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{cl}</span>
                  ))}
                </div>
              ) : null}
              <div className="mt-3 flex flex-col gap-0.5 text-[11px] text-muted-foreground">
                {c.email ? <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span> : null}
                {c.phone ? <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span> : null}
              </div>
            </button>
          ))}
          <button
            onClick={() => setOpenNew(true)}
            className="flex min-h-[140px] flex-col items-center justify-center gap-1 rounded-lg border-hairline border-dashed border-border bg-surface text-xs text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            Add contact
          </button>
        </div>
      )}

      <SlideOver open={openNew} onOpenChange={setOpenNew}>
        <SlideOverContent title="New contact" description="Add someone to your team's rolodex.">
          <ContactForm onDone={() => setOpenNew(false)} />
        </SlideOverContent>
      </SlideOver>

      <SlideOver open={Boolean(editing)} onOpenChange={(v) => !v && setEditing(null)}>
        <SlideOverContent title="Edit contact" description="Update contact info.">
          {editing ? <ContactForm contact={editing} onDone={() => setEditing(null)} /> : null}
        </SlideOverContent>
      </SlideOver>
    </div>
  );
}
