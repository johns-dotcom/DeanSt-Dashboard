"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Folder,
  FileText,
  Upload,
  Trash2,
  Download,
  ChevronRight,
  Pencil,
  FolderPlus,
  FolderInput,
  Home,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/empty-state";
import { SlideOver, SlideOverContent } from "@/components/dashboard/slide-over";
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
  // Navigation: null client = Home (client list); folderId null = client root.
  const [currentClient, setCurrentClient] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null);
  const [pending, startTransition] = useTransition();

  const foldersById = useMemo(() => {
    const m = new Map<string, DocumentFolder>();
    for (const f of folders) m.set(f.id, f);
    return m;
  }, [folders]);

  const clients = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((d) => set.add(d.client));
    folders.forEach((f) => set.add(f.client));
    // Keep the client we just drilled into visible even before it has content.
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
    while (cur) {
      chain.unshift(cur);
      cur = cur.parentId ? foldersById.get(cur.parentId) : undefined;
    }
    return chain;
  }

  function descendantIds(folderId: string): Set<string> {
    const out = new Set<string>();
    const walk = (id: string) => {
      for (const f of folders) {
        if (f.parentId === id && !out.has(f.id)) {
          out.add(f.id);
          walk(f.id);
        }
      }
    };
    walk(folderId);
    return out;
  }

  function pathLabel(folderId: string): string {
    return ancestry(folderId).map((f) => f.name).join(" / ");
  }

  function folderItemCount(folder: DocumentFolder): number {
    return (
      childFolders(folder.client, folder.id).length + docsIn(folder.client, folder.id).length
    );
  }

  // ─── navigation ───
  const goHome = () => { setCurrentClient(null); setCurrentFolderId(null); };
  const openClient = (c: string) => { setCurrentClient(c); setCurrentFolderId(null); };
  const openFolder = (id: string) => setCurrentFolderId(id);
  const goToFolder = (id: string | null) => setCurrentFolderId(id);

  // ─── document ops ───
  async function handleDownload(doc: Doc) {
    const r = await getDownloadUrl(doc.id);
    if ("error" in r) { toast.error(r.error); return; }
    window.open(r.url, "_blank");
  }
  function handleDeleteDoc(doc: Doc) {
    if (!confirm(`Delete ${doc.fileName}?`)) return;
    startTransition(async () => {
      const r = await deleteDocument(doc.id);
      if ("error" in r && r.error) toast.error(r.error); else toast.success("Document deleted");
    });
  }

  // ─── folder ops ───
  function handleNewFolder() {
    if (!currentClient) return;
    const name = window.prompt(
      currentFolderId
        ? `New subfolder in “${pathLabel(currentFolderId)}”`
        : `New folder in ${currentClient}`
    )?.trim();
    if (!name) return;
    startTransition(async () => {
      const r = await createDocumentFolder({ client: currentClient, name, parentId: currentFolderId });
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
    openClient(name); // persists once a folder/file is added inside it
  }

  // ─── move ───
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

  const breadcrumb = currentFolderId ? ancestry(currentFolderId) : [];

  return (
    <div className="space-y-5">
      {/* Breadcrumb + toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          <button
            onClick={goHome}
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-2 py-1 transition-colors hover:bg-hover",
              currentClient === null ? "font-medium text-foreground" : "text-muted-foreground"
            )}
          >
            <Home className="h-3.5 w-3.5" /> Documents
          </button>
          {currentClient ? (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <button
                onClick={() => goToFolder(null)}
                className={cn(
                  "rounded px-2 py-1 transition-colors hover:bg-hover",
                  currentFolderId === null ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {currentClient}
              </button>
            </>
          ) : null}
          {breadcrumb.map((f, i) => (
            <span key={f.id} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <button
                onClick={() => goToFolder(f.id)}
                className={cn(
                  "rounded px-2 py-1 transition-colors hover:bg-hover",
                  i === breadcrumb.length - 1 ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {f.name}
              </button>
            </span>
          ))}
        </nav>

        {currentClient ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={handleNewFolder} disabled={pending}>
              <FolderPlus className="h-4 w-4" /> New folder
            </Button>
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4" /> Upload here
            </Button>
          </div>
        ) : (
          <Button variant="ghost" onClick={handleNewClient}>
            <FolderPlus className="h-4 w-4" /> New client
          </Button>
        )}
      </div>

      {currentClient === null ? (
        // ─── Home: client list ───
        clients.length === 0 ? (
          <EmptyState
            icon={<Folder className="h-4 w-4" />}
            title="No documents yet"
            description="Create a client to start organizing files into folders."
            action={<Button onClick={handleNewClient}><FolderPlus className="h-4 w-4" /> New client</Button>}
          />
        ) : (
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
            {clients.map((c) => {
              const count = childFolders(c, null).length + docsIn(c, null).length;
              return (
                <button
                  key={c}
                  onClick={() => openClient(c)}
                  className="group flex items-center gap-3 rounded-lg border-hairline border-border bg-surface p-4 text-left transition-colors hover:bg-hover"
                >
                  <Folder className={cn("h-5 w-5 flex-none", folderColor(c))} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{c}</span>
                    <span className="text-xs text-muted-foreground">{count} item{count === 1 ? "" : "s"}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 flex-none text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </button>
              );
            })}
          </div>
        )
      ) : (
        // ─── Inside a client / folder ───
        <FolderView
          folders={childFolders(currentClient, currentFolderId)}
          files={docsIn(currentClient, currentFolderId)}
          itemCount={folderItemCount}
          onOpenFolder={openFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
          onMoveFolder={(f) => setMoveTarget({ kind: "folder", id: f.id, name: f.name, client: f.client })}
          onDownload={handleDownload}
          onDeleteDoc={handleDeleteDoc}
          onMoveDoc={(d) => setMoveTarget({ kind: "doc", id: d.id, name: d.fileName, client: d.client })}
          onUpload={() => setUploadOpen(true)}
          pending={pending}
        />
      )}

      {/* Upload slide-over — uploads into the current location */}
      <SlideOver open={uploadOpen} onOpenChange={setUploadOpen}>
        <SlideOverContent
          title="Upload file"
          description={
            currentClient
              ? `Uploading to ${currentClient}${currentFolderId ? " / " + pathLabel(currentFolderId) : ""}`
              : "Add a document"
          }
        >
          {currentClient ? (
            <UploadForm
              workspaceId={workspaceId}
              client={currentClient}
              folderId={currentFolderId}
              destinationLabel={currentFolderId ? `${currentClient} / ${pathLabel(currentFolderId)}` : currentClient}
              onDone={() => setUploadOpen(false)}
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
    </div>
  );
}

function FolderView({
  folders,
  files,
  itemCount,
  onOpenFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveFolder,
  onDownload,
  onDeleteDoc,
  onMoveDoc,
  onUpload,
  pending,
}: {
  folders: DocumentFolder[];
  files: Doc[];
  itemCount: (f: DocumentFolder) => number;
  onOpenFolder: (id: string) => void;
  onRenameFolder: (f: DocumentFolder) => void;
  onDeleteFolder: (f: DocumentFolder) => void;
  onMoveFolder: (f: DocumentFolder) => void;
  onDownload: (d: Doc) => void;
  onDeleteDoc: (d: Doc) => void;
  onMoveDoc: (d: Doc) => void;
  onUpload: () => void;
  pending: boolean;
}) {
  if (folders.length === 0 && files.length === 0) {
    return (
      <EmptyState
        icon={<Folder className="h-4 w-4" />}
        title="This folder is empty"
        description="Create a subfolder or upload a file here."
        action={<Button onClick={onUpload}><Upload className="h-4 w-4" /> Upload here</Button>}
      />
    );
  }
  return (
    <div className="space-y-5">
      {folders.length > 0 ? (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
          {folders.map((f) => {
            const count = itemCount(f);
            return (
              <div
                key={f.id}
                className="group relative flex items-center gap-3 rounded-lg border-hairline border-border bg-surface p-4 transition-colors hover:bg-hover"
              >
                <button onClick={() => onOpenFolder(f.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <Folder className={cn("h-5 w-5 flex-none", folderColor(f.id))} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{f.name}</span>
                    <span className="text-xs text-muted-foreground">{count} item{count === 1 ? "" : "s"}</span>
                  </span>
                </button>
                <div className="flex flex-none items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <IconBtn label="Move" onClick={() => onMoveFolder(f)} disabled={pending}><FolderInput className="h-3.5 w-3.5" /></IconBtn>
                  <IconBtn label="Rename" onClick={() => onRenameFolder(f)} disabled={pending}><Pencil className="h-3.5 w-3.5" /></IconBtn>
                  <IconBtn label="Delete" onClick={() => onDeleteFolder(f)} disabled={pending}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {files.length > 0 ? (
        <div className="overflow-hidden rounded-lg border-hairline border-border bg-surface">
          <ul>
            {files.map((doc) => (
              <li key={doc.id} className="group flex items-center justify-between border-b-hairline border-border px-4 py-2.5 last:border-b-0 transition-colors hover:bg-hover">
                <span className="flex min-w-0 items-center gap-2.5 text-sm">
                  <FileText className="h-4 w-4 flex-none text-muted-foreground" />
                  <span className="truncate">{doc.fileName}</span>
                </span>
                <span className="flex flex-none items-center gap-2 text-xs text-muted-foreground">
                  <span className="hidden sm:inline">{formatDate(doc.uploadedAt)}</span>
                  <IconBtn label="Move" onClick={() => onMoveDoc(doc)} disabled={pending}><FolderInput className="h-3.5 w-3.5" /></IconBtn>
                  <IconBtn label="Download" onClick={() => onDownload(doc)}><Download className="h-3.5 w-3.5" /></IconBtn>
                  <IconBtn label="Delete" onClick={() => onDeleteDoc(doc)} disabled={pending}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
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
      <button
        onClick={() => onPick(null)}
        disabled={pending}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-hover disabled:opacity-50"
      >
        <Home className="h-4 w-4 text-muted-foreground" /> {target.client} (root)
      </button>
      {destinations.map((d) => (
        <button
          key={d.id}
          onClick={() => onPick(d.id)}
          disabled={pending}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-hover disabled:opacity-50"
        >
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
