"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createInvoice, updateInvoice } from "./actions";
import type { Invoice, InvoiceStatus, InvoiceType, LineItem } from "@/lib/db/schema";

const defaultLine = (): LineItem => ({ description: "", quantity: 1, rate: 0, amount: 0 });

export function InvoiceForm({ invoice, onDone }: { invoice?: Invoice; onDone: () => void }) {
  const [client, setClient] = useState(invoice?.client ?? "");
  const [type, setType] = useState<InvoiceType>(invoice?.type ?? "invoice");
  const [description, setDescription] = useState(invoice?.description ?? "");
  const [items, setItems] = useState<LineItem[]>(invoice?.lineItems?.length ? invoice.lineItems : [defaultLine()]);
  const [taxRate, setTaxRate] = useState(invoice ? Number(invoice.taxRate) : 0);
  const [issuedDate, setIssuedDate] = useState(invoice?.issuedDate ?? new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(invoice?.dueDate ?? "");
  const [status, setStatus] = useState<InvoiceStatus>(invoice?.status ?? "draft");
  const [pending, startTransition] = useTransition();

  function updateItem(idx: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const next = { ...it, ...patch };
      next.amount = Number((next.quantity * next.rate).toFixed(2));
      return next;
    }));
  }

  function addItem() { setItems((p) => [...p, defaultLine()]); }
  function removeItem(idx: number) { setItems((p) => (p.length === 1 ? p : p.filter((_, i) => i !== idx))); }

  const subtotal = items.reduce((s, i) => s + (i.amount || i.quantity * i.rate), 0);
  const total = subtotal * (1 + Number(taxRate) / 100);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!client.trim()) { toast.error("Client is required"); return; }
    if (items.some((it) => !it.description.trim())) { toast.error("Each line item needs a description"); return; }

    startTransition(async () => {
      const payload = {
        client: client.trim(),
        type,
        description: description.trim() || null,
        line_items: items,
        tax_rate: Number(taxRate),
        issued_date: issuedDate,
        due_date: dueDate || null,
        status,
      };
      const result = invoice ? await updateInvoice(invoice.id, payload) : await createInvoice(payload);
      if ("error" in result && result.error) { toast.error(result.error); return; }
      toast.success(invoice ? "Invoice updated" : "Invoice created");
      onDone();
    });
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 col-span-2">
          <Label htmlFor="client">Client</Label>
          <Input id="client" value={client} onChange={(e) => setClient(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as InvoiceType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="invoice">Invoice</SelectItem>
              <SelectItem value="reimbursement">Reimbursement</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as InvoiceStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="issued">Issued</Label>
          <Input id="issued" type="date" value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="due">Due</Label>
          <Input id="due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="space-y-1 col-span-2">
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Line items</Label>
          <Button type="button" variant="ghost" size="sm" onClick={addItem}><Plus className="h-3.5 w-3.5" /> Add row</Button>
        </div>
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2">
              <Input
                className="col-span-6"
                placeholder="Description"
                value={it.description}
                onChange={(e) => updateItem(idx, { description: e.target.value })}
              />
              <Input
                className="col-span-2"
                type="number"
                step="0.01"
                min="0"
                placeholder="Qty"
                value={it.quantity}
                onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
              />
              <Input
                className="col-span-2"
                type="number"
                step="0.01"
                min="0"
                placeholder="Rate"
                value={it.rate}
                onChange={(e) => updateItem(idx, { rate: Number(e.target.value) })}
              />
              <div className="col-span-2 flex items-center justify-end gap-1">
                <span className="text-sm tabular-nums">{(it.amount || it.quantity * it.rate).toFixed(2)}</span>
                <button type="button" onClick={() => removeItem(idx)} className="rounded p-1 text-muted-foreground hover:bg-hover">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 border-t-hairline border-border pt-3">
        <div className="space-y-1">
          <Label htmlFor="tax">Tax %</Label>
          <Input id="tax" type="number" step="0.01" min="0" max="100" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
        </div>
        <div className="col-span-2 space-y-1 text-right text-sm tabular-nums">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{(subtotal * Number(taxRate) / 100).toFixed(2)}</span></div>
          <div className="flex justify-between font-medium"><span>Total</span><span>{total.toFixed(2)}</span></div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : invoice ? "Save changes" : "Create invoice"}</Button>
      </div>
    </form>
  );
}
