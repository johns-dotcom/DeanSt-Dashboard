"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateDisplayName } from "./actions";

export function ProfileForm({ displayName }: { displayName: string }) {
  const [name, setName] = useState(displayName);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const r = await updateDisplayName(name);
      if ("error" in r && r.error) toast.error(r.error); else toast.success("Profile updated");
    });
  }

  return (
    <div className="flex items-end gap-3">
      <div className="flex-1 space-y-1">
        <Label htmlFor="dn">Display name</Label>
        <Input id="dn" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <Button onClick={save} disabled={pending || name === displayName}>{pending ? "Saving…" : "Save"}</Button>
    </div>
  );
}
