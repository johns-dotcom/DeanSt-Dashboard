"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { presignUpload, recordUpload } from "./actions";

const CATEGORIES = ["Legal", "Admin", "Brand Deals", "Press", "Finance", "Other"];

export function UploadForm({
  workspaceId,
  clients,
  onDone,
}: {
  workspaceId: string;
  clients: string[];
  onDone: () => void;
}) {
  void workspaceId; // path is derived server-side
  const router = useRouter();
  const [client, setClient] = useState(clients[0] ?? "");
  const [newClient, setNewClient] = useState("");
  const [category, setCategory] = useState("Legal");
  const [subcategory, setSubcategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clientName = (newClient.trim() || client).trim();
    if (!clientName) { toast.error("Client is required"); return; }
    if (!file) { toast.error("Pick a file"); return; }

    setBusy(true);
    try {
      // 1. Ask the server for a presigned upload URL
      const presigned = await presignUpload({
        client: clientName,
        category,
        file_name: file.name,
        content_type: file.type,
      });
      if ("error" in presigned) throw new Error(presigned.error ?? "Could not create upload URL");

      // 2. PUT the file directly to R2
      const putRes = await fetch(presigned.uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);

      // 3. Record the document in the DB
      const recordResult = await recordUpload({
        client: clientName,
        category,
        subcategory: subcategory.trim() || undefined,
        file_name: file.name,
        file_path: presigned.key,
        file_size: file.size,
      });
      if ("error" in recordResult) throw new Error(recordResult.error ?? "Could not record upload");

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
          <Label htmlFor="sub">Subcategory</Label>
          <Input id="sub" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} placeholder="e.g. Contracts" />
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
