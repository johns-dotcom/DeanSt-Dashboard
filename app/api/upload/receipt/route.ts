import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/lib/db";
import { invoices, invoiceReceipts } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/workspace";
import { r2, r2Bucket } from "@/lib/r2";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (session.member.role === "view_only") {
      return NextResponse.json({ error: "View-only members cannot upload" }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file");
    const invoiceId = form.get("invoiceId");

    if (!(file instanceof Blob) || typeof invoiceId !== "string") {
      return NextResponse.json({ error: "Missing file or invoiceId" }, { status: 400 });
    }
    const fileName = file instanceof File ? file.name : "receipt";
    const contentType = file.type || "application/octet-stream";

    const [inv] = await db
      .select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber, client: invoices.client })
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.workspaceId, session.workspace.id)))
      .limit(1);
    if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const safeName = fileName.replace(/[^\w.\-]+/g, "_");
    const key = `${session.workspace.id}/receipts/${invoiceId}/${Date.now()}-${safeName}`;

    const bytes = Buffer.from(await file.arrayBuffer());
    try {
      await r2.send(
        new PutObjectCommand({ Bucket: r2Bucket, Key: key, Body: bytes, ContentType: contentType })
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown R2 error";
      const name = err instanceof Error ? err.name : "Error";
      console.error("[upload/receipt] R2 PutObject failed", { name, message, bucket: r2Bucket, key });
      return NextResponse.json(
        { error: `R2: ${name} — ${message}` },
        { status: 502 }
      );
    }

    const [receipt] = await db
      .insert(invoiceReceipts)
      .values({
        workspaceId: session.workspace.id,
        invoiceId,
        fileName,
        filePath: key,
        fileSize: bytes.length,
        contentType,
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
      entityLabel: `${fileName} · ${inv.invoiceNumber}`,
    });

    return NextResponse.json({ ok: true, receipt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const name = err instanceof Error ? err.name : "Error";
    console.error("[upload/receipt] failed", { name, message, stack: err instanceof Error ? err.stack : undefined });
    return NextResponse.json({ error: `${name}: ${message}` }, { status: 500 });
  }
}
