"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Folder,
  FileText,
  Upload,
  UploadCloud,
  Trash2,
  Download,
  Eye,
  ChevronRight,
  ChevronDown,
  Pencil,
  FolderPlus,
  FolderInput,
  Home,
  LayoutGrid,
  List as ListIcon,
  FolderTree,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/empty-state";
import { SlideOver, SlideOverContent } from "@/components/dashboard/slide-over";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { UploadForm } from "./upload-form";
import {
  deleteDocument,
  getDownloadUrl,
  createDocumentFolder,
  renameDocumentFolder,
  deleteDocumentFolder,
  moveDocument,
  moveFolder,
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

function formatBytes(n: number) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

type ViewMode = "grid" | "list" | "tree";

type MoveTarget =
  | { kind: "doc"; id: string; name: string; client: string }
  | { kind: "folder"; id: string; name: string; client: string };

export function DocumentsClient({
  documents,
  folders,
  workspaceId,
}: {
  documents: Doc[];
  folders: DocumentFolder[];
  workspaceId: string;
}) {
  const [currentClient, setCurrentClient] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("grid");
  const [uploadTarget, setUploadTarget] = useState<{ client: string; folderId: string | null } | null>(null);
  const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null);
  const [previewDoc, setPreviewDoc] = useState<Doc | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("deanst.documents.view");
    if (stored === "grid" || stored === "list" || stored === "tree") setView(stored);
  }, []);
  function changeView(next: ViewMode) {
    setView(next);
    localStorage.setItem("deanst.documents.view", next);
  }

  const foldersById = useMemo(() => {
    const m = new Map<string, DocumentFolder>();
    for (const f of folders) m.set(f.id, f);
    return m;
  }, [folders]);

  const clients = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((d) => set.add(d.client));
    folders.forEach((f) => set.add(f.client));
    if (currentClient) set.add(currentClient);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [documents, folders, currentClient]);

  function childFolders(client: string, parentId: string | null) {
    return folders
      .filter((f) => f.client === client && (f.parentId ?? null) === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }
  function docsIn(client: string, folderId: string | null) {
    return documents
      .filter((d) => d.client === client && (d.folderId ?? null) === folderId)
      .sort((a, b) => a.fileName.localeCompare(b.fileName));
  }
  function ancestry(folderId: string): DocumentFolder[] {
    const chain: DocumentFolder[] = [];
    let cur = foldersById.get(folderId);
    while (cur) { chain.unshift(cur); cur = cur.parentId ? foldersById.get(cur.parentId) : undefined; }
    return chain;
  }
  function descendantIds(folderId: string): Set<string> {
    const out = new Set<string>();
    const walk = (id: string) => {
      for (const f of folders) if (f.parentId === id && !out.has(f.id)) { out.add(f.id); walk(f.id); }
    };
    walk(folderId);
    return out;
  }
  function pathLabel(folderId: string): string {
    return ancestry(folderId).map((f) => f.name).join(" / ");
  }
  function folderItemCount(folder: DocumentFolder): number {
    return childFolders(folder.client, folder.id).length + docsIn(folder.client, folder.id).length;
  }

  // ─── navigation ───
  const goHome = () => { setCurrentClient(null); setCurrentFolderId(null); };
  const openClient = (c: string) => { setCurrentClient(c); setCurrentFolderId(null); };
  const openFolder = (id: string) => setCurrentFolderId(id);
  const goToFolder = (id: string | null) => setCurrentFolderId(id);
  const isExpanded = (id: string, def: boolean) => expanded[id] ?? def;
  const toggleExpand = (id: string, def: boolean) =>
    setExpanded((p) => ({ ...p, [id]: !(p[id] ?? def) }));

  // ─── document ops ───
  async function handleDownload(doc: Doc) {
    const r = await getDownloadUrl(doc.id);
    if ("error" in r) { toast.error(r.error); return; }
    window.open(r.url, "_blank");
  }
  function handleView(doc: Doc) {
    // Opens an inline preview in a modal on this page (PDFs/images render in the
    // embedded frame; other types fall back to the Download / Open-in-tab buttons).
    setPreviewDoc(doc);
  }
  function handleDeleteDoc(doc: Doc) {
    if (!confirm(`Delete ${doc.fileName}?`)) return;
    startTransition(async () => {
      const r = await deleteDocument(doc.id);
      if ("error" in r && r.error) toast.error(r.error); else toast.success("Document deleted");
    });
  }

  // ─── folder ops (parameterized so grid/list/tree all reuse them) ───
  function newFolderIn(client: string, parentId: string | null, label: string) {
    const name = window.prompt(`New folder in ${label}`)?.trim();
    if (!name) return;
    startTransition(async () => {
      const r = await createDocumentFolder({ client, name, parentId });
      if ("error" in r && r.error) toast.error(r.error); else toast.success(`Created “${name}”`);
    });
  }
  function handleRenameFolder(folder: DocumentFolder) {
    const next = window.prompt(`Rename “${folder.name}”`, folder.name)?.trim();
    if (!next || next === folder.name) return;
    startTransition(async () => {
      const r = await renameDocumentFolder({ id: folder.id, name: next });
      if ("error" in r && r.error) toast.error(r.error); else toast.success("Folder renamed");
    });
  }
  function handleDeleteFolder(folder: DocumentFolder) {
    if (folderItemCount(folder) > 0) {
      toast.error(`“${folder.name}” isn't empty — move or delete its contents first.`);
      return;
    }
    if (!confirm(`Delete folder “${folder.name}”?`)) return;
    startTransition(async () => {
      const r = await deleteDocumentFolder(folder.id);
      if ("error" in r && r.error) toast.error(r.error); else toast.success("Folder deleted");
    });
  }
  function handleNewClient() {
    const name = window.prompt("New client name")?.trim();
    if (!name) return;
    const first = (window.prompt(`First folder in ${name}`, "General") ?? "").trim() || "General";
    startTransition(async () => {
      const r = await createDocumentFolder({ client: name, name: first, parentId: null });
      if ("error" in r && r.error) { toast.error(r.error); return; }
      toast.success(`Client “${name}” created`);
      openClient(name);
    });
  }
  function submitMove(destFolderId: string | null) {
    if (!moveTarget) return;
    startTransition(async () => {
      const r =
        moveTarget.kind === "doc"
          ? await moveDocument({ id: moveTarget.id, folderId: destFolderId })
          : await moveFolder({ id: moveTarget.id, parentId: destFolderId });
      if ("error" in r && r.error) toast.error(r.error);
      else { toast.success("Moved"); setMoveTarget(null); }
    });
  }

  // ─── drag-and-drop upload (drop files onto a client/folder) ───
  async function uploadFiles(files: File[], client: string, folderId: string | null) {
    if (files.length === 0 || uploading) return;
    setUploading(true);
    let ok = 0;
    const failures: string[] = [];
    for (const file of files) {
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("client", client);
        if (folderId) form.append("folder_id", folderId);
        const res = await fetch("/api/upload/document", { method: "POST", body: form });
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: `Upload failed (${res.status})` }));
          throw new Error(body.error ?? `Upload failed (${res.status})`);
        }
        ok += 1;
      } catch (err) {
        failures.push(`${file.name}: ${err instanceof Error ? err.message : "failed"}`);
      }
    }
    setUploading(false);
    const where = folderId ? pathLabel(folderId) : client;
    if (ok > 0) toast.success(`Uploaded ${ok} file${ok === 1 ? "" : "s"} to ${where}`);
    if (failures.length > 0) toast.error(failures.join("\n"));
    router.refresh();
  }

  const moveDoc = (d: Doc) => setMoveTarget({ kind: "doc", id: d.id, name: d.fileName, client: d.client });
  const moveFolderT = (f: DocumentFolder) => setMoveTarget({ kind: "folder", id: f.id, name: f.name, client: f.client });

  const breadcrumb = currentFolderId ? ancestry(currentFolderId) : [];
  const showDrillToolbar = view !== "tree" && currentClient !== null;

  // ─── tree renderers ───
  function renderFileRow(doc: Doc, depth: number) {
    return (
      <div
        key={doc.id}
        className="group flex items-center justify-between rounded-md py-1.5 pr-2 transition-colors hover:bg-hover"
        style={{ paddingLeft: depth * 18 + 8 }}
      >
        <span className="flex min-w-0 items-center gap-2 text-sm">
          <FileText className="h-4 w-4 flex-none text-muted-foreground" />
          <span className="truncate">{doc.fileName}</span>
        </span>
        <span className="flex flex-none items-center gap-2 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          <IconBtn label="Move" onClick={() => moveDoc(doc)} disabled={pending}><FolderInput className="h-3.5 w-3.5" /></IconBtn>
          <IconBtn label="View" onClick={() => handleView(doc)}><Eye className="h-3.5 w-3.5" /></IconBtn>
          <IconBtn label="Download" onClick={() => handleDownload(doc)}><Download className="h-3.5 w-3.5" /></IconBtn>
          <IconBtn label="Delete" onClick={() => handleDeleteDoc(doc)} disabled={pending}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
        </span>
      </div>
    );
  }
  function renderFolderNode(folder: DocumentFolder, depth: number): React.ReactNode {
    const open = isExpanded(folder.id, false);
    const kids = childFolders(folder.client, folder.id);
    const files = docsIn(folder.client, folder.id);
    return (
      <div key={folder.id}>
        <div className="group flex items-center justify-between rounded-md py-1.5 pr-2 transition-colors hover:bg-hover" style={{ paddingLeft: depth * 18 + 4 }}>
          <button onClick={() => toggleExpand(folder.id, false)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-sm">
            <ChevronDown className={cn("h-3.5 w-3.5 flex-none text-muted-foreground transition-transform", !open && "-rotate-90")} />
            <Folder className={cn("h-4 w-4 flex-none", folderColor(folder.id))} />
            <span className="truncate font-medium">{folder.name}</span>
            <span className="text-xs text-muted-foreground">{kids.length + files.length}</span>
          </button>
          <span className="flex flex-none items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <IconBtn label="New subfolder" onClick={() => newFolderIn(folder.client, folder.id, folder.name)} disabled={pending}><FolderPlus className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn label="Upload here" onClick={() => setUploadTarget({ client: folder.client, folderId: folder.id })}><Upload className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn label="Move" onClick={() => moveFolderT(folder)} disabled={pending}><FolderInput className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn label="Rename" onClick={() => handleRenameFolder(folder)} disabled={pending}><Pencil className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn label="Delete" onClick={() => handleDeleteFolder(folder)} disabled={pending}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
          </span>
        </div>
        {open ? (
          <div>
            {kids.map((k) => renderFolderNode(k, depth + 1))}
            {files.map((d) => renderFileRow(d, depth + 1))}
            {kids.length === 0 && files.length === 0 ? (
              <div className="py-1 text-xs italic text-muted-foreground" style={{ paddingLeft: (depth + 1) * 18 + 8 }}>Empty</div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top bar: breadcrumb (drill modes) + view switch */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {view === "tree" ? (
          <div className="flex items-center gap-1.5 text-sm font-medium"><FolderTree className="h-4 w-4 text-muted-foreground" /> All documents</div>
        ) : (
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            <button onClick={goHome} className={cn("inline-flex items-center gap-1.5 rounded px-2 py-1 transition-colors hover:bg-hover", currentClient === null ? "font-medium text-foreground" : "text-muted-foreground")}>
              <Home className="h-3.5 w-3.5" /> Documents
            </button>
            {currentClient ? (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                <button onClick={() => goToFolder(null)} className={cn("rounded px-2 py-1 transition-colors hover:bg-hover", currentFolderId === null ? "font-medium text-foreground" : "text-muted-foreground")}>{currentClient}</button>
              </>
            ) : null}
            {breadcrumb.map((f, i) => (
              <span key={f.id} className="flex items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                <button onClick={() => goToFolder(f.id)} className={cn("rounded px-2 py-1 transition-colors hover:bg-hover", i === breadcrumb.length - 1 ? "font-medium text-foreground" : "text-muted-foreground")}>{f.name}</button>
              </span>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2">
          {showDrillToolbar ? (
            <>
              <Button variant="ghost" onClick={() => newFolderIn(currentClient!, currentFolderId, currentFolderId ? pathLabel(currentFolderId) : currentClient!)} disabled={pending}>
                <FolderPlus className="h-4 w-4" /> New folder
              </Button>
              <Button onClick={() => setUploadTarget({ client: currentClient!, folderId: currentFolderId })}>
                <Upload className="h-4 w-4" /> Upload here
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={handleNewClient}><FolderPlus className="h-4 w-4" /> New client</Button>
          )}
          <ViewToggle value={view} onChange={changeView} />
        </div>
      </div>

      {/* ─── TREE ─── */}
      {view === "tree" ? (
        clients.length === 0 ? (
          <EmptyState icon={<Folder className="h-4 w-4" />} title="No documents yet" description="Create a client to start organizing files." action={<Button onClick={handleNewClient}><FolderPlus className="h-4 w-4" /> New client</Button>} />
        ) : (
          <div className="rounded-lg border-hairline border-border bg-surface p-2">
            {clients.map((c) => {
              const open = isExpanded(`client:${c}`, true);
              const top = childFolders(c, null);
              const rootFiles = docsIn(c, null);
              return (
                <div key={c}>
                  <div className="group flex items-center justify-between rounded-md py-1.5 pr-2 transition-colors hover:bg-hover" style={{ paddingLeft: 4 }}>
                    <button onClick={() => toggleExpand(`client:${c}`, true)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-sm">
                      <ChevronDown className={cn("h-3.5 w-3.5 flex-none text-muted-foreground transition-transform", !open && "-rotate-90")} />
                      <Folder className={cn("h-4 w-4 flex-none", folderColor(c))} />
                      <span className="truncate font-medium">{c}</span>
                      <span className="text-xs text-muted-foreground">{top.length + rootFiles.length}</span>
                    </button>
                    <span className="flex flex-none items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <IconBtn label="New folder" onClick={() => newFolderIn(c, null, c)} disabled={pending}><FolderPlus className="h-3.5 w-3.5" /></IconBtn>
                      <IconBtn label="Upload here" onClick={() => setUploadTarget({ client: c, folderId: null })}><Upload className="h-3.5 w-3.5" /></IconBtn>
                    </span>
                  </div>
                  {open ? (
                    <div>
                      {top.map((f) => renderFolderNode(f, 1))}
                      {rootFiles.map((d) => renderFileRow(d, 1))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )
      ) : currentClient === null ? (
        // ─── HOME (grid/list) ───
        clients.length === 0 ? (
          <EmptyState icon={<Folder className="h-4 w-4" />} title="No documents yet" description="Create a client to start organizing files into folders." action={<Button onClick={handleNewClient}><FolderPlus className="h-4 w-4" /> New client</Button>} />
        ) : view === "list" ? (
          <div className="overflow-hidden rounded-lg border-hairline border-border bg-surface">
            {clients.map((c) => {
              const count = childFolders(c, null).length + docsIn(c, null).length;
              return (
                <DropArea key={c} onFiles={(files) => uploadFiles(files, c, null)} disabled={uploading}>
                  {(over) => (
                    <button onClick={() => openClient(c)} className={cn("flex w-full items-center justify-between border-b-hairline border-border px-4 py-2.5 text-left last:border-b-0 transition-colors hover:bg-hover", over && "bg-hover ring-1 ring-inset ring-foreground")}>
                      <span className="flex items-center gap-2.5 text-sm"><Folder className={cn("h-4 w-4", folderColor(c))} /><span className="font-medium">{c}</span></span>
                      <span className="text-xs text-muted-foreground">{over ? "Drop to upload" : `${count} item${count === 1 ? "" : "s"}`}</span>
                    </button>
                  )}
                </DropArea>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
            {clients.map((c) => {
              const count = childFolders(c, null).length + docsIn(c, null).length;
              return (
                <DropArea key={c} onFiles={(files) => uploadFiles(files, c, null)} disabled={uploading} className="rounded-lg">
                  {(over) => (
                    <button onClick={() => openClient(c)} className={cn("group flex w-full items-center gap-3 rounded-lg border-hairline border-border bg-surface p-4 text-left transition-colors hover:bg-hover", over && "border-foreground bg-hover ring-1 ring-foreground")}>
                      <Folder className={cn("h-5 w-5 flex-none", folderColor(c))} />
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{c}</span><span className="text-xs text-muted-foreground">{over ? "Drop to upload" : `${count} item${count === 1 ? "" : "s"}`}</span></span>
                      <ChevronRight className="h-4 w-4 flex-none text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </button>
                  )}
                </DropArea>
              );
            })}
          </div>
        )
      ) : (
        // ─── INSIDE A CLIENT/FOLDER (grid/list) ───
        <FolderView
          view={view}
          folders={childFolders(currentClient, currentFolderId)}
          files={docsIn(currentClient, currentFolderId)}
          itemCount={folderItemCount}
          onOpenFolder={openFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
          onMoveFolder={moveFolderT}
          onView={handleView}
          onDownload={handleDownload}
          onDeleteDoc={handleDeleteDoc}
          onMoveDoc={moveDoc}
          onUpload={() => setUploadTarget({ client: currentClient, folderId: currentFolderId })}
          onUploadFiles={(folderId, files) => uploadFiles(files, currentClient, folderId)}
          currentFolderId={currentFolderId}
          uploading={uploading}
          pending={pending}
        />
      )}

      {/* Upload slide-over */}
      <SlideOver open={Boolean(uploadTarget)} onOpenChange={(v) => { if (!v) setUploadTarget(null); }}>
        <SlideOverContent
          title="Upload file"
          description={uploadTarget ? `Uploading to ${uploadTarget.client}${uploadTarget.folderId ? " / " + pathLabel(uploadTarget.folderId) : ""}` : ""}
        >
          {uploadTarget ? (
            <UploadForm
              workspaceId={workspaceId}
              client={uploadTarget.client}
              folderId={uploadTarget.folderId}
              destinationLabel={uploadTarget.folderId ? `${uploadTarget.client} / ${pathLabel(uploadTarget.folderId)}` : uploadTarget.client}
              onDone={() => setUploadTarget(null)}
            />
          ) : null}
        </SlideOverContent>
      </SlideOver>

      {/* Move picker */}
      <SlideOver open={Boolean(moveTarget)} onOpenChange={(v) => { if (!v) setMoveTarget(null); }}>
        <SlideOverContent title="Move" description={moveTarget ? `Choose a destination for “${moveTarget.name}”.` : ""}>
          {moveTarget ? (
            <MovePicker
              target={moveTarget}
              folders={folders.filter((f) => f.client === moveTarget.client)}
              pathLabel={pathLabel}
              excludeIds={moveTarget.kind === "folder" ? new Set([moveTarget.id, ...descendantIds(moveTarget.id)]) : new Set()}
              onPick={submitMove}
              pending={pending}
            />
          ) : null}
        </SlideOverContent>
      </SlideOver>

      {/* Inline preview */}
      <Dialog open={Boolean(previewDoc)} onOpenChange={(v) => { if (!v) setPreviewDoc(null); }}>
        {previewDoc ? (
          <DialogContent className="flex h-[88vh] w-[92vw] max-w-5xl flex-col gap-0 overflow-hidden p-0">
            <DialogTitle className="sr-only">{previewDoc.fileName}</DialogTitle>
            <div className="flex items-center justify-between gap-3 border-b-hairline border-border px-4 py-2.5">
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <FileText className="h-4 w-4 flex-none text-muted-foreground" />
                <span className="truncate font-medium">{previewDoc.fileName}</span>
              </span>
              <span className="flex flex-none items-center gap-1 pr-7">
                <IconBtn label="Open in new tab" onClick={() => window.open(`/api/files/document/${previewDoc.id}?inline=1`, "_blank", "noopener")}><ExternalLink className="h-3.5 w-3.5" /></IconBtn>
                <IconBtn label="Download" onClick={() => handleDownload(previewDoc)}><Download className="h-3.5 w-3.5" /></IconBtn>
              </span>
            </div>
            <iframe
              src={`/api/files/document/${previewDoc.id}?inline=1`}
              title={previewDoc.fileName}
              className="h-full w-full flex-1 bg-white"
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  const opts: { v: ViewMode; icon: React.ReactNode; label: string }[] = [
    { v: "grid", icon: <LayoutGrid className="h-3.5 w-3.5" />, label: "Grid" },
    { v: "list", icon: <ListIcon className="h-3.5 w-3.5" />, label: "List" },
    { v: "tree", icon: <FolderTree className="h-3.5 w-3.5" />, label: "Tree" },
  ];
  return (
    <div className="inline-flex rounded-lg border-hairline border-border bg-surface p-0.5">
      {opts.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          aria-label={o.label}
          title={o.label}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors",
            value === o.v ? "bg-hover font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.icon}
          <span className="hidden sm:inline">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

function FolderView({
  view,
  folders,
  files,
  itemCount,
  onOpenFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveFolder,
  onView,
  onDownload,
  onDeleteDoc,
  onMoveDoc,
  onUpload,
  onUploadFiles,
  currentFolderId,
  uploading,
  pending,
}: {
  view: ViewMode;
  folders: DocumentFolder[];
  files: Doc[];
  itemCount: (f: DocumentFolder) => number;
  onOpenFolder: (id: string) => void;
  onRenameFolder: (f: DocumentFolder) => void;
  onDeleteFolder: (f: DocumentFolder) => void;
  onMoveFolder: (f: DocumentFolder) => void;
  onView: (d: Doc) => void;
  onDownload: (d: Doc) => void;
  onDeleteDoc: (d: Doc) => void;
  onMoveDoc: (d: Doc) => void;
  onUpload: () => void;
  onUploadFiles: (folderId: string | null, files: File[]) => void;
  currentFolderId: string | null;
  uploading: boolean;
  pending: boolean;
}) {
  if (folders.length === 0 && files.length === 0) {
    return (
      <DropArea onFiles={(f) => onUploadFiles(currentFolderId, f)} disabled={uploading} className="rounded-lg">
        {(over) => (
          <div className={cn("rounded-lg border border-dashed border-border bg-muted/20 transition-colors", over && "border-foreground bg-hover")}>
            <EmptyState
              icon={over ? <UploadCloud className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
              title={over ? "Drop to upload here" : "This folder is empty"}
              description={over ? "Release to upload your files to this folder." : "Create a subfolder, drop files here, or upload a file."}
              action={over ? undefined : <Button onClick={onUpload}><Upload className="h-4 w-4" /> Upload here</Button>}
            />
          </div>
        )}
      </DropArea>
    );
  }

  // ─── LIST ───
  if (view === "list") {
    return (
      <DropArea onFiles={(f) => onUploadFiles(currentFolderId, f)} disabled={uploading} className="rounded-lg">
        {(containerOver) => (
          <div className={cn("overflow-hidden rounded-lg border-hairline border-border bg-surface transition-colors", containerOver && "ring-1 ring-inset ring-foreground")}>
            <div className="flex items-center justify-between border-b-hairline border-border px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>Name</span>
              <span className="flex items-center gap-6"><span className="hidden sm:inline">Modified</span><span className="w-16 text-right">Size</span></span>
            </div>
            {folders.map((f) => {
              const count = itemCount(f);
              return (
                <DropArea key={f.id} onFiles={(files) => onUploadFiles(f.id, files)} disabled={uploading} className="border-b-hairline border-border last:border-b-0">
                  {(over) => (
                    <div className={cn("group flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-hover", over && "bg-hover ring-1 ring-inset ring-foreground")}>
                      <button onClick={() => onOpenFolder(f.id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left text-sm">
                        <Folder className={cn("h-4 w-4 flex-none", folderColor(f.id))} />
                        <span className="truncate font-medium">{f.name}</span>
                        <span className="text-xs text-muted-foreground">{over ? "Drop to upload" : count}</span>
                      </button>
                      <span className="flex flex-none items-center gap-1">
                        <span className="hidden items-center gap-6 text-xs text-muted-foreground sm:flex group-hover:hidden"><span>—</span><span className="w-16 text-right">—</span></span>
                        <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <IconBtn label="Move" onClick={() => onMoveFolder(f)} disabled={pending}><FolderInput className="h-3.5 w-3.5" /></IconBtn>
                          <IconBtn label="Rename" onClick={() => onRenameFolder(f)} disabled={pending}><Pencil className="h-3.5 w-3.5" /></IconBtn>
                          <IconBtn label="Delete" onClick={() => onDeleteFolder(f)} disabled={pending}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                        </span>
                      </span>
                    </div>
                  )}
                </DropArea>
              );
            })}
            {files.map((doc) => (
              <div key={doc.id} className="group flex items-center justify-between border-b-hairline border-border px-4 py-2.5 last:border-b-0 transition-colors hover:bg-hover">
                <span className="flex min-w-0 flex-1 items-center gap-2.5 text-sm"><FileText className="h-4 w-4 flex-none text-muted-foreground" /><span className="truncate">{doc.fileName}</span></span>
                <span className="flex flex-none items-center gap-1">
                  <span className="hidden items-center gap-6 text-xs text-muted-foreground sm:flex group-hover:hidden"><span>{formatDate(doc.uploadedAt)}</span><span className="w-16 text-right">{formatBytes(doc.fileSize)}</span></span>
                  <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <IconBtn label="Move" onClick={() => onMoveDoc(doc)} disabled={pending}><FolderInput className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn label="View" onClick={() => onView(doc)}><Eye className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn label="Download" onClick={() => onDownload(doc)}><Download className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn label="Delete" onClick={() => onDeleteDoc(doc)} disabled={pending}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </DropArea>
    );
  }

  // ─── GRID (default) ───
  return (
    <DropArea onFiles={(f) => onUploadFiles(currentFolderId, f)} disabled={uploading} className="space-y-5 rounded-lg">
      {(containerOver) => (
    <div className={cn("space-y-5 rounded-lg transition-colors", containerOver && "ring-1 ring-foreground")}>
      {folders.length > 0 ? (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
          {folders.map((f) => {
            const count = itemCount(f);
            return (
              <DropArea key={f.id} onFiles={(files) => onUploadFiles(f.id, files)} disabled={uploading} className="rounded-lg">
                {(over) => (
                  <div className={cn("group relative flex items-center gap-3 rounded-lg border-hairline border-border bg-surface p-4 transition-colors hover:bg-hover", over && "border-foreground bg-hover ring-1 ring-foreground")}>
                    <button onClick={() => onOpenFolder(f.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <Folder className={cn("h-5 w-5 flex-none", folderColor(f.id))} />
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{f.name}</span><span className="text-xs text-muted-foreground">{over ? "Drop to upload" : `${count} item${count === 1 ? "" : "s"}`}</span></span>
                    </button>
                    <div className="flex flex-none items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <IconBtn label="Move" onClick={() => onMoveFolder(f)} disabled={pending}><FolderInput className="h-3.5 w-3.5" /></IconBtn>
                      <IconBtn label="Rename" onClick={() => onRenameFolder(f)} disabled={pending}><Pencil className="h-3.5 w-3.5" /></IconBtn>
                      <IconBtn label="Delete" onClick={() => onDeleteFolder(f)} disabled={pending}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                    </div>
                  </div>
                )}
              </DropArea>
            );
          })}
        </div>
      ) : null}
      {files.length > 0 ? (
        <div className="overflow-hidden rounded-lg border-hairline border-border bg-surface">
          <ul>
            {files.map((doc) => (
              <li key={doc.id} className="group flex items-center justify-between border-b-hairline border-border px-4 py-2.5 last:border-b-0 transition-colors hover:bg-hover">
                <span className="flex min-w-0 items-center gap-2.5 text-sm"><FileText className="h-4 w-4 flex-none text-muted-foreground" /><span className="truncate">{doc.fileName}</span></span>
                <span className="flex flex-none items-center gap-2 text-xs text-muted-foreground">
                  <span className="hidden sm:inline">{formatDate(doc.uploadedAt)}</span>
                  <IconBtn label="Move" onClick={() => onMoveDoc(doc)} disabled={pending}><FolderInput className="h-3.5 w-3.5" /></IconBtn>
                  <IconBtn label="View" onClick={() => onView(doc)}><Eye className="h-3.5 w-3.5" /></IconBtn>
                <IconBtn label="Download" onClick={() => onDownload(doc)}><Download className="h-3.5 w-3.5" /></IconBtn>
                  <IconBtn label="Delete" onClick={() => onDeleteDoc(doc)} disabled={pending}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
      )}
    </DropArea>
  );
}

function DropArea({
  onFiles,
  disabled,
  className,
  children,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
  children: (over: boolean) => React.ReactNode;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        if (disabled) return;
        // Only react to actual file drags, not internal element drags.
        if (!Array.from(e.dataTransfer.types).includes("Files")) return;
        e.preventDefault();
        e.stopPropagation();
        setOver(true);
      }}
      onDragLeave={(e) => {
        e.stopPropagation();
        setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
        if (disabled) return;
        const files = Array.from(e.dataTransfer.files);
        if (files.length) onFiles(files);
      }}
      className={className}
    >
      {children(over)}
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="rounded p-1 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function MovePicker({
  target,
  folders,
  pathLabel,
  excludeIds,
  onPick,
  pending,
}: {
  target: MoveTarget;
  folders: DocumentFolder[];
  pathLabel: (id: string) => string;
  excludeIds: Set<string>;
  onPick: (destFolderId: string | null) => void;
  pending: boolean;
}) {
  const destinations = folders
    .filter((f) => !excludeIds.has(f.id))
    .map((f) => ({ id: f.id, label: pathLabel(f.id) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="space-y-1">
      <button onClick={() => onPick(null)} disabled={pending} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-hover disabled:opacity-50">
        <Home className="h-4 w-4 text-muted-foreground" /> {target.client} (root)
      </button>
      {destinations.map((d) => (
        <button key={d.id} onClick={() => onPick(d.id)} disabled={pending} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-hover disabled:opacity-50">
          <Folder className="h-4 w-4 flex-none text-muted-foreground" />
          <span className="truncate">{d.label}</span>
        </button>
      ))}
      {destinations.length === 0 ? (
        <p className="px-3 py-2 text-xs italic text-muted-foreground">No other folders in {target.client} yet.</p>
      ) : null}
    </div>
  );
}
