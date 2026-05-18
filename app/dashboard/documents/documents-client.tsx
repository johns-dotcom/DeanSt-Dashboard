"use client";

import { useMemo, useState, useTransition } from "react";
import { Folder, FolderOpen, FileText, Upload, Trash2, Download, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FilterPills } from "@/components/dashboard/filter-pills";
import { EmptyState } from "@/components/dashboard/empty-state";
import { SlideOver, SlideOverContent } from "@/components/dashboard/slide-over";
import { UploadForm } from "./upload-form";
import { deleteDocument, getDownloadUrl } from "./actions";
import { cn, formatDate } from "@/lib/utils";
import type { Document as Doc } from "@/lib/db/schema";

const FOLDER_COLORS = [
  "text-rose-500",
  "text-amber-500",
  "text-emerald-500",
  "text-sky-500",
  "text-violet-500",
  "text-orange-500",
];

function folderColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return FOLDER_COLORS[Math.abs(hash) % FOLDER_COLORS.length];
}

export function DocumentsClient({ documents, workspaceId }: { documents: Doc[]; workspaceId: string }) {
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [uploadOpen, setUploadOpen] = useState(false);
  const [, startTransition] = useTransition();

  const groupedByClient = useMemo(() => {
    const filtered = filter === "all" ? documents : documents.filter((d) => d.client === filter);
    const map = new Map<string, Doc[]>();
    for (const d of filtered) {
      const arr = map.get(d.client) ?? [];
      arr.push(d);
      map.set(d.client, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [documents, filter]);

  const clients = Array.from(new Set(documents.map((d) => d.client))).sort();

  function toggle(client: string) {
    setOpen((p) => ({ ...p, [client]: !p[client] }));
  }

  async function handleDownload(doc: Doc) {
    const r = await getDownloadUrl(doc.id);
    if ("error" in r) { toast.error(r.error); return; }
    window.open(r.url, "_blank");
  }

  function handleDelete(doc: Doc) {
    if (!confirm(`Delete ${doc.fileName}?`)) return;
    startTransition(async () => {
      const r = await deleteDocument(doc.id);
      if ("error" in r && r.error) toast.error(r.error); else toast.success("Document deleted");
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <FilterPills
          value={filter}
          options={[
            { value: "all", label: "All clients", count: documents.length },
            ...clients.map((c) => ({ value: c, label: c, count: documents.filter((d) => d.client === c).length })),
          ]}
          onChange={setFilter}
        />
        <SlideOver open={uploadOpen} onOpenChange={setUploadOpen}>
          <Button onClick={() => setUploadOpen(true)}><Upload className="h-4 w-4" /> Upload file</Button>
          <SlideOverContent title="Upload file" description="Add a document to a client folder.">
            <UploadForm workspaceId={workspaceId} clients={clients} onDone={() => setUploadOpen(false)} />
          </SlideOverContent>
        </SlideOver>
      </div>

      {groupedByClient.length === 0 ? (
        <EmptyState
          icon={<Folder className="h-4 w-4" />}
          title="No documents yet"
          description="Upload contracts, press kits, and more."
          action={<Button onClick={() => setUploadOpen(true)}><Upload className="h-4 w-4" /> Upload file</Button>}
        />
      ) : (
        <div className="space-y-3">
          {groupedByClient.map(([client, items]) => {
            const isOpen = open[client] ?? true;
            const subcats = new Map<string, Doc[]>();
            for (const d of items) {
              const k = d.subcategory || d.category;
              const arr = subcats.get(k) ?? [];
              arr.push(d);
              subcats.set(k, arr);
            }
            return (
              <section key={client} className="overflow-hidden rounded-lg border-hairline border-border bg-surface">
                <button
                  onClick={() => toggle(client)}
                  className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-hover"
                >
                  <span className="flex items-center gap-2.5">
                    {isOpen ? (
                      <FolderOpen className={cn("h-4 w-4", folderColor(client))} />
                    ) : (
                      <Folder className={cn("h-4 w-4", folderColor(client))} />
                    )}
                    <span className="text-sm font-medium">{client}</span>
                    <span className="text-xs text-muted-foreground">{items.length}</span>
                  </span>
                  <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
                </button>
                {isOpen ? (
                  <div className="border-t-hairline border-border">
                    {Array.from(subcats.entries()).map(([sub, files]) => (
                      <div key={sub} className="px-4 py-2">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{sub}</div>
                        <ul className="mt-1.5">
                          {files.map((doc) => (
                            <li key={doc.id} className="group flex items-center justify-between rounded-md px-2 py-1.5 transition-colors hover:bg-hover">
                              <span className="flex min-w-0 items-center gap-2 text-sm">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="truncate">{doc.fileName}</span>
                              </span>
                              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="hidden sm:inline">{formatDate(doc.uploadedAt)}</span>
                                <button onClick={() => handleDownload(doc)} className="rounded p-1 hover:bg-surface hover:text-foreground" aria-label="Download">
                                  <Download className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => handleDelete(doc)} className="rounded p-1 hover:bg-surface hover:text-foreground" aria-label="Delete">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
