import { NextResponse, type NextRequest } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import JSZip from "jszip";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/lib/db";
import { invoices, invoiceReceipts } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/workspace";
import { r2, r2Bucket } from "@/lib/r2";

export const runtime = "nodejs";

async function streamToBuffer(stream: unknown): Promise<Buffer> {
  // The R2 GetObject body in Node is a Readable stream
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array | Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, params.id), eq(invoices.workspaceId, session.workspace.id)))
    .limit(1);
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const receipts = await db
    .select()
    .from(invoiceReceipts)
    .where(and(eq(invoiceReceipts.invoiceId, invoice.id), eq(invoiceReceipts.workspaceId, session.workspace.id)))
    .orderBy(asc(invoiceReceipts.uploadedAt));

  if (receipts.length === 0) {
    return NextResponse.json({ error: "No receipts attached" }, { status: 404 });
  }

  const zip = new JSZip();
  const seen = new Map<string, number>();
  for (const r of receipts) {
    const obj = await r2.send(new GetObjectCommand({ Bucket: r2Bucket, Key: r.filePath }));
    if (!obj.Body) continue;
    const buf = await streamToBuffer(obj.Body);
    let name = r.fileName;
    // Disambiguate duplicate filenames
    const baseCount = seen.get(name) ?? 0;
    if (baseCount > 0) {
      const dot = name.lastIndexOf(".");
      name = dot >= 0
        ? `${name.slice(0, dot)} (${baseCount})${name.slice(dot)}`
        : `${name} (${baseCount})`;
    }
    seen.set(r.fileName, baseCount + 1);
    zip.file(name, buf);
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  const safeNumber = invoice.invoiceNumber.replace(/[^\w.-]+/g, "_");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${safeNumber}-receipts.zip"`,
      "cache-control": "no-store",
    },
  });
}
