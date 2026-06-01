import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoiceReceipts } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/workspace";
import { getObject } from "@/lib/r2";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();

  const [receipt] = await db
    .select()
    .from(invoiceReceipts)
    .where(and(eq(invoiceReceipts.id, params.id), eq(invoiceReceipts.workspaceId, session.workspace.id)))
    .limit(1);
  if (!receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const { body, contentType } = await getObject(receipt.filePath);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "content-type": contentType || receipt.contentType || "application/octet-stream",
        "content-disposition": `attachment; filename="${receipt.fileName.replace(/"/g, "")}"`,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[files/receipt] failed", { message, id: params.id });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
