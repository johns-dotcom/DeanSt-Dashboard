"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateWorkspace } from "./actions";
import type { Workspace } from "@/lib/db/schema";

export function AuthSettings({ workspace, disabled }: { workspace: Workspace; disabled: boolean }) {
  const [restrict, setRestrict] = useState(Boolean(workspace.domainRestriction));
  const [domain, setDomain] = useState(workspace.domainRestriction ?? "deanst.co");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const r = await updateWorkspace({
        name: workspace.name,
        invoice_prefix: workspace.invoicePrefix,
        default_payment_terms: workspace.defaultPaymentTerms,
        domain_restriction: restrict ? domain.trim() : null,
      });
      if ("error" in r && r.error) toast.error(r.error); else toast.success("Auth settings updated");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm">Google SSO</div>
          <div className="text-xs text-muted-foreground">Sign in with Google is always enabled. Configure the OAuth client in Google Cloud Console.</div>
        </div>
        <Switch checked disabled />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm">Restrict to email domain</div>
            <div className="text-xs text-muted-foreground">Only allow Google sign-in from this domain.</div>
          </div>
          <Switch checked={restrict} onCheckedChange={setRestrict} disabled={disabled} />
        </div>
        {restrict ? (
          <div className="space-y-1">
            <Label htmlFor="dom">Domain</Label>
            <Input id="dom" value={domain} onChange={(e) => setDomain(e.target.value)} disabled={disabled} />
          </div>
        ) : null}
      </div>
      <div className="flex justify-end">
        <Button onClick={save} disabled={pending || disabled}>{pending ? "Saving…" : "Save"}</Button>
      </div>
    </div>
  );
}
