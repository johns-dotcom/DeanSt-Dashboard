"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoiceReceipts } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/workspace";
import { deleteObject } from "@/lib/r2";
import { logActivity } from "@/lib/activity";

export async function listReceipts(invoiceId: string) {
  const session = await requireSession();
  return db
    .select()
    .from(invoiceReceipts)
    .where(and(eq(invoiceReceipts.invoiceId, invoiceId), eq(invoiceReceipts.workspaceId, session.workspace.id)))
    .orderBy(asc(invoiceReceipts.uploadedAt));
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
  // Returns the proxy URL that streams the file through the Next.js server.
  // No need to round-trip to R2 just to build the URL — keeping the function
  // for API stability with existing clients.
  const session = await requireSession();
  const [r] = await db
    .select({ id: invoiceReceipts.id })
    .from(invoiceReceipts)
    .where(and(eq(invoiceReceipts.id, id), eq(invoiceReceipts.workspaceId, session.workspace.id)))
    .limit(1);
  if (!r) return { error: "Receipt not found" };
  return { url: `/api/files/receipt/${id}` };
}
