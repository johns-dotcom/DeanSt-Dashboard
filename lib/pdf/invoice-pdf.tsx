import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Invoice } from "@/lib/db/schema";
import { payableToLines, type InvoicePaymentInfo } from "@/lib/invoice-payment";

// The PDF is a point-for-point translation of the on-screen preview
// (app/dashboard/invoices/invoice-preview.tsx) so a downloaded invoice looks
// like the one the sender approved in the app. Keep the two in step: sizes here
// are the preview's px values at ~0.75 (px → pt), and the palette below is the
// app's --ink/--hair tokens flattened onto white (react-pdf has no CSS vars).
const INK = "#1a1612";
const INK_SOFT = "#716f6c";
const INK_FAINT = "#a8a6a5";
const HAIR = "#e8e8e7";
const NAVY = "#1d3c8e";
const WHITE = "#ffffff";

// `.mono` in globals.css is uppercase Arial — not a monospaced face — so the
// label styles below use Helvetica with textTransform, not Courier.
const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: "Helvetica", color: INK, lineHeight: 1.4 },
  // lineHeight is pinned here because the page's 1.4 leading leaves this
  // 27pt line under-measured, and the NO. line lands on top of the glyphs.
  title: { fontFamily: "Helvetica-Bold", fontSize: 27, lineHeight: 1.2, letterSpacing: -0.5, marginTop: 11 },
  meta: { fontSize: 8, letterSpacing: 1.9, textTransform: "uppercase", color: INK_SOFT, marginTop: 5 },
  rule: { borderTopWidth: 1, borderTopColor: HAIR, marginVertical: 15 },
  columns: { flexDirection: "row", gap: 24 },
  sectionLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    letterSpacing: 1.35,
    textTransform: "uppercase",
  },
  billTo: { marginTop: 6, fontSize: 10, color: INK_SOFT },
  payableLine: { fontSize: 8.5, letterSpacing: 0.7, textTransform: "uppercase" },
  dueRow: { flexDirection: "row", alignItems: "baseline", gap: 10 },
  dueValue: { fontSize: 8.5, letterSpacing: 1.35, textTransform: "uppercase", color: INK_SOFT },
  tableHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7.5,
    borderBottomWidth: 1,
    borderBottomColor: HAIR,
    fontFamily: "Helvetica-Bold",
  },
  tr: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    paddingVertical: 7.5,
    borderBottomWidth: 1,
    borderBottomColor: HAIR,
    color: INK_SOFT,
  },
  notes: { fontSize: 8.5, color: INK_FAINT, marginTop: 2 },
  taxRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, color: INK_SOFT },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  issued: { marginTop: 15, fontSize: 9, color: INK_FAINT },
});

// Amounts render as "10,000.00 $" — the trailing-symbol form the preview uses.
function money(value: number) {
  return (
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
      .format(value)
      .replace("$", "") + " $"
  );
}

// Parse calendar-only strings (YYYY-MM-DD) in local time so they don't drift
// back a day in timezones west of UTC.
function parseDate(d: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(d);
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(parseDate(d));
}

function fmtLongDate(d?: string | null) {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parseDate(d));
}

// The Dean St "site logo" pill, rebuilt with react-pdf box primitives so it
// renders crisply in the PDF without rasterizing an SVG (which would need a
// server-side canvas). Mirrors the SignPlate component: navy fill, white
// keyline, navy outer ring.
function BrandPlate() {
  return (
    <View style={{ alignSelf: "flex-start", backgroundColor: NAVY, borderRadius: 3, padding: 1.5 }}>
      <View
        style={{
          backgroundColor: NAVY,
          borderWidth: 1.5,
          borderColor: WHITE,
          borderRadius: 2.5,
          paddingTop: 5,
          paddingBottom: 6,
          paddingHorizontal: 12,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Text style={{ color: WHITE, fontFamily: "Helvetica-Bold", fontSize: 15, letterSpacing: 0.3 }}>DEAN ST</Text>
        <Text style={{ color: WHITE, fontFamily: "Helvetica", fontSize: 7, letterSpacing: 0.6, marginLeft: 4, marginBottom: 2, opacity: 0.85 }}>CO</Text>
      </View>
    </View>
  );
}

export function InvoicePDF({
  invoice,
  payment,
}: {
  invoice: Invoice;
  payment: InvoicePaymentInfo;
}) {
  const subtotal = Number(invoice.subtotal);
  const tax = Number(invoice.taxRate);
  const total = Number(invoice.total);
  const billToLines = [invoice.client, ...(invoice.description ? invoice.description.split("\n") : [])];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <BrandPlate />
        <Text style={styles.title}>INVOICE</Text>
        <Text style={styles.meta}>NO.: {invoice.invoiceNumber.replace(/^[A-Z]+-?/, "")}</Text>
        <Text style={[styles.meta, { marginTop: 2 }]}>PURCHASE ORDER #: N/A</Text>

        <View style={styles.rule} />

        <View style={styles.columns}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionLabel}>Bill To:</Text>
            <View style={styles.billTo}>
              {billToLines.map((line, i) => (
                <Text key={i}>{line || " "}</Text>
              ))}
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionLabel}>Funds payable to:</Text>
            <View style={{ marginTop: 6 }}>
              {payableToLines(payment).map((line, i) => (
                <Text key={i} style={styles.payableLine}>{line || " "}</Text>
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.rule, { marginVertical: 16 }]} />

        <View style={styles.dueRow}>
          <Text style={styles.sectionLabel}>Due by:</Text>
          <Text style={styles.dueValue}>{fmtDate(invoice.dueDate)}</Text>
        </View>
        {invoice.paymentTerms?.trim() ? (
          <View style={[styles.dueRow, { marginTop: 4 }]}>
            <Text style={styles.sectionLabel}>Payment terms:</Text>
            <Text style={styles.dueValue}>{invoice.paymentTerms}</Text>
          </View>
        ) : null}

        <View style={{ marginTop: 16 }}>
          <View style={styles.tableHead}>
            <Text>Description</Text>
            <Text>Amount Due</Text>
          </View>
          {invoice.lineItems.map((it, idx) => (
            <View key={idx} style={styles.tr}>
              <View style={{ flex: 1 }}>
                <Text>{it.description || "Description"}</Text>
                {it.notes ? <Text style={styles.notes}>{it.notes}</Text> : null}
              </View>
              <Text>{money(Number(it.amount || it.quantity * it.rate))}</Text>
            </View>
          ))}

          {/* The preview has no tax row because a draft carries no tax. Show
              subtotal + tax here only when the saved invoice actually has a
              rate, so a taxed total is never presented without its basis. */}
          {tax > 0 ? (
            <>
              <View style={styles.taxRow}>
                <Text>Subtotal</Text>
                <Text>{money(subtotal)}</Text>
              </View>
              <View style={styles.taxRow}>
                <Text>Tax · {tax}%</Text>
                <Text>{money((subtotal * tax) / 100)}</Text>
              </View>
            </>
          ) : null}

          <View style={styles.totalRow}>
            <Text>TOTAL DUE</Text>
            <Text>{money(total)}</Text>
          </View>
        </View>

        <Text style={styles.issued}>{fmtLongDate(invoice.issuedDate)}</Text>
      </Page>
    </Document>
  );
}
