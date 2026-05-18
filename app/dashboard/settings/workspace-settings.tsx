"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateWorkspace } from "./actions";
import type { Workspace } from "@/lib/db/schema";

const PAYMENT_TERMS = ["Net 15", "Net 30", "Net 45", "Net 60", "Due on receipt"];

export function WorkspaceSettings({ workspace, disabled }: { workspace: Workspace; disabled: boolean }) {
  const [name, setName] = useState(workspace.name);
  const [prefix, setPrefix] = useState(workspace.invoicePrefix);
  const [terms, setTerms] = useState(workspace.defaultPaymentTerms);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const r = await updateWorkspace({
        name,
        invoice_prefix: prefix,
        default_payment_terms: terms,
        domain_restriction: workspace.domainRestriction,
      });
      if ("error" in r && r.error) toast.error(r.error); else toast.success("Workspace updated");
    });
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2 space-y-1">
        <Label htmlFor="wsname">Workspace name</Label>
        <Input id="wsname" value={name} onChange={(e) => setName(e.target.value)} disabled={disabled} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="prefix">Invoice prefix</Label>
        <Input id="prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} disabled={disabled} />
      </div>
      <div className="space-y-1">
        <Label>Default payment terms</Label>
        <Select value={terms} onValueChange={setTerms} disabled={disabled}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PAYMENT_TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2 flex justify-end">
        <Button onClick={save} disabled={pending || disabled}>{pending ? "Saving…" : "Save"}</Button>
      </div>
    </div>
  );
}
