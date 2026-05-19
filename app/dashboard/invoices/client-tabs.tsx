"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SlideOver, SlideOverContent } from "@/components/dashboard/slide-over";
import { createClientPage, renameClientPage, deleteClientPage } from "./client-pages-actions";
import type { InvoiceClientPage } from "@/lib/db/schema";

export function ClientTabs({
  pages,
  activeSlug,
}: {
  pages: InvoiceClientPage[];
  activeSlug: string | null;
}) {
  const router = useRouter();
  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<InvoiceClientPage | null>(null);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name is required"); return; }
    startTransition(async () => {
      const r = await createClientPage({ name });
      if ("error" in r && r.error) { toast.error(r.error); return; }
      toast.success(`Added "${name}"`);
      setName("");
      setOpenNew(false);
      router.push(`/dashboard/invoices/c/${r.slug}`);
    });
  }

  function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || !name.trim()) { toast.error("Name is required"); return; }
    const targetId = editing.id;
    const newName = name.trim();
    startTransition(async () => {
      const r = await renameClientPage({ id: targetId, name: newName });
      if ("error" in r && r.error) { toast.error(r.error); return; }
      toast.success("Renamed");
      setEditing(null);
      if (activeSlug && r.slug && r.slug !== activeSlug) {
        router.push(`/dashboard/invoices/c/${r.slug}`);
      } else {
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!editing) return;
    if (!confirm(`Delete client page "${editing.name}"? Its invoices stay intact — only this view is removed.`)) return;
    const targetId = editing.id;
    const wasActive = activeSlug === editing.slug;
    startTransition(async () => {
      await deleteClientPage(targetId);
      toast.success("Client page deleted");
      setEditing(null);
      if (wasActive) router.push("/dashboard/invoices");
      else router.refresh();
    });
  }

  const tabBase: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    fontSize: 13.5,
    fontWeight: 500,
    background: "var(--cream-light)",
    color: "var(--ink-soft)",
    border: "1px solid var(--hair)",
    borderRadius: 999,
    textDecoration: "none",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
  const tabActive: React.CSSProperties = {
    background: "var(--ink)",
    color: "var(--cream)",
    borderColor: "var(--ink)",
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Link href="/dashboard/invoices" style={{ ...tabBase, ...(activeSlug === null ? tabActive : {}) }}>
          All invoices
        </Link>
        {pages.map((p) => {
          const active = p.slug === activeSlug;
          return (
            <div key={p.id} style={{ display: "inline-flex", alignItems: "center", gap: 0 }}>
              <Link href={`/dashboard/invoices/c/${p.slug}`} style={{ ...tabBase, ...(active ? tabActive : {}), borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: "none", paddingRight: 8 }}>
                {p.name}
              </Link>
              <button
                onClick={(e) => { e.preventDefault(); setEditing(p); setName(p.name); }}
                title="Edit page"
                style={{
                  ...tabBase,
                  ...(active ? tabActive : {}),
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                  paddingLeft: 6,
                  paddingRight: 10,
                }}
              >
                <Pencil className="h-3 w-3" />
              </button>
            </div>
          );
        })}
        <button
          onClick={() => { setName(""); setOpenNew(true); }}
          style={{
            ...tabBase,
            background: "transparent",
            borderStyle: "dashed",
            color: "var(--ink-soft)",
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Add client
        </button>
      </div>

      <SlideOver open={openNew} onOpenChange={(v) => { setOpenNew(v); if (!v) setName(""); }}>
        <SlideOverContent title="New client page" description="Pin a client as a tab on the invoices page.">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="cp-name">Client name</Label>
              <Input
                id="cp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Boom Records"
                autoFocus
                required
              />
              <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>
                Invoices on this tab will match where Bill To contains this name. New invoices created here will pre-fill the Bill To.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setOpenNew(false)}>Cancel</Button>
              <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create"}</Button>
            </div>
          </form>
        </SlideOverContent>
      </SlideOver>

      <SlideOver open={Boolean(editing)} onOpenChange={(v) => { if (!v) { setEditing(null); setName(""); } }}>
        <SlideOverContent title="Edit client page" description="Rename or remove this tab.">
          <form onSubmit={handleRename} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="cp-edit-name">Client name</Label>
              <Input
                id="cp-edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Button type="button" variant="ghost" onClick={handleDelete} disabled={pending}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                  <X className="h-3.5 w-3.5" /> Cancel
                </Button>
                <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
              </div>
            </div>
          </form>
        </SlideOverContent>
      </SlideOver>
    </>
  );
}
