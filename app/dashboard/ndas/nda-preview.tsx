import { parseNdaBody } from "@/lib/nda-template";

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

const isSubsection = (header: string | null) => Boolean(header && /^[A-Z]\.\s/.test(header));

export function NdaPreviewPanel({ body, signatureLines }: { body: string; signatureLines: string[] }) {
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
            <h1 key={i} style={{ fontSize: 14, fontWeight: 700, textAlign: "center", margin: "0 0 18px" }}>
              {b.text}
            </h1>
          );
        }
        return (
          <p
            key={i}
            style={{
              marginBottom: 12,
              textAlign: "justify",
              whiteSpace: "pre-wrap",
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
