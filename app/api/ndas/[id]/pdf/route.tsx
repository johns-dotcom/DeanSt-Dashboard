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
  // Filename carries both parties so a downloaded NDA is self-describing:
  // NDA-Dean_St_Recordings-Ashwin_Jacob.pdf
  const safe = (s: string) => (s || "").replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "");
  const owner = safe(nda.ownerName) || "Owner";
  const recipient = safe(nda.recipientName) || "Recipient";
  const filename = `NDA-${owner}-${recipient}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
