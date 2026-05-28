"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Download, Trash2, Loader2, Archive } from "lucide-react";
import { toast } from "sonner";
import {
  listReceipts,
  presignReceiptUpload,
  recordReceipt,
  deleteReceipt,
  getReceiptDownloadUrl,
} from "./receipts-actions";
import { formatDate } from "@/lib/utils";
import type { InvoiceReceipt } from "@/lib/db/schema";

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ReceiptsManager({
  invoiceId,
  compact = false,
}: {
  invoiceId: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [receipts, setReceipts] = useState<InvoiceReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const list = await listReceipts(invoiceId);
      if (!cancelled) {
        setReceipts(list);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [invoiceId]);

  async function uploadFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setUploading(true);
    try {
      for (const file of arr) {
        const presigned = await presignReceiptUpload({
          invoiceId,
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

        const recorded = await recordReceipt({
          invoiceId,
          fileName: file.name,
          filePath: presigned.key,
          fileSize: file.size,
          contentType: file.type,
        });
        if ("error" in recorded) throw new Error(recorded.error ?? "Could not record receipt");
        setReceipts((prev) => [...prev, recorded.receipt]);
      }
      toast.success(arr.length === 1 ? "Receipt uploaded" : `${arr.length} receipts uploaded`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleDownload(r: InvoiceReceipt) {
    startTransition(async () => {
      const res = await getReceiptDownloadUrl(r.id);
      if ("error" in res) { toast.error(res.error); return; }
      window.open(res.url, "_blank");
    });
  }

  function handleDelete(r: InvoiceReceipt) {
    if (!confirm(`Delete ${r.fileName}?`)) return;
    startTransition(async () => {
      const res = await deleteReceipt(r.id);
      if ("error" in res && res.error) { toast.error(res.error); return; }
      setReceipts((prev) => prev.filter((x) => x.id !== r.id));
      toast.success("Receipt deleted");
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
          gap: 6,
          padding: compact ? "18px 16px" : "26px 22px",
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
        <div style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 500 }}>
          {uploading ? "Uploading…" : "Drop receipts here"}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
          or click to browse · PDF, images, anything
        </div>
        <input
          type="file"
          multiple
          hidden
          disabled={uploading}
          onChange={(e) => { if (e.target.files) uploadFiles(e.target.files); e.target.value = ""; }}
        />
      </label>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span className="mono" style={{ fontSize: 10, letterSpacing: "0.24em", color: "var(--ink-faint)" }}>
          {receipts.length === 0 ? "No receipts yet" : `Attached · ${receipts.length}`}
        </span>
        {receipts.length >= 2 ? (
          <a
            href={`/api/invoices/${invoiceId}/receipts.zip`}
            download
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              color: "var(--sign-green)",
              textDecoration: "none",
              padding: "5px 10px",
              borderRadius: 6,
              background: "rgba(10,58,28,0.08)",
            }}
          >
            <Archive className="h-3.5 w-3.5" />
            Download all (.zip)
          </a>
        ) : null}
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: "var(--ink-soft)", padding: 12, textAlign: "center" }}>Loading…</div>
      ) : receipts.length === 0 ? null : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, border: "1px solid var(--hair)", borderRadius: 8, overflow: "hidden" }}>
          {receipts.map((r, i) => (
            <li
              key={r.id}
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
                  style={{
                    fontSize: 13,
                    color: "var(--ink)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={r.fileName}
                >
                  {r.fileName}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 1 }}>
                  {fmtSize(r.fileSize)} · {formatDate(r.uploadedAt, { month: "short", day: "numeric", year: "numeric" })}
                </div>
              </div>
              <button
                onClick={() => handleDownload(r)}
                title="Download"
                style={iconBtn}
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleDelete(r)}
                title="Delete"
                style={iconBtn}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
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
