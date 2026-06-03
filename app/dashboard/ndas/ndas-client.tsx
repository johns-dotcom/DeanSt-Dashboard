"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Eye, Pencil, Download, Trash2, Plus, X, Paperclip, Check } from "lucide-react";
import { toast } from "sonner";
import { Eyebrow } from "@/components/brand/eyebrow";
import { PageFooter } from "@/components/brand/page-footer";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { NdaPreviewPanel, type NdaDraft } from "./nda-preview";
import { NdaFilesPanel } from "./nda-files-panel";
import { createNda, updateNda, deleteNda, setNdaSigned } from "./actions";
import { formatDate } from "@/lib/utils";
import type { Nda } from "@/lib/db/schema";

const emptyDraft = (defaults?: { name?: string; signatoryName?: string; signatoryPosition?: string }): NdaDraft => ({
  recipientName: "",
  recipientAddress: "",
  effectiveDate: new Date().toISOString().slice(0, 10),
  ownerName: defaults?.name ?? "Dean St Co",
  ownerAddress: "",
  ownerSignatoryName: defaults?.signatoryName ?? "",
  ownerSignatoryPosition: defaults?.signatoryPosition ?? "",
  disclosingToName: "",
});

function toDraft(nda: Nda): NdaDraft {
  return {
    recipientName: nda.recipientName,
    recipientAddress: nda.recipientAddress ?? "",
    effectiveDate: nda.effectiveDate ?? "",
    ownerName: nda.ownerName,
    ownerAddress: nda.ownerAddress ?? "",
    ownerSignatoryName: nda.ownerSignatoryName ?? "",
    ownerSignatoryPosition: nda.ownerSignatoryPosition ?? "",
    disclosingToName: nda.disclosingToName ?? "",
  };
}

