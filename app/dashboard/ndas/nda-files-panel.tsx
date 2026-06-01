"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Download, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SlideOver, SlideOverContent } from "@/components/dashboard/slide-over";
import {
  listNdaFiles,
  presignNdaFileUpload,
  recordNdaFile,
  deleteNdaFile,
  getNdaFileDownloadUrl,
} from "./actions";
import { formatDate } from "@/lib/utils";
import type { Nda, NdaFile } from "@/lib/db/schema";

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function NdaFilesPanel({
  nda,
  open,
  onOpenChange,
}: {
  nda: Nda | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [files, setFiles] = useState<NdaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !nda) { setFiles([]); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const list = await listNdaFiles(nda.id);
      if (!cancelled) { setFiles(list); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [open, nda]);

  async function uploadFiles(input: FileList | File[]) {
    if (!nda) return;
    const arr = Array.from(input);
    if (arr.length === 0) return;
    setUploading(true);
    try {
      for (const file of arr) {
        const presigned = await presignNdaFileUpload({
          ndaId: nda.id,
          fileName: file.name,
          contentType: file.type,
        });
        if ("error" in presigned) throw new Error(presigned.error ?? "Could not get upload URL");
        const putRes = await fetch(presigned.uploadUrl, {
          method: "PUT",
          headers: { "content-type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);
        const recorded = await recordNdaFile({
          ndaId: nda.id,
          fileName: file.name,
          filePath: presigned.key,
          fileSize: file.size,
          contentType: file.type,
        });
        if ("error" in recorded) throw new Error(recorded.error ?? "Could not record");
        setFiles((prev) => [...prev, recorded.file]);
      }
      toast.success(arr.length === 1 ? "File uploaded" : `${arr.length} files uploaded`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleDownload(f: NdaFile) {
    startTransition(async () => {
      const r = await getNdaFileDownloadUrl(f.id);
      if ("error" in r) { toast.error(r.error); return; }
      window.open(r.url, "_blank");
    });
  }

  function handleDelete(f: NdaFile) {
    if (!confirm(`Delete ${f.fileName}?`)) return;
    startTransition(async () => {
      const r = await deleteNdaFile(f.id);
      if ("error" in r && r.error) { toast.error(r.error); return; }
      setFiles((prev) => prev.filter((x) => x.id !== f.id));
      toast.success("File deleted");
      router.refresh();
    });
  }

  return (
    <SlideOver open={open} onOpenChange={onOpenChange}>
      <SlideOverContent
        title={nda ? `Signed copy · ${nda.recipientName}` : "Signed copy"}
        description={nda ? `${files.length} attached` : ""}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
            }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "28px 22px",
              border: `1.5px dashed ${dragOver ? "var(--sign-green)" : "var(--hair)"}`,
              borderRadius: 10,
              background: dragOver ? "rgba(10,58,28,0.06)" : "var(--cream-light)",
              color: "var(--ink-soft)",
              cursor: uploading ? "not-allowed" : "pointer",
              transition: "background 120ms, border-color 120ms",
              opacity: uploading ? 0.7 : 1,
            }}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--sign-green)" }} />
            ) : (
              <Upload className="h-5 w-5" style={{ color: "var(--sign-green)" }} />
            )}
            <div style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>
              {uploading ? "Uploading…" : "Drop the signed NDA here"}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
              or click to browse · PDFs, scans, photos
            </div>
            <input
              type="file"
              multiple
              hidden
              disabled={uploading}
              onChange={(e) => { if (e.target.files) uploadFiles(e.target.files); e.target.value = ""; }}
            />
          </label>

          <div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.24em", color: "var(--ink-faint)", marginBottom: 8 }}>
              Attached
            </div>
            {loading ? (
              <div style={{ fontSize: 13, color: "var(--ink-soft)", padding: 16, textAlign: "center" }}>Loading…</div>
            ) : files.length === 0 ? (
              <div className="serif" style={{ fontSize: 16, color: "var(--ink-soft)", padding: "20px 16px", textAlign: "center", fontStyle: "italic" }}>
                No signed copy yet.
              </div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, border: "1px solid var(--hair)", borderRadius: 8, overflow: "hidden" }}>
                {files.map((f, i) => (
                  <li
                    key={f.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      borderTop: i === 0 ? "none" : "1px solid var(--hair)",
                      background: i % 2 === 0 ? "transparent" : "var(--cream-light)",
                    }}
                  >
                    <FileText className="h-4 w-4 flex-none" style={{ color: "var(--ink-soft)" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{ fontSize: 13.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        title={f.fileName}
                      >
                        {f.fileName}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>
                        {fmtSize(f.fileSize)} · {formatDate(f.uploadedAt, { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </div>
                    <button onClick={() => handleDownload(f)} title="Download" style={iconBtn}>
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(f)} title="Delete" style={iconBtn}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </SlideOverContent>
    </SlideOver>
  );
}

const iconBtn: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  border: "1px solid var(--hair)",
  color: "var(--ink-soft)",
  cursor: "pointer",
};
