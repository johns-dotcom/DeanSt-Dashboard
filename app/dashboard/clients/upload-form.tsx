"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadCloud, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Legal", "Admin", "Brand Deals", "Press", "Finance", "Other"];

function formatBytes(n: number) {
  if (!n) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadForm({
  clientId,
  folderId,
  destinationLabel,
  onDone,
}: {
  clientId: string;
  folderId: string | null;
  destinationLabel: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("Other");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  function addFiles(incoming: FileList | File[] | null) {
    if (!incoming) return;
    const next = Array.from(incoming);
    if (next.length === 0) return;
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`));
      return [...prev, ...next.filter((f) => !seen.has(`${f.name}:${f.size}`))];
    });
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function uploadOne(file: File) {
    const form = new FormData();
    form.append("file", file);
    form.append("client_id", clientId);
    form.append("category", category);
    if (folderId) form.append("folder_id", folderId);

    const res = await fetch("/api/upload/document", { method: "POST", body: form });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: `Upload failed (${res.status})` }));
      throw new Error(body.error ?? `Upload failed (${res.status})`);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) { toast.error("Add at least one file"); return; }

    setBusy(true);
    let ok = 0;
    const failures: string[] = [];
    for (const file of files) {
      try { await uploadOne(file); ok += 1; }
      catch (err) { failures.push(`${file.name}: ${err instanceof Error ? err.message : "failed"}`); }
    }
    setBusy(false);

    if (ok > 0) toast.success(`Uploaded ${ok} file${ok === 1 ? "" : "s"}`);
    if (failures.length > 0) toast.error(failures.join("\n"));
    router.refresh();
    if (failures.length === 0) {
      onDone();
    } else {
      const failedNames = new Set(failures.map((f) => f.split(":")[0]));
      setFiles((prev) => prev.filter((f) => failedNames.has(f.name)));
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

      <div className="space-y-2">
        <Label>Files</Label>
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
          onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center transition-colors hover:bg-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
            dragging && "border-primary bg-hover"
          )}
        >
          <UploadCloud className={cn("h-7 w-7 text-muted-foreground transition-colors", dragging && "text-primary")} />
          <div className="text-sm">
            <span className="font-medium text-foreground">Drop files here</span>{" "}
            <span className="text-muted-foreground">or click to browse</span>
          </div>
          <p className="text-xs text-muted-foreground">You can add multiple files at once.</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {files.length > 0 ? (
        <ul className="space-y-1.5">
          {files.map((f, i) => (
            <li key={`${f.name}:${f.size}:${i}`} className="flex items-center justify-between gap-2 rounded-md border-hairline border-border bg-surface px-3 py-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 flex-none text-muted-foreground" />
                <span className="truncate">{f.name}</span>
                <span className="flex-none text-xs text-muted-foreground">{formatBytes(f.size)}</span>
              </span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                disabled={busy}
                aria-label={`Remove ${f.name}`}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-hover hover:text-foreground disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone} disabled={busy}>Cancel</Button>
        <Button type="submit" disabled={busy || files.length === 0}>
          {busy ? "Uploading…" : files.length > 1 ? `Upload ${files.length} files` : "Upload"}
        </Button>
      </div>
    </form>
  );
}
