"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DocumentFolder } from "@/lib/db/schema";

const CATEGORIES = ["Legal", "Admin", "Brand Deals", "Press", "Finance", "Other"];

export function UploadForm({
  workspaceId,
  clients,
  folders = [],
  defaultClient,
  defaultSubcategory,
  onDone,
}: {
  workspaceId: string;
  clients: string[];
  folders?: DocumentFolder[];
  defaultClient?: string;
  defaultSubcategory?: string;
  onDone: () => void;
}) {
  void workspaceId; // path is derived server-side
  const router = useRouter();
  const initialClient = defaultClient ?? clients[0] ?? "";
  const [client, setClient] = useState(initialClient);
  const [newClient, setNewClient] = useState("");
  const [category, setCategory] = useState("Legal");
  const [subcategory, setSubcategory] = useState(defaultSubcategory ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const activeClient = (newClient.trim() || client).trim();
  const folderOptions = useMemo(
    () => folders.filter((f) => f.client === activeClient).map((f) => f.name).sort(),
    [folders, activeClient]
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clientName = activeClient;
    if (!clientName) { toast.error("Client is required"); return; }
    if (!file) { toast.error("Pick a file"); return; }

    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("client", clientName);
      form.append("category", category);
      if (subcategory.trim()) form.append("subcategory", subcategory.trim());

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
        <Label>Client</Label>
        {clients.length > 0 ? (
          <Select value={client} onValueChange={setClient}>
            <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
            <SelectContent>
              {clients.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : null}
        <Input
          placeholder={clients.length ? "Or type a new client" : "Client name"}
          value={newClient}
          onChange={(e) => setNewClient(e.target.value)}
          className="mt-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="sub">Subfolder</Label>
          {folderOptions.length > 0 ? (
            <Select value={subcategory} onValueChange={setSubcategory}>
              <SelectTrigger><SelectValue placeholder="Pick or type below" /></SelectTrigger>
              <SelectContent>
                {folderOptions.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : null}
          <Input
            id="sub"
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            placeholder={folderOptions.length ? "Or type a new subfolder" : "e.g. Contracts"}
            className={folderOptions.length ? "mt-2" : ""}
          />
        </div>
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
