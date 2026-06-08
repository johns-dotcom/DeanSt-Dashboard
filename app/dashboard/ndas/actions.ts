"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { ndas, ndaFiles } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/workspace";
import { logActivity } from "@/lib/activity";
import { deleteObject } from "@/lib/r2";

const ndaSchema = z.object({
  recipient_name: z.string().min(1, "Recipient name is required"),
  recipient_address: z.string().optional().nullable(),
  effective_date: z.string().optional().nullable(),
  owner_name: z.string().min(1).default("Dean St Co"),
  owner_address: z.string().optional().nullable(),
  owner_signatory_name: z.string().optional().nullable(),
  owner_signatory_position: z.string().optional().nullable(),
  disclosing_to_name: z.string().optional().nullable(),
  purpose: z.string().optional().nullable(),
  term_years: z.coerce.number().int().min(0).max(99).default(2),
  survival_years: z.coerce.number().int().min(0).max(99).default(2),
  governing_law: z.string().min(1).default("California"),
  additional_clauses: z.string().optional().nullable(),
});

export async function createNda(input: z.infer<typeof ndaSchema>) {
  const parsed = ndaSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const session = await requireSession();

  const [inserted] = await db
    .insert(ndas)
    .values({
      workspaceId: session.workspace.id,
      recipientName: parsed.data.recipient_name,
      recipientAddress: parsed.data.recipient_address ?? null,
      effectiveDate: parsed.data.effective_date || null,
      ownerName: parsed.data.owner_name,
      ownerAddress: parsed.data.owner_address ?? null,
      ownerSignatoryName: parsed.data.owner_signatory_name ?? null,
      ownerSignatoryPosition: parsed.data.owner_signatory_position ?? null,
      disclosingToName: parsed.data.disclosing_to_name ?? null,
      purpose: parsed.data.purpose?.trim() || null,
      termYears: parsed.data.term_years,
      survivalYears: parsed.data.survival_years,
      governingLaw: parsed.data.governing_law.trim() || "California",
      additionalClauses: parsed.data.additional_clauses?.trim() || null,
      createdBy: session.member.id,
    })
    .returning();

  await logActivity({
    action: "document.uploaded",
    workspaceId: session.workspace.id,
    actorUserId: session.user.id,
    actorMemberId: session.member.id,
    actorName: session.member.displayName,
    entityType: "nda",
    entityId: inserted.id,
    entityLabel: `NDA created for ${parsed.data.recipient_name}`,
  });

  revalidatePath("/dashboard/ndas");
  return { ok: true as const, id: inserted.id };
}

export async function updateNda(id: string, input: z.infer<typeof ndaSchema>) {
  const parsed = ndaSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const session = await requireSession();

  const [updated] = await db
    .update(ndas)
    .set({
      recipientName: parsed.data.recipient_name,
      recipientAddress: parsed.data.recipient_address ?? null,
      effectiveDate: parsed.data.effective_date || null,
      ownerName: parsed.data.owner_name,
      ownerAddress: parsed.data.owner_address ?? null,
      ownerSignatoryName: parsed.data.owner_signatory_name ?? null,
      ownerSignatoryPosition: parsed.data.owner_signatory_position ?? null,
      disclosingToName: parsed.data.disclosing_to_name ?? null,
      purpose: parsed.data.purpose?.trim() || null,
      termYears: parsed.data.term_years,
      survivalYears: parsed.data.survival_years,
      governingLaw: parsed.data.governing_law.trim() || "California",
      additionalClauses: parsed.data.additional_clauses?.trim() || null,
      updatedAt: new Date(),
    })
    .where(and(eq(ndas.id, id), eq(ndas.workspaceId, session.workspace.id)))
    .returning();

  if (!updated) return { error: "NDA not found" };

  await logActivity({
    action: "document.uploaded",
    workspaceId: session.workspace.id,
    actorUserId: session.user.id,
    actorMemberId: session.member.id,
    actorName: session.member.displayName,
    entityType: "nda",
    entityId: updated.id,
    entityLabel: `NDA updated for ${parsed.data.recipient_name}`,
  });

  revalidatePath("/dashboard/ndas");
  return { ok: true as const };
}

