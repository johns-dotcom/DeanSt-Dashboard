"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoiceReceipts, invoices } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/workspace";
import { createUploadUrl, createDownloadUrl, deleteObject } from "@/lib/r2";
import { logActivity } from "@/lib/activity";

export async function listReceipts(invoiceId: string) {
  const session = await requireSession();
  return db
    .select()
    .from(invoiceReceipts)
    .where(and(eq(invoiceReceipts.invoiceId, invoiceId), eq(invoiceReceipts.workspaceId, session.workspace.id)))
    .orderBy(asc(invoiceReceipts.uploadedAt));
}

export async function presignReceiptUpload(input: {
  invoiceId: string;
  fileName: string;
  contentType: string;
}) {
  const session = await requireSession();
  if (session.member.role === "view_only") return { error: "View-only members cannot upload" };

  // Confirm the invoice belongs to this workspace
  const [inv] = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(eq(invoices.id, input.invoiceId), eq(invoices.workspaceId, session.workspace.id)))
    .limit(1);
  if (!inv) return { error: "Invoice not found" };

  const safeName = input.fileName.replace(/[^\w.\-]+/g, "_");
  const key = `${session.workspace.id}/receipts/${input.invoiceId}/${Date.now()}-${safeName}`;
  const uploadUrl = await createUploadUrl(key, input.contentType || "application/octet-stream");
  return { ok: true as const, uploadUrl, key };
}

export async function recordReceipt(input: {
  invoiceId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  contentType: string;
}) {
  const session = await requireSession();
  if (session.member.role === "view_only") return { error: "View-only members cannot upload" };

  const [inv] = await db
    .select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber, client: invoices.client })
    .from(invoices)
    .where(and(eq(invoices.id, input.invoiceId), eq(invoices.workspaceId, session.workspace.id)))
    .limit(1);
  if (!inv) return { error: "Invoice not found" };

  const [receipt] = await db
    .insert(invoiceReceipts)
    .values({
      workspaceId: session.workspace.id,
      invoiceId: input.invoiceId,
      fileName: input.fileName,
      filePath: input.filePath,
      fileSize: input.fileSize,
      contentType: input.contentType || null,
      uploadedBy: session.member.id,
      uploadedAt: new Date(),
    })
    .returning();

  await logActivity({
    action: "document.uploaded",
    workspaceId: session.workspace.id,
    actorUserId: session.user.id,
    actorMemberId: session.member.id,
    actorName: session.member.displayName,
    entityType: "receipt",
    entityId: receipt.id,
    entityLabel: `${input.fileName} · ${inv.invoiceNumber}`,
  });

  revalidatePath("/dashboard/invoices", "layout");
  return { ok: true as const, receipt };
}

export async function deleteReceipt(id: string) {
  const session = await requireSession();
  const [doomed] = await db
    .select()
    .from(invoiceReceipts)
    .where(and(eq(invoiceReceipts.id, id), eq(invoiceReceipts.workspaceId, session.workspace.id)))
    .limit(1);
  if (!doomed) return { error: "Receipt not found" };

  try { await deleteObject(doomed.filePath); } catch { /* swallow */ }
  await db.delete(invoiceReceipts).where(eq(invoiceReceipts.id, id));

  await logActivity({
    action: "document.deleted",
    workspaceId: session.workspace.id,
    actorUserId: session.user.id,
    actorMemberId: session.member.id,
    actorName: session.member.displayName,
    entityType: "receipt",
    entityId: id,
    entityLabel: doomed.fileName,
  });

  revalidatePath("/dashboard/invoices", "layout");
  return { ok: true as const };
}

export async function getReceiptDownloadUrl(id: string) {
  const session = await requireSession();
  const [r] = await db
    .select({ filePath: invoiceReceipts.filePath, fileName: invoiceReceipts.fileName })
    .from(invoiceReceipts)
    .where(and(eq(invoiceReceipts.id, id), eq(invoiceReceipts.workspaceId, session.workspace.id)))
    .limit(1);
  if (!r) return { error: "Receipt not found" };
  const url = await createDownloadUrl(r.filePath, r.fileName);
  return { url };
}
