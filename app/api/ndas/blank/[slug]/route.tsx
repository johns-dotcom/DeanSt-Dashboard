import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireSession } from "@/lib/auth/workspace";
import { getNdaClient, NDA_CLIENTS } from "@/lib/nda-clients";
import { NdaPDF } from "@/lib/pdf/nda-pdf";
import type { Nda } from "@/lib/db/schema";

export const runtime = "nodejs";

// Streams a blank (unfilled) copy of a client's NDA template — the standard
// template with the recipient, date, and signatures left blank to print and
// fill by hand. Reuses NdaPDF with a synthetic record (no DB row).
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  await requireSession();
  if (!NDA_CLIENTS.some((c) => c.slug === params.slug)) {
    return NextResponse.json({ error: "Unknown template" }, { status: 404 });
  }
  const client = getNdaClient(params.slug);
  const inline = req.nextUrl.searchParams.get("inline") === "1";

  const blank = {
    id: "blank",
    workspaceId: "",
    clientSlug: client.slug,
    recipientName: "",
    recipientAddress: null,
    effectiveDate: null,
    ownerName: client.owner?.name ?? "Dean St Co",
    ownerAddress: client.owner?.address ?? null,
    ownerSignatoryName: client.owner?.signatoryName ?? null,
    ownerSignatoryPosition: client.owner?.signatoryPosition ?? null,
    disclosingToName: null,
    purpose: null,
    termYears: 2,
    survivalYears: 2,
    governingLaw: "California",
    additionalClauses: null,
    bodyText: null,
    signed: false,
    signedAt: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Nda;

  const buffer = await renderToBuffer(<NdaPDF nda={blank} />);
  const safe = client.name.replace(/[^\w.-]+/g, "_");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${inline ? "inline" : "attachment"}; filename="NDA-${safe}-blank.pdf"`,
      "cache-control": "no-store",
    },
  });
}
