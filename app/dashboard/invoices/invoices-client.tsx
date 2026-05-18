"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Eye, Download, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge, statusBadgeTone } from "@/components/dashboard/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterPills } from "@/components/dashboard/filter-pills";
import { EmptyState } from "@/components/dashboard/empty-state";
import { SlideOver, SlideOverContent } from "@/components/dashboard/slide-over";
import { InvoiceForm } from "./invoice-form";
import { InvoicePreview } from "./invoice-preview";
import { deleteInvoice } from "./actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice } from "@/lib/db/schema";

type Filter = "all" | "invoice" | "reimbursement" | "overdue";

export function InvoicesClient({
  invoices,
  workspaceName,
  paymentTerms,
}: {
  invoices: Invoice[];
  workspaceName: string;
  paymentTerms: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [previewing, setPreviewing] = useState<Invoice | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return invoices.filter((inv) => {
      if (filter === "invoice" && inv.type !== "invoice") return false;
      if (filter === "reimbursement" && inv.type !== "reimbursement") return false;
      if (filter === "overdue" && inv.status !== "overdue") return false;
      if (q && !`${inv.client} ${inv.invoiceNumber} ${inv.description ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [invoices, filter, query]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = (d: string) => {
      const dt = new Date(d);
      return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
    };
    return {
      outstanding: invoices.filter((i) => ["pending", "overdue"].includes(i.status)).reduce((s, i) => s + Number(i.total), 0),
      overdue: invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + Number(i.total), 0),
      paidThisMonth: invoices.filter((i) => i.status === "paid" && thisMonth(i.issuedDate)).reduce((s, i) => s + Number(i.total), 0),
      reimbursementsPending: invoices.filter((i) => i.type === "reimbursement" && i.status !== "paid").reduce((s, i) => s + Number(i.total), 0),
    };
  }, [invoices]);

  function handleDelete(inv: Invoice) {
    if (!confirm(`Delete invoice ${inv.invoiceNumber}?`)) return;
    startTransition(async () => {
      const r = await deleteInvoice(inv.id);
      void r;
      toast.success("Invoice deleted");
      if (previewing?.id === inv.id) setPreviewing(null);
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Outstanding" value={formatCurrency(stats.outstanding)} />
        <StatCard label="Overdue" value={formatCurrency(stats.overdue)} />
        <StatCard label="Paid this month" value={formatCurrency(stats.paidThisMonth)} />
        <StatCard label="Reimbursements pending" value={formatCurrency(stats.reimbursementsPending)} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <Input
            placeholder="Search by client, number, description…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-xs"
          />
          <FilterPills<Filter>
            value={filter}
            options={[
              { value: "all", label: "All" },
              { value: "invoice", label: "Invoices" },
              { value: "reimbursement", label: "Reimbursements" },
              { value: "overdue", label: "Overdue" },
            ]}
            onChange={setFilter}
          />
        </div>
        <SlideOver open={openNew} onOpenChange={setOpenNew}>
          <Button onClick={() => setOpenNew(true)}>
            <Plus className="h-4 w-4" /> New invoice
          </Button>
          <SlideOverContent title="New invoice" description="Add a billable invoice or reimbursement.">
            <InvoiceForm onDone={() => setOpenNew(false)} />
          </SlideOverContent>
        </SlideOver>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-4 w-4" />}
          title={invoices.length === 0 ? "No invoices yet" : "No matching invoices"}
          description={invoices.length === 0 ? "Create your first invoice to start tracking revenue." : "Try a different filter or search."}
          action={invoices.length === 0 ? <Button onClick={() => setOpenNew(true)}><Plus className="h-4 w-4" /> New invoice</Button> : null}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border-hairline border-border bg-surface">
          <table className="w-full text-sm table-row-hover" style={{ tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "108px" }} />
              <col />
              <col style={{ width: "120px" }} />
              <col />
              <col style={{ width: "120px" }} />
              <col style={{ width: "110px" }} />
              <col style={{ width: "110px" }} />
              <col style={{ width: "110px" }} />
              <col style={{ width: "92px" }} />
            </colgroup>
            <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">#</th>
                <th className="px-3 py-2 text-left font-medium">Client</th>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-left font-medium">Description</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th className="px-3 py-2 text-left font-medium">Issued</th>
                <th className="px-3 py-2 text-left font-medium">Due</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} className="border-t-hairline border-border">
                  <td className="px-3 py-2 font-mono text-xs">{inv.invoiceNumber}</td>
                  <td className="px-3 py-2 truncate cursor-pointer" onClick={() => setEditing(inv)}>{inv.client}</td>
                  <td className="px-3 py-2"><Badge tone={statusBadgeTone[inv.type]}>{inv.type}</Badge></td>
                  <td className="px-3 py-2 truncate text-muted-foreground">{inv.description}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(Number(inv.total))}</td>
                  <td className="px-3 py-2 text-muted-foreground">{formatDate(inv.issuedDate)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{formatDate(inv.dueDate)}</td>
                  <td className="px-3 py-2"><Badge tone={statusBadgeTone[inv.status]}>{inv.status}</Badge></td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button className="rounded p-1 text-muted-foreground hover:bg-hover hover:text-foreground" onClick={() => setPreviewing(inv)} aria-label="Preview">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <a
                        href={`/api/invoices/${inv.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded p-1 text-muted-foreground hover:bg-hover hover:text-foreground"
                        aria-label="Download PDF"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      <button className="rounded p-1 text-muted-foreground hover:bg-hover hover:text-foreground" onClick={() => handleDelete(inv)} aria-label="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {previewing ? (
        <div className="rounded-lg border-hairline border-border bg-surface p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium">Preview · {previewing.invoiceNumber}</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={`/api/invoices/${previewing.id}/pdf`} target="_blank" rel="noopener noreferrer">
                  <Download className="h-3.5 w-3.5" /> Download PDF
                </a>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setPreviewing(null)}>Close</Button>
            </div>
          </div>
          <InvoicePreview invoice={previewing} workspaceName={workspaceName} paymentTerms={paymentTerms} />
        </div>
      ) : null}

      <SlideOver open={Boolean(editing)} onOpenChange={(v) => !v && setEditing(null)}>
        <SlideOverContent title={`Edit ${editing?.invoiceNumber ?? ""}`} description="Update invoice details.">
          {editing ? <InvoiceForm invoice={editing} onDone={() => setEditing(null)} /> : null}
        </SlideOverContent>
      </SlideOver>
    </div>
  );
}
