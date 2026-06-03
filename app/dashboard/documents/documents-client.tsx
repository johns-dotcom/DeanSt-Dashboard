"use client";

import { useMemo, useState, useTransition } from "react";
import { Folder, FolderOpen, FileText, Upload, Trash2, Download, ChevronRight, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FilterPills } from "@/components/dashboard/filter-pills";
import { EmptyState } from "@/components/dashboard/empty-state";
import { SlideOver, SlideOverContent } from "@/components/dashboard/slide-over";
import { UploadForm } from "./upload-form";
import {
  deleteDocument,
  getDownloadUrl,
  createDocumentFolder,
  renameDocumentFolder,
  deleteDocumentFolder,
} from "./actions";
import { cn, formatDate } from "@/lib/utils";
import type { Document as Doc, DocumentFolder } from "@/lib/db/schema";

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

export function DocumentsClient({
  documents,
  folders,
  workspaceId,
}: {
  documents: Doc[];
  folders: DocumentFolder[];
  workspaceId: string;
}) {
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadDefaults, setUploadDefaults] = useState<{ client?: string; subcategory?: string }>({});
  const [pending, startTransition] = useTransition();

  const clients = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((d) => set.add(d.client));
    folders.forEach((f) => set.add(f.client));
    return Array.from(set).sort();
  }, [documents, folders]);

  const groupedByClient = useMemo(() => {
    const filtered = filter === "all" ? documents : documents.filter((d) => d.client === filter);
    const map = new Map<string, Doc[]>();
    for (const d of filtered) {
      const arr = map.get(d.client) ?? [];
      arr.push(d);
      map.set(d.client, arr);
    }
    // Ensure clients that have folders but no documents still show up
    const allowed = filter === "all" ? new Set(clients) : new Set([filter]);
    for (const c of clients) {
      if (!map.has(c) && allowed.has(c) && folders.some((f) => f.client === c)) {
        map.set(c, []);
      }
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [documents, folders, filter, clients]);

  const foldersByClient = useMemo(() => {
    const map = new Map<string, DocumentFolder[]>();
    for (const f of folders) {
      const arr = map.get(f.client) ?? [];
      arr.push(f);
      map.set(f.client, arr);
    }
    return map;
  }, [folders]);

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

  function handleAddFolder(client: string) {
    const name = window.prompt(`Add a subfolder in ${client}`)?.trim();
    if (!name) return;
    startTransition(async () => {
      const r = await createDocumentFolder({ client, name });
      if ("error" in r && r.error) toast.error(r.error);
      else toast.success(`Added "${name}"`);
    });
  }

  function handleRenameFolder(folder: DocumentFolder, hasDocs: boolean) {
    const next = window.prompt(`Rename "${folder.name}"`, folder.name)?.trim();
    if (!next || next === folder.name) return;
    if (hasDocs && !confirm(`Renaming will retag ${hasDocs ? "all" : ""} documents in this folder. Continue?`)) return;
    startTransition(async () => {
      const r = await renameDocumentFolder({ id: folder.id, name: next });
      if ("error" in r && r.error) toast.error(r.error);
      else toast.success("Folder renamed");
    });
  }

  function handleDeleteFolder(folder: DocumentFolder, docCount: number) {
    if (docCount > 0) {
      toast.error(`Move or delete the ${docCount} file${docCount === 1 ? "" : "s"} in "${folder.name}" first.`);
      return;
    }
    if (!confirm(`Delete subfolder "${folder.name}"?`)) return;
    startTransition(async () => {
      const r = await deleteDocumentFolder(folder.id);
      if ("error" in r && r.error) toast.error(r.error);
      else toast.success("Subfolder deleted");
    });
  }

  function openUpload(client?: string, subcategory?: string) {
    setUploadDefaults({ client, subcategory });
    setUploadOpen(true);
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
        <SlideOver open={uploadOpen} onOpenChange={(v) => { setUploadOpen(v); if (!v) setUploadDefaults({}); }}>
          <Button onClick={() => openUpload()}><Upload className="h-4 w-4" /> Upload file</Button>
          <SlideOverContent title="Upload file" description="Add a document to a client folder.">
            <UploadForm
              workspaceId={workspaceId}
              clients={clients}
              folders={folders}
              defaultClient={uploadDefaults.client}
              defaultSubcategory={uploadDefaults.subcategory}
              onDone={() => { setUploadOpen(false); setUploadDefaults({}); }}
            />
          </SlideOverContent>
        </SlideOver>
      </div>

      {groupedByClient.length === 0 ? (
        <EmptyState
          icon={<Folder className="h-4 w-4" />}
          title="No documents yet"
          description="Upload contracts, press kits, and more."
          action={<Button onClick={() => openUpload()}><Upload className="h-4 w-4" /> Upload file</Button>}
        />
      ) : (
        <div className="space-y-3">
          {groupedByClient.map(([client, items]) => {
            const isOpen = open[client] ?? true;
            const clientFolders = foldersByClient.get(client) ?? [];

            // Build subcat map: each user-defined folder gets a bucket (even if empty),
            // plus any subcategory/category found on existing docs.
            const subcats = new Map<string, Doc[]>();
            const folderIdByName = new Map<string, DocumentFolder>();
            for (const f of clientFolders) {
              subcats.set(f.name, []);
              folderIdByName.set(f.name, f);
            }
            for (const d of items) {
              const k = d.subcategory || d.category;
              const arr = subcats.get(k) ?? [];
              arr.push(d);
              subcats.set(k, arr);
            }

            return (
              <section key={client} className="overflow-hidden rounded-lg border-hairline border-border bg-surface">
                <div className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-hover">
                  <button
                    onClick={() => toggle(client)}
                    className="flex flex-1 items-center gap-2.5 text-left"
                  >
                    {isOpen ? (
                      <FolderOpen className={cn("h-4 w-4", folderColor(client))} />
                    ) : (
                      <Folder className={cn("h-4 w-4", folderColor(client))} />
                    )}
                    <span className="text-sm font-medium">{client}</span>
                    <span className="text-xs text-muted-foreground">{items.length}</span>
                    <ChevronRight className={cn("h-4 w-4 ml-1 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
                  </button>
                  <button
                    onClick={() => handleAddFolder(client)}
                    disabled={pending}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-surface hover:text-foreground disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Subfolder
                  </button>
                </div>

                {isOpen ? (
                  <div className="border-t-hairline border-border">
                    {Array.from(subcats.entries())
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([sub, files]) => {
                        const folder = folderIdByName.get(sub);
                        return (
                          <div key={sub} className="px-4 py-2">
                            <div className="group flex items-center justify-between">
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{sub}</div>
                              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                <button
                                  onClick={() => openUpload(client, sub)}
                                  className="rounded p-1 text-muted-foreground hover:bg-surface hover:text-foreground"
                                  aria-label="Upload to this subfolder"
                                  title="Upload to this subfolder"
                                >
                                  <Upload className="h-3.5 w-3.5" />
                                </button>
                                {folder ? (
                                  <>
                                    <button
                                      onClick={() => handleRenameFolder(folder, files.length > 0)}
                                      disabled={pending}
                                      className="rounded p-1 text-muted-foreground hover:bg-surface hover:text-foreground disabled:opacity-50"
                                      aria-label="Rename subfolder"
                                      title="Rename"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteFolder(folder, files.length)}
                                      disabled={pending}
                                      className="rounded p-1 text-muted-foreground hover:bg-surface hover:text-foreground disabled:opacity-50"
                                      aria-label="Delete subfolder"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                ) : null}
                              </div>
                            </div>
                            {files.length === 0 ? (
                              <div className="mt-1.5 rounded-md px-2 py-2 text-xs italic text-muted-foreground">
                                Empty — upload a file to get started.
                              </div>
                            ) : (
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
                            )}
                          </div>
                        );
                      })}
                    {subcats.size === 0 ? (
                      <div className="px-4 py-3 text-xs italic text-muted-foreground">
                        No subfolders yet — add one above.
                      </div>
                    ) : null}
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
