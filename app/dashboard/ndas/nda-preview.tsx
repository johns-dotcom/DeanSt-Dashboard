import { formatDate } from "@/lib/utils";

function blank(v: string | null | undefined) {
  return v && v.trim() ? v.trim() : "____________";
}

export interface NdaDraft {
  recipientName: string;
  recipientAddress: string;
  effectiveDate: string;
  ownerName: string;
  ownerAddress: string;
  ownerSignatoryName: string;
  ownerSignatoryPosition: string;
  disclosingToName: string;
}

export function NdaPreviewPanel({ draft }: { draft: NdaDraft }) {
  const ownerName = blank(draft.ownerName);
  const ownerAddress = blank(draft.ownerAddress);
  const recipientName = blank(draft.recipientName);
  const recipientAddress = blank(draft.recipientAddress);
  const effectiveDate = draft.effectiveDate ? formatDate(draft.effectiveDate, { month: "long", day: "numeric", year: "numeric" }) : "____________";
  const disclosingTo = blank(draft.disclosingToName || draft.ownerSignatoryName);
  const signatoryName = blank(draft.ownerSignatoryName);
  const signatoryPosition = blank(draft.ownerSignatoryPosition);

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
      <h1 style={{ fontSize: 14, fontWeight: 700, textAlign: "center", margin: "0 0 18px" }}>
        NON-DISCLOSURE AGREEMENT
      </h1>
      <p style={{ marginBottom: 12, textAlign: "justify" }}>
        This Non-disclosure Agreement (this &quot;<b>Agreement</b>&quot;) is made effective as of {effectiveDate} (the &quot;Effective Date&quot;), by and between {ownerName} (the &quot;<b>Owner</b>&quot;), of {ownerAddress} and {recipientName} (the &quot;<b>Recipient</b>&quot;), located at {recipientAddress}.
      </p>
      <p style={{ marginBottom: 12, textAlign: "justify" }}>
        Information will be disclosed to {disclosingTo} to determine whether <b>{recipientName}</b> could assist <b>{ownerName}</b> with the development of artists, marketing plans, business development and overall company strategy.
      </p>
      <p style={{ marginBottom: 12, textAlign: "justify" }}>
        The Owner has requested and the Recipient agrees that the Recipient will protect the confidential material and information which may be disclosed between the Owner and the Recipient. Therefore, the parties agree as follows:
      </p>
      <p style={{ marginBottom: 12, textAlign: "justify" }}>
        <b>I. CONFIDENTIAL INFORMATION.</b> The term &quot;Confidential Information&quot; means any information or material which is proprietary to the Owner, whether or not owned or developed by the Owner, which is not generally known other than by the Owner, and which the Recipient may obtain through any direct or indirect contact with the Owner. Regardless of whether specifically identified as confidential or proprietary, Confidential Information shall include any information provided by the Owner concerning the business, technology and information of the Owner and any third party with which the Owner deals, including, without limitation, business records and plans, trade secrets, technical data, product ideas, contracts, financial information, pricing structure, discounts, computer programs and listings, source code and/or object code, copyrights and intellectual property, inventions, sales leads, strategic alliances, partners, and customer and client lists. The nature of the information and the manner of disclosure are such that a reasonable person would understand it to be confidential.
      </p>
      <p style={{ marginBottom: 4, marginLeft: 16 }}>
        <b>A. &quot;Confidential Information&quot;</b> does not include matters of public knowledge, info from third parties without duty of confidentiality, info independently developed, info disclosed by operation of law or with prior written consent, and anything both parties agree in writing is not confidential.
      </p>
      <p style={{ marginBottom: 12, textAlign: "justify", marginTop: 12 }}>
        <b>II. PROTECTION OF CONFIDENTIAL INFORMATION.</b> The Recipient agrees to hold the Confidential Information in confidence, not copy or modify it without consent, promptly advise the Owner of any unauthorized disclosure, and restrict access among the Recipient&apos;s employees to those who need to know.
      </p>
      <p style={{ marginBottom: 12, textAlign: "justify" }}>
        <b>III. INJUNCTION · IV. RETURN OF INFORMATION · V. RELATIONSHIP OF PARTIES · VI. NO WARRANTY · VII. LIMITED LICENSE.</b> Standard protections, return of materials on request, no agency/partnership created, AS-IS Confidential Information, no IP transferred.
      </p>
      <p style={{ marginBottom: 12, textAlign: "justify" }}>
        <b>VIII. INDEMNITY · IX. ATTORNEY&apos;S FEES · X. TERM (2 years + 2 years tail) · XI. GENERAL PROVISIONS (governed by California law) · XII. WHISTLEBLOWER PROTECTION.</b>
      </p>
      <p style={{ marginBottom: 12, textAlign: "justify" }}>
        <b>XIII. SIGNATORIES.</b> This Agreement shall be executed by {signatoryName}, {signatoryPosition}, on behalf of {ownerName} and {recipientName} and delivered in the manner prescribed by law as of the date first written above.
      </p>
      <p style={{ fontSize: 11, color: "#777", marginTop: 8, fontStyle: "italic" }}>
        Preview shows a condensed summary. The downloadable PDF contains the full 5-page agreement.
      </p>

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
