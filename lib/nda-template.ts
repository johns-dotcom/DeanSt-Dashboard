/**
 * Single source of truth for the NDA body text.
 *
 * `buildNdaBody` generates the full editable agreement body from the structured
 * fields — used to seed a new NDA and to power "Reset to template". Once a body
 * exists it is freely editable; the preview and PDF render whatever is stored.
 *
 * `parseNdaBody` turns the body string into render-agnostic blocks so the HTML
 * preview and the react-pdf document can render it identically (section headers
 * bold, the title centered). The signature block is NOT part of the body — it is
 * appended automatically by the renderers.
 */
import {
  DEFAULT_PURPOSE,
  DEFAULT_GOVERNING_LAW,
  DEFAULT_TERM_YEARS,
  DEFAULT_SURVIVAL_YEARS,
} from "@/lib/nda-defaults";

export interface NdaTemplateFields {
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
}

const BLANK = "____________";

function fmtDate(d: string): string {
  if (!d || !d.trim()) return BLANK;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d.trim());
  const parsed = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(d);
  if (Number.isNaN(parsed.getTime())) return BLANK;
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(parsed);
}

export function buildNdaBody(f: NdaTemplateFields): string {
  const ownerName = f.ownerName.trim() || BLANK;
  const ownerAddress = f.ownerAddress.trim() || BLANK;
  const recipientName = f.recipientName.trim() || "RECIPIENT";
  const recipientAddress = f.recipientAddress.trim();
  const effectiveDate = fmtDate(f.effectiveDate);
  const disclosingTo = f.disclosingToName.trim() || f.ownerSignatoryName.trim() || "RECIPIENT";
  const signatoryName = f.ownerSignatoryName.trim() || BLANK;
  const signatoryPosition = f.ownerSignatoryPosition.trim() || BLANK;
  const purpose = f.purpose.trim() || DEFAULT_PURPOSE;
  const termYears = f.termYears || DEFAULT_TERM_YEARS;
  const survivalYears = f.survivalYears || DEFAULT_SURVIVAL_YEARS;
  const governingLaw = f.governingLaw.trim() || DEFAULT_GOVERNING_LAW;
  const extra = f.additionalClauses.trim();
  const sigNum = extra ? "XIV" : "XIII";

  const paras: string[] = [
    "NON-DISCLOSURE AGREEMENT",
    `This Non-disclosure Agreement (this "Agreement") is made effective as of ${effectiveDate} (the "Effective Date"), by and between ${ownerName} (the "Owner"), of ${ownerAddress} and ${recipientName} (the "Recipient"), located at ${recipientAddress}.`,
    `Information will be disclosed to ${disclosingTo} to determine whether ${recipientName} could assist ${ownerName} with ${purpose}.`,
    `The Owner has requested and the Recipient agrees that the Recipient will protect the confidential material and information which may be disclosed between the Owner and the Recipient. Therefore, the parties agree as follows:`,
    `I. CONFIDENTIAL INFORMATION. The term "Confidential Information" means any information or material which is proprietary to the Owner, whether or not owned or developed by the Owner, which is not generally known other than by the Owner, and which the Recipient may obtain through any direct or indirect contact with the Owner. Regardless of whether specifically identified as confidential or proprietary, Confidential Information shall include any information provided by the Owner concerning the business, technology and information of the Owner and any third party with which the Owner deals, including, without limitation, business records and plans, trade secrets, technical data, product ideas, contracts, financial information, pricing structure, discounts, computer programs and listings, source code and/or object code, copyrights and intellectual property, inventions, sales leads, strategic alliances, partners, and customer and client lists. The nature of the information and the manner of disclosure are such that a reasonable person would understand it to be confidential.`,
    `A. "Confidential Information" does not include matters of public knowledge that result from disclosure by the Owner; information rightfully received by the Recipient from a third party without a duty of confidentiality; information independently developed by the Recipient; information disclosed by operation of law; information disclosed by the Recipient with the prior written consent of the Owner; and any other information that both parties agree in writing is not confidential.`,
    `II. PROTECTION OF CONFIDENTIAL INFORMATION. The Recipient understands and acknowledges that the Confidential Information has been developed or obtained by the Owner by the investment of significant time, effort and expense, and that the Confidential Information is a valuable, special and unique asset of the Owner which provides the Owner with a significant competitive advantage, and needs to be protected from improper disclosure. In consideration for the receipt by the Recipient of the Confidential Information, the Recipient agrees as follows:`,
    `A. No Disclosure. The Recipient will hold the Confidential Information in confidence and will not disclose the Confidential Information to any person or entity without the prior written consent of the Owner.`,
    `B. No Copying/Modifying. The Recipient will not copy or modify any Confidential Information without the prior written consent of the Owner.`,
    `C. Unauthorized Use. The Recipient shall promptly advise the Owner if the Recipient becomes aware of any possible unauthorized disclosure or use of the Confidential Information.`,
    `D. Application to Employees. The Recipient shall not disclose any Confidential Information to any employees of the Recipient, except those employees who are required to have the Confidential Information in order to perform their job duties in connection with the limited purposes of this Agreement.`,
    `III. UNAUTHORIZED DISCLOSURE OF INFORMATION - INJUNCTION. If it appears that the Recipient has disclosed (or has threatened to disclose) Confidential Information in violation of this Agreement, the Owner shall be entitled to an injunction to restrain the Recipient from disclosing the Confidential Information in whole or in part. The Owner shall not be prohibited by this provision from pursuing other remedies, including a claim for losses and damages.`,
    `IV. RETURN OF CONFIDENTIAL INFORMATION. Upon the written request of the Owner, the Recipient shall return to the Owner all written materials containing the Confidential Information. The Recipient shall also deliver to the Owner written statements signed by the Recipient certifying that all materials have been returned within five (5) days of receipt of the request.`,
    `V. RELATIONSHIP OF PARTIES. Neither party has an obligation under this Agreement to purchase any service or item from the other party, or commercially offer any products using or incorporating the Confidential Information. This Agreement does not create any agency, partnership, or joint venture.`,
    `VI. NO WARRANTY. The Recipient acknowledges and agrees that the Confidential Information is provided on an "AS IS" basis. THE OWNER MAKES NO WARRANTIES, EXPRESS OR IMPLIED, WITH RESPECT TO THE CONFIDENTIAL INFORMATION AND HEREBY EXPRESSLY DISCLAIMS ANY AND ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. The Owner does not represent or warrant that any product or business plans disclosed to the Recipient will be marketed or carried out as disclosed, or at all. Any actions taken by the Recipient in response to the disclosure of the Confidential Information shall be solely at the risk of the Recipient.`,
    `VII. LIMITED LICENSE TO USE. The Recipient shall not acquire any intellectual property rights under this Agreement except the limited right to use as set forth above. The Recipient acknowledges that, as between the Owner and the Recipient, the Confidential Information and all related copyrights and other intellectual property rights, are (and at all times will be) the property of the Owner, even if suggestions, comments, and/or ideas made by the Recipient are incorporated into the Confidential Information or related materials during the period of this Agreement.`,
    `VIII. INDEMNITY. Each party agrees to defend, indemnify, and hold harmless the other party and its officers, directors, agents, affiliates, distributors, representatives, and employees from any and all third party claims, demands, liabilities, costs and expenses, including reasonable attorney's fees, resulting from the indemnifying party's material breach of any duty, representation, or warranty under this Agreement.`,
    `IX. ATTORNEY'S FEES. In any legal action between the parties concerning this Agreement, the prevailing party shall be entitled to recover reasonable attorney's fees and costs.`,
    `X. TERM. The obligations of this Agreement shall survive ${termYears} ${termYears === 1 ? "Year" : "Years"} from the Effective Date or until the Owner sends the Recipient written notice releasing the Recipient from this Agreement. After that, the Recipient must continue to protect the Confidential Information that was received during the term of this Agreement from unauthorized use or disclosure for an additional ${survivalYears} ${survivalYears === 1 ? "year" : "years"}.`,
    `XI. GENERAL PROVISIONS. This Agreement sets forth the entire understanding of the parties regarding confidentiality. Any amendments must be in writing and signed by both parties. This Agreement shall be construed under the laws of the State of ${governingLaw}. This Agreement shall not be assignable by either party. If any provision of this Agreement is held to be invalid, illegal or unenforceable, the remaining portions of this Agreement shall remain in full force and effect.`,
    `XII. WHISTLEBLOWER PROTECTION. This Agreement is in compliance with the Defend Trade Secrets Act and provides civil or criminal immunity to any individual for the disclosure of trade secrets: (i) made in confidence to a federal, state, or local government official, or to an attorney when the disclosure is to report suspected violations of the law; or (ii) in a complaint or other document filed in a lawsuit if made under seal.`,
  ];

  if (extra) {
    paras.push(`XIII. ADDITIONAL TERMS. ${extra}`);
  }
  paras.push(
    `${sigNum}. SIGNATORIES. This Agreement shall be executed by ${signatoryName}, ${signatoryPosition}, on behalf of ${ownerName} and ${recipientName} and delivered in the manner prescribed by law as of the date first written above.`
  );

  return paras.join("\n\n");
}

export type NdaBlock =
  | { kind: "title"; text: string }
  | { kind: "para"; header: string | null; body: string };

// A section header is a leading roman-numeral or single-capital marker ("I.",
// "XIV.", "A.") followed by a title that ends at the first period. We bold that
// run; the rest of the paragraph is normal body text.
const HEADER_RE = /^((?:[IVXLCDM]+|[A-Z])\.\s+[^.]*\.)(\s+)([\s\S]*)$/;

function isAllCaps(s: string): boolean {
  return /[A-Z]/.test(s) && !/[a-z]/.test(s);
}

export function parseNdaBody(body: string): NdaBlock[] {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);

  return paragraphs.map((p, i): NdaBlock => {
    // The opening all-caps line is the document title.
    if (i === 0 && isAllCaps(p) && p.length < 80) return { kind: "title", text: p };
    // A standalone all-caps paragraph reads as a bold heading.
    if (isAllCaps(p) && p.length < 80) return { kind: "para", header: p, body: "" };
    const m = HEADER_RE.exec(p);
    if (m) return { kind: "para", header: m[1], body: m[3] };
    return { kind: "para", header: null, body: p };
  });
}
