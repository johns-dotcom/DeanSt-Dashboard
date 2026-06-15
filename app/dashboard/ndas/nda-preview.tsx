import { buildNdaBody, parseNdaBody } from "@/lib/nda-template";

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

export function NdaPreviewPanel({ draft }: { draft: NdaDraft }) {
  const body = draft.bodyText.trim() ? draft.bodyText : buildNdaBody(draft);
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
              marginLeft: isSubsection(b.header) ? 16 : 0,
            }}
          >
            {b.header ? <b>{b.header}</b> : null}
            {b.header && b.body ? " " : null}
            {b.body}
          </p>
        );
      })}

      <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>OWNER:</p>
          <p style={{ marginBottom: 12 }}>By: ______________________</p>
          <p>Date: _____________________</p>
        </div>
        <div>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>RECIPIENT:</p>
          <p style={{ marginBottom: 12 }}>By: ______________________</p>
          <p>Date: _____________________</p>
        </div>
      </div>
    </section>
  );
}
