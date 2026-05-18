"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createDeal, updateDeal } from "./actions";
import type { Deal, DealStatus, DealType } from "@/lib/db/schema";

export function DealForm({ deal, onDone }: { deal?: Deal; onDone: () => void }) {
  const [artist, setArtist] = useState(deal?.artist ?? "");
  const [type, setType] = useState<DealType>(deal?.type ?? "recording");
  const [counterparty, setCounterparty] = useState(deal?.counterparty ?? "");
  const [value, setValue] = useState<number>(Number(deal?.value ?? 0));
  const [startDate, setStartDate] = useState(deal?.startDate ?? "");
  const [endDate, setEndDate] = useState(deal?.endDate ?? "");
  const [status, setStatus] = useState<DealStatus>(deal?.status ?? "negotiating");
  const [notes, setNotes] = useState(deal?.notes ?? "");
  const [pending, startTransition] = useTransition();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!artist.trim() || !counterparty.trim()) {
      toast.error("Artist and counterparty are required");
      return;
    }
    startTransition(async () => {
      const payload = {
        artist: artist.trim(),
        type,
        counterparty: counterparty.trim(),
        value,
        start_date: startDate || null,
        end_date: endDate || null,
        status,
        notes: notes.trim() || null,
      };
      const r = deal ? await updateDeal(deal.id, payload) : await createDeal(payload);
      if ("error" in r && r.error) { toast.error(r.error); return; }
      toast.success(deal ? "Deal updated" : "Deal created");
      onDone();
    });
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label htmlFor="artist">Artist</Label>
          <Input id="artist" value={artist} onChange={(e) => setArtist(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as DealType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recording">Recording</SelectItem>
              <SelectItem value="brand">Brand</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as DealStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="negotiating">Negotiating</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-1">
          <Label htmlFor="cp">Counterparty</Label>
          <Input id="cp" value={counterparty} onChange={(e) => setCounterparty(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="val">Value</Label>
          <Input id="val" type="number" step="0.01" min="0" value={value} onChange={(e) => setValue(Number(e.target.value))} />
        </div>
        <div className="space-y-1" />
        <div className="space-y-1">
          <Label htmlFor="sd">Start date</Label>
          <Input id="sd" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ed">End date</Label>
          <Input id="ed" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="col-span-2 space-y-1">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : deal ? "Save changes" : "Create deal"}</Button>
      </div>
    </form>
  );
}
