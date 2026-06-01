import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { ndas } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/workspace";
import { NdaPDF } from "@/lib/pdf/nda-pdf";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  const inline = req.nextUrl.searchParams.get("inline") === "1";

  const [nda] = await db
    .select()
    .from(ndas)
    .where(and(eq(ndas.id, params.id), eq(ndas.workspaceId, session.workspace.id)))
    .limit(1);
  if (!nda) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const buffer = await renderToBuffer(<NdaPDF nda={nda} />);
  const safeName = (nda.recipientName || "nda").replace(/[^\w.-]+/g, "_");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${inline ? "inline" : "attachment"}; filename="NDA-${safeName}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
