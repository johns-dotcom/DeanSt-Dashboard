import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Nda } from "@/lib/db/schema";
import { parseNdaBody, type NdaTemplateFields } from "@/lib/nda-template";
import { getNdaClient } from "@/lib/nda-clients";

const styles = StyleSheet.create({
  page: { padding: 64, fontSize: 11, fontFamily: "Times-Roman", color: "#1a1a1a", lineHeight: 1.5 },
  title: { fontSize: 13, fontFamily: "Times-Bold", textAlign: "center", marginBottom: 18 },
  paragraph: { marginBottom: 10, textAlign: "justify" },
  indent: { marginLeft: 14 },
  bold: { fontFamily: "Times-Bold" },
  signatureBlock: { marginTop: 20 },
  signatureLine: { lineHeight: 1.8 },
  signatureGap: { height: 10 },
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
  const client = getNdaClient(nda.clientSlug);
  const body = nda.bodyText?.trim() ? nda.bodyText : client.buildBody(ndaToFields(nda));
  const blocks = parseNdaBody(body);
  const signatureLines = client.signatureLines({ recipientName: nda.recipientName ?? "" });

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
          {signatureLines.map((line, i) =>
            line ? (
              <Text key={i} style={[styles.signatureLine, /:$/.test(line) ? styles.bold : {}]}>{line}</Text>
            ) : (
              <View key={i} style={styles.signatureGap} />
            )
          )}
        </View>
      </Page>
    </Document>
  );
}
