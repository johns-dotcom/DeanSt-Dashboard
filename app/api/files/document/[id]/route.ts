import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/workspace";
import { getObject } from "@/lib/r2";
import { dispositionFor } from "@/lib/upload";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();

  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, params.id), eq(documents.workspaceId, session.workspace.id)))
    .limit(1);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // ?inline=1 → render in the browser, but only for render-safe types (PDF,
  // raster images). Anything else is forced to download even when inline is
  // asked for, so a stored HTML/SVG can't execute from our origin.
  const requestedInline = req.nextUrl.searchParams.get("inline") === "1";

  try {
    const { body, contentType } = await getObject(doc.filePath);
    const disposition = dispositionFor(requestedInline, contentType);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "content-type": contentType || "application/octet-stream",
        "content-disposition": `${disposition}; filename="${doc.fileName.replace(/"/g, "")}"`,
        "x-content-type-options": "nosniff",
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[files/document] failed", { message, id: params.id });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
