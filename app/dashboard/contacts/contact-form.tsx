"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createContact, updateContact, deleteContact } from "./actions";
import type { Contact } from "@/lib/db/schema";

export function ContactForm({
  contact,
  onDone,
  industries = [],
}: {
  contact?: Contact;
  onDone: () => void;
  industries?: string[];
}) {
  const [name, setName] = useState(contact?.name ?? "");
  const [role, setRole] = useState(contact?.role ?? "");
  const [industry, setIndustry] = useState(contact?.industry ?? "");
  const [customIndustry, setCustomIndustry] = useState("");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [clientsRaw, setClientsRaw] = useState((contact?.clients ?? []).join(", "));
  const [notes, setNotes] = useState(contact?.notes ?? "");
  const [pending, startTransition] = useTransition();

  const showIndustryPicker = industries.length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name is required"); return; }
    startTransition(async () => {
      const finalIndustry = (customIndustry.trim() || industry.trim()) || null;
      const payload = {
        name: name.trim(),
        role: role.trim() || null,
        industry: finalIndustry,
        email: email.trim() || null,
        phone: phone.trim() || null,
        clients: clientsRaw.split(",").map((s) => s.trim()).filter(Boolean),
        notes: notes.trim() || null,
      };
      const r = contact ? await updateContact(contact.id, payload) : await createContact(payload);
      if ("error" in r && r.error) { toast.error(r.error); return; }
      toast.success(contact ? "Contact updated" : "Contact added");
      onDone();
    });
  }

  async function handleDelete() {
    if (!contact) return;
    if (!confirm(`Delete ${contact.name}?`)) return;
    startTransition(async () => {
      const r = await deleteContact(contact.id);
      void r;
      toast.success("Contact deleted");
      onDone();
    });
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="col-span-2 space-y-1">
          <Label htmlFor="role">Role</Label>
          <Input id="role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Director of brand marketing" />
        </div>
        <div className="col-span-2 space-y-1">
          <Label htmlFor="industry">Category</Label>
          {showIndustryPicker ? (
            <Select value={industry || undefined} onValueChange={(v) => { setIndustry(v); setCustomIndustry(""); }}>
              <SelectTrigger><SelectValue placeholder="Pick a category" /></SelectTrigger>
              <SelectContent>
                {industries.map((ind) => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : null}
          <Input
            id="industry"
            value={customIndustry}
            onChange={(e) => setCustomIndustry(e.target.value)}
            placeholder={showIndustryPicker ? "Or type a new category" : "Hotels, Fashion, Beauty, …"}
            className={showIndustryPicker ? "mt-2" : ""}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="col-span-2 space-y-1">
          <Label htmlFor="cls">Brands / Clients (comma-separated)</Label>
          <Input id="cls" value={clientsRaw} onChange={(e) => setClientsRaw(e.target.value)} placeholder="IHG Hotels, Marriott, …" />
        </div>
        <div className="col-span-2 space-y-1">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>
      </div>
      <div className="flex items-center justify-between pt-2">
        {contact ? (
          <Button type="button" variant="ghost" onClick={handleDelete}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
        ) : <span />}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : contact ? "Save changes" : "Add contact"}</Button>
        </div>
      </div>
    </form>
  );
}
