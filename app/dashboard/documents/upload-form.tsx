"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORIES = ["Legal", "Admin", "Brand Deals", "Press", "Finance", "Other"];

export function UploadForm({
  workspaceId,
  client,
  folderId,
  destinationLabel,
  onDone,
}: {
  workspaceId: string;
  client: string;
  folderId: string | null;
  destinationLabel: string;
  onDone: () => void;
}) {
  void workspaceId; // path is derived server-side
  const router = useRouter();
  const [category, setCategory] = useState("Other");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { toast.error("Pick a file"); return; }

    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("client", client);
      form.append("category", category);
      if (folderId) form.append("folder_id", folderId);

      const res = await fetch("/api/upload/document", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `Upload failed (${res.status})` }));
        throw new Error(body.error ?? `Upload failed (${res.status})`);
      }

      toast.success("File uploaded");
      router.refresh();
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="space-y-1">
        <Label>Destination</Label>
        <div className="rounded-md border-hairline border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {destinationLabel}
        </div>
      </div>

      <div className="space-y-1">
        <Label>Category (tag)</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="file">File</Label>
        <Input id="file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone} disabled={busy}>Cancel</Button>
        <Button type="submit" disabled={busy}>{busy ? "Uploading…" : "Upload"}</Button>
      </div>
    </form>
  );
}
