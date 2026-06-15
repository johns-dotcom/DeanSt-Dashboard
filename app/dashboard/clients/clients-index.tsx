"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Folder, ChevronRight, FolderPlus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/empty-state";
import { createClient, renameClient, deleteClient } from "./actions";
import { cn } from "@/lib/utils";
import type { Client } from "@/lib/db/schema";

const FOLDER_COLORS = [
  "text-rose-500", "text-amber-500", "text-emerald-500",
  "text-sky-500", "text-violet-500", "text-orange-500",
];
function folderColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return FOLDER_COLORS[Math.abs(hash) % FOLDER_COLORS.length];
}

export function ClientsIndex({
  clients,
  counts,
}: {
  clients: Client[];
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? clients.filter((c) => c.name.toLowerCase().includes(q)) : clients;
  }, [clients, query]);

  function handleNewClient() {
    const name = window.prompt("New client name")?.trim();
    if (!name) return;
    startTransition(async () => {
      const r = await createClient({ name });
      if ("error" in r && r.error) { toast.error(r.error); return; }
      toast.success(`Client “${name}” created`);
      if ("slug" in r && r.slug) router.push(`/dashboard/clients/${r.slug}`);
    });
  }
  function handleRename(c: Client) {
    const next = window.prompt(`Rename “${c.name}”`, c.name)?.trim();
    if (!next || next === c.name) return;
    startTransition(async () => {
      const r = await renameClient({ id: c.id, name: next });
      if ("error" in r && r.error) toast.error(r.error); else toast.success("Client renamed");
    });
  }
  function handleDelete(c: Client) {
    if (!confirm(`Delete client “${c.name}”? It must be empty.`)) return;
    startTransition(async () => {
      const r = await deleteClient(c.id);
      if ("error" in r && r.error) toast.error(r.error); else toast.success("Client deleted");
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients…"
            className="h-9 w-64 rounded-lg border-hairline border-border bg-surface pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          />
        </div>
        <Button onClick={handleNewClient} disabled={pending}><FolderPlus className="h-4 w-4" /> New client</Button>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          icon={<Folder className="h-4 w-4" />}
          title="No clients yet"
          description="Create a client to start organizing their files into folders."
          action={<Button onClick={handleNewClient}><FolderPlus className="h-4 w-4" /> New client</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Search className="h-4 w-4" />} title="No matches" description={`No clients match “${query}”.`} />
      ) : (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
          {filtered.map((c) => {
            const count = counts[c.id] ?? 0;
            return (
              <div key={c.id} className="group relative flex items-center gap-3 rounded-lg border-hairline border-border bg-surface p-4 transition-colors hover:bg-hover">
                <Link href={`/dashboard/clients/${c.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Folder className={cn("h-5 w-5 flex-none", folderColor(c.id))} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{count} item{count === 1 ? "" : "s"}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 flex-none text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
                <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button onClick={() => handleRename(c)} disabled={pending} aria-label="Rename" title="Rename" className="rounded bg-surface p-1 text-muted-foreground transition-colors hover:bg-hover hover:text-foreground disabled:opacity-50">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(c)} disabled={pending} aria-label="Delete" title="Delete" className="rounded bg-surface p-1 text-muted-foreground transition-colors hover:bg-hover hover:text-foreground disabled:opacity-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
