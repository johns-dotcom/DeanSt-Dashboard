import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/workspace";
import { InvoicePDF } from "@/lib/pdf/invoice-pdf";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  const inline = req.nextUrl.searchParams.get("inline") === "1";

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, params.id), eq(invoices.workspaceId, session.workspace.id)))
    .limit(1);

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const buffer = await renderToBuffer(
    <InvoicePDF
      invoice={invoice}
      workspaceName={session.workspace.name}
      paymentTerms={session.workspace.defaultPaymentTerms}
    />
  );

  // Filename includes the sender (Dean St) and the recipient (Bill To) so
  // downloaded invoices are self-describing: DeanSt_Tyler-Henry_INV-0002.pdf
  const safe = (s: string) => s.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "");
  const recipient = safe(invoice.client) || "Recipient";
  const filename = `DeanSt_${recipient}_${invoice.invoiceNumber}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
