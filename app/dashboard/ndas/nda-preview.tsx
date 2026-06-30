import { parseNdaBody, isNdaSubparagraph } from "@/lib/nda-template";

export interface NdaDraft {
  recipientName: string;
  recipientAddress: string;
  effectiveDate: string;
  ownerName: string;
  ownerAddress: string;
  ownerSignatoryName: string;
  ownerSignatoryPosition: string;
  disclosingToName: string;
  purpose: string;
  termYears: number;
  survivalYears: number;
  governingLaw: string;
  additionalClauses: string;
  bodyText: string;
}

export interface NdaFormat {
  titleUnderline: boolean;
  paragraphIndent: boolean;
}

const isSubsection = (header: string | null) => Boolean(header && /^[A-Z]\.\s/.test(header));

export function NdaPreviewPanel({
  body,
  signatureLines,
  format,
}: {
  body: string;
  signatureLines: string[];
  format: NdaFormat;
}) {
  const blocks = parseNdaBody(body);

  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid var(--hair)",
        borderRadius: 10,
        padding: "36px 44px",
        fontFamily: "Times New Roman, Times, serif",
        fontSize: 12,
        lineHeight: 1.55,
        color: "#1a1a1a",
      }}
    >
      {blocks.map((b, i) => {
        if (b.kind === "title") {
          return (
            <h1
              key={i}
              style={{
                fontSize: 14,
                fontWeight: format.titleUnderline ? 400 : 700,
                textDecoration: format.titleUnderline ? "underline" : "none",
                textAlign: "center",
                margin: "0 0 18px",
              }}
            >
              {b.text}
            </h1>
          );
        }
        // A standalone heading (e.g. "W I T N E S S E T H:") renders centered.
        if (b.header && !b.body) {
          return (
            <p
              key={i}
              style={{
                textAlign: "center",
                fontWeight: 700,
                textDecoration: format.titleUnderline ? "underline" : "none",
                margin: "14px 0",
              }}
            >
              {b.header}
            </p>
          );
        }
        const indent = format.paragraphIndent ? (isNdaSubparagraph(b.body) ? 48 : 28) : 0;
        return (
          <p
            key={i}
            style={{
              marginBottom: 12,
              textAlign: "justify",
              whiteSpace: "pre-wrap",
              textIndent: indent,
              marginLeft: isSubsection(b.header) ? 16 : 0,
            }}
          >
            {b.header ? <b>{b.header}</b> : null}
            {b.header && b.body ? " " : null}
            {b.body}
          </p>
        );
      })}

      <div style={{ marginTop: 28 }}>
        {signatureLines.map((line, i) =>
          line ? (
            <p key={i} style={{ margin: 0, lineHeight: 1.9, fontWeight: /:$/.test(line) ? 700 : 400 }}>
              {line}
            </p>
          ) : (
            <div key={i} style={{ height: 10 }} />
          )
        )}
      </div>
    </section>
  );
}