export function NdasClient({
  ndas,
  defaultOwner,
  fileCounts,
}: {
  ndas: Nda[];
  defaultOwner: { name: string; signatoryName: string; signatoryPosition: string };
  fileCounts: Record<string, number>;
}) {
  const initialDraft = useMemo(() => emptyDraft(defaultOwner), [defaultOwner]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NdaDraft>(initialDraft);
  const [filesFor, setFilesFor] = useState<Nda | null>(null);
  const [pending, startTransition] = useTransition();

  const editing = useMemo(
    () => (editingId ? ndas.find((n) => n.id === editingId) ?? null : null),
    [editingId, ndas]
  );

  function startNew() { setEditingId(null); setDraft(initialDraft); }
  function startEdit(n: Nda) { setEditingId(n.id); setDraft(toDraft(n)); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.recipientName.trim()) { toast.error("Recipient name is required"); return; }
    startTransition(async () => {
      const payload = {
        recipient_name: draft.recipientName.trim(),
        recipient_address: draft.recipientAddress.trim() || null,
        effective_date: draft.effectiveDate || null,
        owner_name: draft.ownerName.trim() || "Dean St Co",
        owner_address: draft.ownerAddress.trim() || null,
        owner_signatory_name: draft.ownerSignatoryName.trim() || null,
        owner_signatory_position: draft.ownerSignatoryPosition.trim() || null,
        disclosing_to_name: draft.disclosingToName.trim() || null,
      };
      const r = editing ? await updateNda(editing.id, payload) : await createNda(payload);
      if ("error" in r && r.error) { toast.error(r.error); return; }
      toast.success(editing ? "NDA updated" : `NDA created for ${draft.recipientName}`);
      startNew();
    });
  }

  function handleDelete(n: Nda) {
    if (!confirm(`Delete NDA for ${n.recipientName}? Attached signed copies will also be removed.`)) return;
    startTransition(async () => {
      await deleteNda(n.id);
      toast.success("NDA deleted");
      if (editingId === n.id) startNew();
    });
  }

  return (
    <div style={{ padding: "32px 48px 60px", display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Eyebrow size={10} spacing={0.36}>№ 05 · Counsel</Eyebrow>
        <Eyebrow size={10} spacing={0.32}>{editing ? `Editing NDA · ${editing.recipientName}` : "Drafting new NDA"}</Eyebrow>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(360px, 1fr) minmax(0, 1.45fr)", gap: 22 }}>
        <NdaFormPanel
          draft={draft}
          setDraft={setDraft}
          onSubmit={handleSubmit}
          onCancel={startNew}
          editing={Boolean(editing)}
          pending={pending}
        />
        <NdaPreviewPanel draft={draft} />
      </div>

      <section style={{ background: "var(--paper)", border: "1px solid var(--hair)", borderRadius: 10, overflow: "hidden" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "18px 26px",
            borderBottom: "1px solid var(--hair)",
          }}
        >
          <div>
            <Eyebrow size={10}>Saved NDAs</Eyebrow>
            <div
              style={{
                fontFamily: "Arial, sans-serif",
                fontSize: 19,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                marginTop: 4,
              }}
            >
              {ndas.length} on file
            </div>
          </div>
        </header>

        {ndas.length === 0 ? (
          <div style={{ padding: "60px 26px", textAlign: "center" }}>
            <div className="serif" style={{ fontSize: 24, color: "var(--ink)", fontStyle: "italic" }}>
              No NDAs yet.
            </div>
            <div style={{ fontSize: 14, color: "var(--ink-soft)", marginTop: 6 }}>
              Fill in the form above to generate your first NDA.
            </div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Arial, sans-serif" }}>
            <thead>
              <tr style={{ background: "var(--cream-light)" }}>
                <Th width={260}>Recipient</Th>
                <Th>Owner</Th>
                <Th width={140}>Effective</Th>
                <Th width={120}>Signed</Th>
                <Th align="right" width={170}>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {ndas.map((n) => (
                <tr
                  key={n.id}
                  style={{ borderTop: "1px solid var(--hair)", cursor: "pointer" }}
                  onClick={() => startEdit(n)}
                >
                  <Td>
                    <div style={{ fontWeight: 500 }}>{n.recipientName}</div>
                    {n.recipientAddress ? (
                      <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>{n.recipientAddress}</div>
                    ) : null}
                  </Td>
                  <Td><span style={{ color: "var(--ink-soft)" }}>{n.ownerName}</span></Td>
                  <Td><span style={{ color: "var(--ink-soft)", fontSize: 13.5 }}>{formatDate(n.effectiveDate)}</span></Td>
                  <Td>
                    <div onClick={(e) => e.stopPropagation()} style={{ display: "inline-block" }}>
                      <SignedMenu signed={n.signed} ndaId={n.id} recipient={n.recipientName} />
                    </div>
                  </Td>
                  <Td align="right">
                    <div style={{ display: "inline-flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                      <FilesButton count={fileCounts[n.id] ?? 0} onClick={() => setFilesFor(n)} />
                      <a
                        href={`/api/ndas/${n.id}/pdf?inline=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={rowIconStyle}
                        aria-label="View"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </a>
                      <a
                        href={`/api/ndas/${n.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={rowIconStyle}
                        aria-label="Download"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      <button onClick={() => startEdit(n)} aria-label="Edit" style={rowIconStyle}>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(n)} aria-label="Delete" style={rowIconStyle}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <NdaFilesPanel
        nda={filesFor}
        open={Boolean(filesFor)}
        onOpenChange={(v) => { if (!v) setFilesFor(null); }}
      />

      <PageFooter />
    </div>
  );
}

function NdaFormPanel({
  draft,
  setDraft,
  onSubmit,
  onCancel,
  editing,
  pending,
}: {
  draft: NdaDraft;
  setDraft: React.Dispatch<React.SetStateAction<NdaDraft>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  editing: boolean;
  pending: boolean;
}) {
  return (
    <section
      style={{
        background: "var(--paper)",
        border: "1px solid var(--hair)",
        borderRadius: 10,
        padding: "26px 26px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontFamily: "Arial, sans-serif", fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em" }}>
            {editing ? "Edit NDA" : "New NDA"}
          </h3>
          {editing ? (
            <button
              onClick={onCancel}
              type="button"
              style={{ background: "transparent", border: "none", color: "var(--ink-soft)", fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <X className="h-3.5 w-3.5" /> Discard
            </button>
          ) : null}
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>
          Fill in the parties; preview updates live; download as PDF.
        </div>
      </div>

      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <FieldLabel>Recipient name</FieldLabel>
        <input
          value={draft.recipientName}
          onChange={(e) => setDraft((p) => ({ ...p, recipientName: e.target.value }))}
          placeholder="Acme Studios LLC"
          style={inputStyle}
          required
        />

        <FieldLabel>Recipient address</FieldLabel>
        <textarea
          value={draft.recipientAddress}
          onChange={(e) => setDraft((p) => ({ ...p, recipientAddress: e.target.value }))}
          placeholder="1234 Sunset Blvd, Los Angeles, CA 90028"
          rows={2}
          style={textareaStyle}
        />

        <FieldLabel>Effective date</FieldLabel>
        <input
          type="date"
          value={draft.effectiveDate}
          onChange={(e) => setDraft((p) => ({ ...p, effectiveDate: e.target.value }))}
          style={inputStyle}
        />

        <div style={{ borderTop: "1px solid var(--hair)", paddingTop: 12, marginTop: 4 }}>
          <Eyebrow size={9}>Owner side</Eyebrow>
        </div>

        <FieldLabel>Owner name</FieldLabel>
        <input
          value={draft.ownerName}
          onChange={(e) => setDraft((p) => ({ ...p, ownerName: e.target.value }))}
          style={inputStyle}
        />

        <FieldLabel>Owner address</FieldLabel>
        <textarea
          value={draft.ownerAddress}
          onChange={(e) => setDraft((p) => ({ ...p, ownerAddress: e.target.value }))}
          placeholder="Optional"
          rows={2}
          style={textareaStyle}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <FieldLabel>Signatory name</FieldLabel>
            <input
              value={draft.ownerSignatoryName}
              onChange={(e) => setDraft((p) => ({ ...p, ownerSignatoryName: e.target.value }))}
              placeholder="John Skead"
              style={inputStyle}
            />
          </div>
          <div>
            <FieldLabel>Position</FieldLabel>
            <input
              value={draft.ownerSignatoryPosition}
              onChange={(e) => setDraft((p) => ({ ...p, ownerSignatoryPosition: e.target.value }))}
              placeholder="Founder"
              style={inputStyle}
            />
          </div>
        </div>

        <FieldLabel>Disclose to (recipient contact)</FieldLabel>
        <input
          value={draft.disclosingToName}
          onChange={(e) => setDraft((p) => ({ ...p, disclosingToName: e.target.value }))}
          placeholder="Defaults to signatory name"
          style={inputStyle}
        />

        <button
          type="submit"
          disabled={pending}
          style={{
            marginTop: 4,
            padding: "12px 16px",
            background: "var(--ink)",
            color: "var(--cream)",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: "0.02em",
            cursor: pending ? "not-allowed" : "pointer",
            opacity: pending ? 0.6 : 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Plus className="h-4 w-4" />
          {pending ? "Saving…" : editing ? "Save changes" : "Create NDA"}
        </button>
      </form>
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-soft)", display: "block" }}>{children}</label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--cream-light)",
  border: "1px solid var(--hair)",
  borderRadius: 8,
  fontSize: 14,
  color: "var(--ink)",
  fontFamily: "inherit",
  outline: "none",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: 56,
  lineHeight: 1.4,
};

const rowIconStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--ink-soft)",
  background: "transparent",
  border: "1px solid var(--hair)",
  cursor: "pointer",
};

function Th({ children, align = "left", width }: { children: React.ReactNode; align?: "left" | "right"; width?: number }) {
  return (
    <th
      className="mono"
      style={{
        textAlign: align,
        padding: "14px 18px",
        fontSize: 10,
        letterSpacing: "0.24em",
        color: "var(--ink-faint)",
        fontWeight: 400,
        width,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <td style={{ padding: "14px 18px", textAlign: align, fontSize: 14, color: "var(--ink)", verticalAlign: "middle" }}>
      {children}
    </td>
  );
}

function FilesButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={`Signed copy (${count})`}
      title={count ? `${count} file${count === 1 ? "" : "s"} attached` : "Upload signed copy"}
      style={{
        ...rowIconStyle,
        background: count > 0 ? "rgba(29,60,142,0.10)" : rowIconStyle.background,
        color: count > 0 ? "var(--sign-green)" : (rowIconStyle.color as string),
        borderColor: count > 0 ? "rgba(29,60,142,0.25)" : "var(--hair)",
        width: "auto",
        paddingLeft: 8,
        paddingRight: count > 0 ? 8 : 10,
        gap: 4,
      }}
    >
      <Paperclip className="h-3.5 w-3.5" />
      {count > 0 ? <span style={{ fontSize: 11, fontWeight: 600 }}>{count}</span> : null}
    </button>
  );
}

const SIGNED_TONES = {
  true: { bg: "rgba(29,60,142,0.12)", fg: "var(--sign-green)", label: "Signed" },
  false: { bg: "rgba(26,22,18,0.06)", fg: "var(--ink-soft)", label: "Unsigned" },
} as const;

function SignedMenu({
  signed,
  ndaId,
  recipient,
}: {
  signed: boolean;
  ndaId: string;
  recipient: string;
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<boolean>(signed);

  useEffect(() => { setOptimistic(signed); }, [signed]);

  function pick(next: boolean) {
    if (next === optimistic) return;
    setOptimistic(next);
    startTransition(async () => {
      const r = await setNdaSigned(ndaId, next);
      if ("error" in r && r.error) { setOptimistic(signed); toast.error(r.error); }
      else toast.success(`${recipient} → ${next ? "Signed" : "Unsigned"}`);
    });
  }

  const t = SIGNED_TONES[optimistic ? "true" : "false"];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={pending}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 10px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            background: t.bg,
            color: t.fg,
            border: "none",
            cursor: pending ? "wait" : "pointer",
            opacity: pending ? 0.7 : 1,
          }}
        >
          {t.label}
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2.5 4 5 6.5 7.5 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4} style={{ minWidth: 140 }}>
        {[true, false].map((s) => {
          const tone = SIGNED_TONES[s ? "true" : "false"];
          const active = s === optimistic;
          return (
            <DropdownMenuItem key={String(s)} onSelect={() => pick(s)}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flex: 1 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: tone.fg, flex: "none" }} />
                <span style={{ fontSize: 13 }}>{tone.label}</span>
              </span>
              {active ? <Check className="h-3.5 w-3.5" style={{ color: "var(--ink-soft)" }} /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
