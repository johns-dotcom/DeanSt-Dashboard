"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function OnboardingForm({ email }: { email: string }) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState("Dean St");
  const [displayName, setDisplayName] = useState(email.split("@")[0] ?? "");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspace_name: workspace, display_name: displayName }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Failed" }));
      toast.error(body.error ?? "Could not create workspace");
      return;
    }
    toast.success("Workspace created");
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form className="space-y-4 rounded-lg border-hairline border-border bg-surface p-6" onSubmit={submit}>
      <div className="space-y-1">
        <Label htmlFor="ws">Workspace name</Label>
        <Input id="ws" value={workspace} onChange={(e) => setWorkspace(e.target.value)} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="dn">Your display name</Label>
        <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
      </div>
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Creating…" : "Create workspace"}</Button>
    </form>
  );
}