export async function deleteNda(id: string) {
  const session = await requireSession();
  const [doomed] = await db
    .select({ recipientName: ndas.recipientName })
    .from(ndas)
    .where(and(eq(ndas.id, id), eq(ndas.workspaceId, session.workspace.id)))
    .limit(1);

  // Best-effort R2 cleanup of any attached files
  const files = await db
    .select({ filePath: ndaFiles.filePath })
    .from(ndaFiles)
    .where(eq(ndaFiles.ndaId, id));
  await Promise.allSettled(files.map((f) => deleteObject(f.filePath)));

  await db.delete(ndas).where(and(eq(ndas.id, id), eq(ndas.workspaceId, session.workspace.id)));

  await logActivity({
    action: "document.deleted",
    workspaceId: session.workspace.id,
    actorUserId: session.user.id,
    actorMemberId: session.member.id,
    actorName: session.member.displayName,
    entityType: "nda",
    entityId: id,
    entityLabel: doomed?.recipientName ? `NDA · ${doomed.recipientName}` : null,
  });

  revalidatePath("/dashboard/ndas");
  return { ok: true as const };
}

export async function setNdaSigned(id: string, signed: boolean) {
  const session = await requireSession();

  const [updated] = await db
    .update(ndas)
    .set({ signed, signedAt: signed ? new Date() : null, updatedAt: new Date() })
    .where(and(eq(ndas.id, id), eq(ndas.workspaceId, session.workspace.id)))
    .returning({ recipientName: ndas.recipientName });

  if (!updated) return { error: "NDA not found" };

  await logActivity({
    action: "document.uploaded",
    workspaceId: session.workspace.id,
    actorUserId: session.user.id,
    actorMemberId: session.member.id,
    actorName: session.member.displayName,
    entityType: "nda",
    entityId: id,
    entityLabel: `NDA · ${updated.recipientName} · ${signed ? "signed" : "unsigned"}`,
    metadata: { signed },
  });

  revalidatePath("/dashboard/ndas");
  return { ok: true as const };
}

// ─────────── Signed-copy file uploads ───────────

export async function listNdaFiles(ndaId: string) {
  const session = await requireSession();
  return db
    .select()
    .from(ndaFiles)
    .where(and(eq(ndaFiles.ndaId, ndaId), eq(ndaFiles.workspaceId, session.workspace.id)))
    .orderBy(asc(ndaFiles.uploadedAt));
}

export async function deleteNdaFile(id: string) {
  const session = await requireSession();
  const [doomed] = await db
    .select()
    .from(ndaFiles)
    .where(and(eq(ndaFiles.id, id), eq(ndaFiles.workspaceId, session.workspace.id)))
    .limit(1);
  if (!doomed) return { error: "File not found" };

  try { await deleteObject(doomed.filePath); } catch { /* swallow */ }
  await db.delete(ndaFiles).where(eq(ndaFiles.id, id));

  await logActivity({
    action: "document.deleted",
    workspaceId: session.workspace.id,
    actorUserId: session.user.id,
    actorMemberId: session.member.id,
    actorName: session.member.displayName,
    entityType: "nda_file",
    entityId: id,
    entityLabel: doomed.fileName,
  });

  revalidatePath("/dashboard/ndas");
  return { ok: true as const };
}

export async function getNdaFileDownloadUrl(id: string) {
  const session = await requireSession();
  const [r] = await db
    .select({ id: ndaFiles.id })
    .from(ndaFiles)
    .where(and(eq(ndaFiles.id, id), eq(ndaFiles.workspaceId, session.workspace.id)))
    .limit(1);
  if (!r) return { error: "File not found" };
  return { url: `/api/files/nda/${id}` };
}
