import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Invoice } from "@/lib/db/schema";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "0.5px solid #ddd",
    paddingBottom: 16,
  },
  brand: { fontSize: 16, fontWeight: 500 },
  brandSub: { fontSize: 8, color: "#666", marginTop: 2 },
  invoiceMeta: { textAlign: "right" },
  metaLabel: { fontSize: 7, textTransform: "uppercase", letterSpacing: 1, color: "#777" },
  metaValue: { fontFamily: "Courier", fontSize: 14, marginTop: 2 },
  small: { fontSize: 8, color: "#666", marginTop: 4 },
  section: { marginTop: 20 },
  sectionLabel: { fontSize: 7, textTransform: "uppercase", letterSpacing: 1, color: "#777" },
  billTo: { marginTop: 4, fontSize: 11, fontWeight: 500 },
  description: { marginTop: 8, fontSize: 9, color: "#666" },
  table: { marginTop: 24, width: "100%" },
  tableHead: { flexDirection: "row", borderBottom: "0.5px solid #ddd", paddingBottom: 6 },
  th: { fontSize: 7, textTransform: "uppercase", letterSpacing: 1, color: "#777" },
  tr: { flexDirection: "row", paddingVertical: 6, borderBottom: "0.5px solid #eee" },
  td: { fontSize: 10 },
  totals: { marginTop: 16, marginLeft: "auto", width: 240 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalsLabel: { color: "#777" },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    marginTop: 4,
    borderTop: "0.5px solid #ddd",
    fontSize: 11,
    fontWeight: 500,
  },
  footer: { marginTop: 36, paddingTop: 16, borderTop: "0.5px solid #ddd", fontSize: 8, color: "#777" },
});

function fmt(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  // Parse calendar-only strings (YYYY-MM-DD) in local time so they
  // don't drift back a day in timezones west of UTC.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  const parsed = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(d);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(parsed);
}

const NAVY = "#1d3c8e";
const WHITE = "#ffffff";

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
  workspaceName,
  paymentTerms,
}: {
  invoice: Invoice;
  workspaceName: string;
  paymentTerms: string;
}) {
  const subtotal = Number(invoice.subtotal);
  const tax = Number(invoice.taxRate);
  const total = Number(invoice.total);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <BrandPlate />
            <Text style={[styles.brand, { marginTop: 10 }]}>{workspaceName} Media</Text>
            <Text style={styles.brandSub}>Operations · {paymentTerms}</Text>
          </View>
          <View style={styles.invoiceMeta}>
            <Text style={styles.metaLabel}>Invoice</Text>
            <Text style={styles.metaValue}>{invoice.invoiceNumber}</Text>
            <Text style={styles.small}>Issued {fmtDate(invoice.issuedDate)}</Text>
            {invoice.dueDate ? <Text style={styles.small}>Due {fmtDate(invoice.dueDate)}</Text> : null}
            <Text style={[styles.small, { marginTop: 6, textTransform: "uppercase" }]}>{invoice.status}</Text>
          </View>
        </View>

        <View style={[styles.section, { flexDirection: "row", gap: 24 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionLabel}>Bill to</Text>
            <Text style={styles.billTo}>{invoice.client}</Text>
            {invoice.description ? <Text style={styles.description}>{invoice.description}</Text> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionLabel}>Funds payable to</Text>
            <Text style={[styles.billTo, { fontSize: 10 }]}>DEAN ST CO</Text>
            <Text style={[styles.description, { marginTop: 4 }]}>CONTACT: JOHN SKEAD</Text>
            <Text style={styles.description}>EMAIL: john@deanst.co</Text>
            <Text style={[styles.sectionLabel, { marginTop: 10 }]}>Payment method</Text>
            <Text style={[styles.description, { marginTop: 4 }]}>JP Morgan Chase</Text>
            <Text style={styles.description}>31250 Palos Verdes Dr W</Text>
            <Text style={styles.description}>Rancho Palos Verdes, CA, 90275</Text>
            <Text style={[styles.description, { marginTop: 6 }]}>Account: 953162333</Text>
            <Text style={styles.description}>Routing: 322271627</Text>
            <Text style={styles.description}>Zelle: (310) 755-8857</Text>
            <Text style={[styles.description, { marginTop: 6 }]}>Payable to Jesse Allen</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.th, { flex: 4 }]}>Description</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Qty</Text>
            <Text style={[styles.th, { flex: 1.5, textAlign: "right" }]}>Rate</Text>
            <Text style={[styles.th, { flex: 1.5, textAlign: "right" }]}>Amount</Text>
          </View>
          {invoice.lineItems.map((it, idx) => (
            <View key={idx} style={styles.tr}>
              <View style={{ flex: 4 }}>
                <Text style={styles.td}>{it.description || "—"}</Text>
                {it.notes ? (
                  <Text style={[styles.td, { fontSize: 8, color: "#888", marginTop: 2 }]}>{it.notes}</Text>
                ) : null}
              </View>
              <Text style={[styles.td, { flex: 1, textAlign: "right" }]}>{it.quantity}</Text>
              <Text style={[styles.td, { flex: 1.5, textAlign: "right" }]}>{fmt(Number(it.rate))}</Text>
              <Text style={[styles.td, { flex: 1.5, textAlign: "right" }]}>{fmt(Number(it.amount || it.quantity * it.rate))}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text>{fmt(subtotal)}</Text>
          </View>
          {tax > 0 ? (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Tax · {tax}%</Text>
              <Text>{fmt(subtotal * tax / 100)}</Text>
            </View>
          ) : null}
          <View style={styles.grandTotal}>
            <Text>Total</Text>
            <Text>{fmt(total)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Payment terms: {paymentTerms}. Please remit by {fmtDate(invoice.dueDate)}.</Text>
        </View>
      </Page>
    </Document>
  );
}
