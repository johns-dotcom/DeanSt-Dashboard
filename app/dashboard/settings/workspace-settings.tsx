"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateWorkspace } from "./actions";
import type { Workspace } from "@/lib/db/schema";

const PAYMENT_TERMS = ["Net 15", "Net 30", "Net 45", "Net 60", "Due on receipt"];

export function WorkspaceSettings({ workspace, disabled }: { workspace: Workspace; disabled: boolean }) {
  const [name, setName] = useState(workspace.name);
  const [prefix, setPrefix] = useState(workspace.invoicePrefix);
  const [terms, setTerms] = useState(workspace.defaultPaymentTerms);
  // Invoice "Funds payable to" block — one source of truth for preview + PDF.
  const [entityName, setEntityName] = useState(workspace.invoiceEntityName);
  const [contactName, setContactName] = useState(workspace.invoiceContactName);
  const [contactEmail, setContactEmail] = useState(workspace.invoiceContactEmail);
  const [bankName, setBankName] = useState(workspace.invoiceBankName);
  const [bankAddress, setBankAddress] = useState(workspace.invoiceBankAddress);
  const [accountNumber, setAccountNumber] = useState(workspace.invoiceAccountNumber);
  const [routingNumber, setRoutingNumber] = useState(workspace.invoiceRoutingNumber);
  const [payeeName, setPayeeName] = useState(workspace.invoicePayeeName);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const r = await updateWorkspace({
        name,
        invoice_prefix: prefix,
        default_payment_terms: terms,
        invoice_entity_name: entityName,
        invoice_contact_name: contactName,
        invoice_contact_email: contactEmail,
        invoice_bank_name: bankName,
        invoice_bank_address: bankAddress,
        invoice_account_number: accountNumber,
        invoice_routing_number: routingNumber,
        invoice_payee_name: payeeName,
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

      <div className="col-span-2 mt-2 border-t pt-4" style={{ borderColor: "var(--hair)" }}>
        <h3 className="text-sm font-semibold">Invoice payment details</h3>
        <p className="text-xs" style={{ color: "var(--ink-faint)" }}>
          Shown in the &ldquo;Funds payable to&rdquo; block on invoice previews and PDFs.
        </p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="entityName">Entity name</Label>
        <Input id="entityName" value={entityName} onChange={(e) => setEntityName(e.target.value)} disabled={disabled} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="payeeName">Payable to</Label>
        <Input id="payeeName" value={payeeName} onChange={(e) => setPayeeName(e.target.value)} disabled={disabled} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="contactName">Contact name</Label>
        <Input id="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} disabled={disabled} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="contactEmail">Contact email</Label>
        <Input id="contactEmail" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} disabled={disabled} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="bankName">Bank name</Label>
        <Input id="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} disabled={disabled} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="bankAddress">Bank address</Label>
        <Textarea id="bankAddress" rows={2} value={bankAddress} onChange={(e) => setBankAddress(e.target.value)} disabled={disabled} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="accountNumber">Account number</Label>
        <Input id="accountNumber" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} disabled={disabled} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="routingNumber">Routing number</Label>
        <Input id="routingNumber" value={routingNumber} onChange={(e) => setRoutingNumber(e.target.value)} disabled={disabled} />
      </div>

      <div className="col-span-2 flex justify-end">
        <Button onClick={save} disabled={pending || disabled}>{pending ? "Saving…" : "Save"}</Button>
      </div>
    </div>
  );
}
