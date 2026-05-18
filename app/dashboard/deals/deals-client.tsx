"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Briefcase, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge, statusBadgeTone } from "@/components/dashboard/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterPills } from "@/components/dashboard/filter-pills";
import { EmptyState } from "@/components/dashboard/empty-state";
import { SlideOver, SlideOverContent } from "@/components/dashboard/slide-over";
import { DealForm } from "./deal-form";
import { deleteDeal } from "./actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Deal } from "@/lib/db/schema";

type Filter = "all" | "recording" | "brand" | "active" | "closed" | "negotiating";

export function DealsClient({ deals }: { deals: Deal[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return deals.filter((d) => {
      if (["recording", "brand"].includes(filter) && d.type !== filter) return false;
      if (["active", "closed", "negotiating"].includes(filter) && d.status !== filter) return false;
      if (q && !`${d.artist} ${d.counterparty} ${d.notes ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [deals, filter, query]);

  const stats = useMemo(() => {
    const year = new Date().getFullYear();
    return {
      total: deals.reduce((s, d) => s + Number(d.value), 0),
      recording: deals.filter((d) => d.type === "recording").length,
      brand: deals.filter((d) => d.type === "brand").length,
      closedThisYear: deals.filter((d) => d.status === "closed" && (d.endDate ? new Date(d.endDate).getFullYear() === year : true)).length,
    };
  }, [deals]);

  function handleDelete(deal: Deal) {
    if (!confirm(`Delete deal with ${deal.counterparty}?`)) return;
    startTransition(async () => {
      const r = await deleteDeal(deal.id);
      void r;
      toast.success("Deal deleted");
      setEditing(null);
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total deal value" value={formatCurrency(stats.total)} />
        <StatCard label="Recording deals" value={String(stats.recording)} />
        <StatCard label="Brand deals" value={String(stats.brand)} />
        <StatCard label="Closed this year" value={String(stats.closedThisYear)} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <Input placeholder="Search by artist, counterparty, notes…" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-xs" />
          <FilterPills<Filter>
            value={filter}
            options={[
              { value: "all", label: "All" },
              { value: "recording", label: "Recording" },
              { value: "brand", label: "Brand" },
              { value: "active", label: "Active" },
              { value: "closed", label: "Closed" },
              { value: "negotiating", label: "Negotiating" },
            ]}
            onChange={setFilter}
          />
        </div>
        <SlideOver open={openNew} onOpenChange={setOpenNew}>
          <Button onClick={() => setOpenNew(true)}><Plus className="h-4 w-4" /> New deal</Button>
          <SlideOverContent title="New deal" description="Add a recording or brand deal.">
            <DealForm onDone={() => setOpenNew(false)} />
          </SlideOverContent>
        </SlideOver>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-4 w-4" />}
          title={deals.length === 0 ? "No deals yet" : "No matching deals"}
          description={deals.length === 0 ? "Track your recording and brand deal pipeline here." : "Try a different filter or search."}
          action={deals.length === 0 ? <Button onClick={() => setOpenNew(true)}><Plus className="h-4 w-4" /> New deal</Button> : null}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border-hairline border-border bg-surface">
          <table className="w-full text-sm table-row-hover">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Artist</th>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-left font-medium">Counterparty</th>
                <th className="px-3 py-2 text-right font-medium">Value</th>
                <th className="px-3 py-2 text-left font-medium">Start</th>
                <th className="px-3 py-2 text-left font-medium">End</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Notes</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="cursor-pointer border-t-hairline border-border" onClick={() => setEditing(d)}>
                  <td className="px-3 py-2 font-medium">{d.artist}</td>
                  <td className="px-3 py-2"><Badge tone={statusBadgeTone[d.type]}>{d.type}</Badge></td>
                  <td className="px-3 py-2">{d.counterparty}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(Number(d.value))}</td>
                  <td className="px-3 py-2 text-muted-foreground">{formatDate(d.startDate)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{formatDate(d.endDate)}</td>
                  <td className="px-3 py-2"><Badge tone={statusBadgeTone[d.status]}>{d.status}</Badge></td>
                  <td className="px-3 py-2 truncate text-muted-foreground">{d.notes}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(d); }}
                      className="rounded p-1 text-muted-foreground hover:bg-hover hover:text-foreground"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SlideOver open={Boolean(editing)} onOpenChange={(v) => !v && setEditing(null)}>
        <SlideOverContent title="Edit deal" description="Update deal details.">
          {editing ? <DealForm deal={editing} onDone={() => setEditing(null)} /> : null}
        </SlideOverContent>
      </SlideOver>
    </div>
  );
}
