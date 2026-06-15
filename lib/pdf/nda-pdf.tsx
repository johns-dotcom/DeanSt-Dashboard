import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Nda } from "@/lib/db/schema";
import { buildNdaBody, parseNdaBody, type NdaTemplateFields } from "@/lib/nda-template";

const styles = StyleSheet.create({
  page: { padding: 64, fontSize: 11, fontFamily: "Times-Roman", color: "#1a1a1a", lineHeight: 1.5 },
  title: { fontSize: 13, fontFamily: "Times-Bold", textAlign: "center", marginBottom: 18 },
  paragraph: { marginBottom: 10, textAlign: "justify" },
  indent: { marginLeft: 14 },
  bold: { fontFamily: "Times-Bold" },
  signatureBlock: { marginTop: 16 },
  signatureLine: { marginTop: 8, marginBottom: 14 },
});

function ndaToFields(nda: Nda): NdaTemplateFields {
  return {
    recipientName: nda.recipientName ?? "",
    recipientAddress: nda.recipientAddress ?? "",
    effectiveDate: nda.effectiveDate ?? "",
    ownerName: nda.ownerName ?? "",
    ownerAddress: nda.ownerAddress ?? "",
    ownerSignatoryName: nda.ownerSignatoryName ?? "",
    ownerSignatoryPosition: nda.ownerSignatoryPosition ?? "",
    disclosingToName: nda.disclosingToName ?? "",
    purpose: nda.purpose ?? "",
    termYears: nda.termYears,
    survivalYears: nda.survivalYears,
    governingLaw: nda.governingLaw ?? "",
    additionalClauses: nda.additionalClauses ?? "",
  };
}

const isSubsection = (header: string | null) => Boolean(header && /^[A-Z]\.\s/.test(header));

export function NdaPDF({ nda }: { nda: Nda }) {
  const body = nda.bodyText?.trim() ? nda.bodyText : buildNdaBody(ndaToFields(nda));
  const blocks = parseNdaBody(body);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {blocks.map((b, i) => {
          if (b.kind === "title") {
            return <Text key={i} style={styles.title}>{b.text}</Text>;
          }
          const style = isSubsection(b.header) ? [styles.paragraph, styles.indent] : styles.paragraph;
          return (
            <Text key={i} style={style}>
              {b.header ? <Text style={styles.bold}>{b.header}</Text> : null}
              {b.header && b.body ? " " : null}
              {b.body}
            </Text>
          );
        })}

        <View style={styles.signatureBlock} wrap={false}>
          <Text style={styles.bold}>OWNER:</Text>
          <View style={styles.signatureLine}><Text>By: ______________________</Text></View>
          <View style={styles.signatureLine}><Text>Date: _____________________</Text></View>
        </View>
        <View style={styles.signatureBlock} wrap={false}>
          <Text style={styles.bold}>RECIPIENT:</Text>
          <View style={styles.signatureLine}><Text>By: ______________________</Text></View>
          <View style={styles.signatureLine}><Text>Date: _____________________</Text></View>
        </View>
      </Page>
    </Document>
  );
}
