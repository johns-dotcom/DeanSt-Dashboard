/**
 * Single source of truth for the NDA body text.
 *
 * `buildNdaBody` generates the full editable agreement body from the structured
 * fields — used to seed a new NDA and to power "Reset to template". Once a body
 * exists it is freely editable; the preview and PDF render whatever is stored.
 *
 * `parseNdaBody` turns the body string into render-agnostic blocks so the HTML
 * preview and the react-pdf document render it identically: the opening title is
 * centered, a leading section marker (I. / II. / A. …) up to its first period or
 * colon renders bold, and line breaks within a block (e.g. bulleted lists) are
 * preserved. The signature block is appended automatically by the renderers.
 */
import {
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
  const recipientAddress = f.recipientAddress.trim() || BLANK;
  const effectiveDate = fmtDate(f.effectiveDate);
  const signatoryName = f.ownerSignatoryName.trim() || BLANK;
  const signatoryPosition = f.ownerSignatoryPosition.trim() || BLANK;
  const termYears = f.termYears || DEFAULT_TERM_YEARS;
  const survivalYears = f.survivalYears || DEFAULT_SURVIVAL_YEARS;
  const governingLaw = f.governingLaw.trim() || DEFAULT_GOVERNING_LAW;
  const extra = f.additionalClauses.trim();
  const sigNum = extra ? "XIV" : "XIII";

  const paras: string[] = [
    "NON-DISCLOSURE AGREEMENT",
    `This Non-disclosure Agreement (this "Agreement") is made effective as of ${effectiveDate} (the "Effective Date"), by and between ${ownerName} (the "Owner"), of ${ownerAddress} and ${recipientName} (the "Recipient"), located at ${recipientAddress}.`,
    `The Owner has requested and the Recipient agrees that the Recipient will protect the confidential material and information which may be disclosed between the Owner and the Recipient. Therefore, the parties agree as follows:`,
    `I. CONFIDENTIAL INFORMATION. The term "Confidential Information" means any information or material which is proprietary to the Owner, whether or not owned or developed by the Owner, which is not generally known other than by the Owner, and which the Recipient may obtain through any direct or indirect contact with the Owner. Regardless of whether specifically identified as confidential or proprietary, Confidential Information shall include any information provided by the Owner concerning the business, technology and information of the Owner and any third party with which the Owner deals, including, without limitation, business records and plans, trade secrets, technical data, product ideas, contracts, financial information, pricing structure, discounts, computer programs and listings, source code and/or object code, copyrights and intellectual property, inventions, sales leads, strategic alliances, partners, and customer and client lists. The nature of the information and the manner of disclosure are such that a reasonable person would understand it to be confidential.`,
    `A. "Confidential Information" does not include:\n- matters of public knowledge that result from disclosure by the Owner;\n- information rightfully received by the Recipient from a third party without a duty of confidentiality;\n- information independently developed by the Recipient;\n- information disclosed by operation of law;\n- information disclosed by the Recipient with the prior written consent of the Owner; including bank statements, invoices, and any financial documents.\nand any other information that both parties agree in writing is not confidential.`,
    `II. PROTECTION OF CONFIDENTIAL INFORMATION. The Recipient understands and acknowledges that the Confidential Information has been developed or obtained by the Owner by the investment of significant time, effort and expense, and that the Confidential Information is a valuable, special and unique asset of the Owner which provides the Owner with a significant competitive advantage, and needs to be protected from improper disclosure. In consideration for the receipt by the Recipient of the Confidential Information, the Recipient agrees as follows:`,
    `A. No Disclosure. The Recipient will hold the Confidential Information in confidence and will not disclose the Confidential Information to any person or entity without the prior written consent of the Owner.`,
    `B. No Copying/Modifying. The Recipient will not copy or modify any Confidential Information without the prior written consent of the Owner.`,
    `C. Unauthorized Use. The Recipient shall promptly advise the Owner if the Recipient becomes aware of any possible unauthorized disclosure or use of the Confidential Information.`,
    `D. Application to Employees. The Recipient shall not disclose any Confidential Information to any employees of the Recipient, except those employees who are required to have the Confidential Information in order to perform their job duties in connection with the limited purposes of this Agreement. Each permitted employee to whom Confidential Information is disclosed shall sign a non-disclosure agreement substantially the same as this Agreement at the request of the Owner.`,
    `III. UNAUTHORIZED DISCLOSURE OF INFORMATION - INJUNCTION. If it appears that the Recipient has disclosed (or has threatened to disclose) Confidential Information in violation of this Agreement, the Owner shall be entitled to an injunction to restrain the Recipient from disclosing the Confidential Information in whole or in part. The Owner shall not be prohibited by this provision from pursuing other remedies, including a claim for losses and damages.`,
    `IV. RETURN OF CONFIDENTIAL INFORMATION. Upon the written request of the Owner, the Recipient shall return to the Owner all written materials containing the Confidential Information. The Recipient shall also deliver to the Owner written statements signed by the Recipient certifying that all materials have been returned within five (5) days of receipt of the request.`,
    `V. RELATIONSHIP OF PARTIES. Neither party has an obligation under this Agreement to purchase any service or item from the other party, or commercially offer any products using or incorporating the Confidential Information. This Agreement does not create any agency, partnership, or joint venture.`,
    `VI. NO WARRANTY. The Recipient acknowledges and agrees that the Confidential Information is provided on an "AS IS" basis. THE OWNER MAKES NO WARRANTIES, EXPRESS OR IMPLIED, WITH RESPECT TO THE CONFIDENTIAL INFORMATION AND HEREBY EXPRESSLY DISCLAIMS ANY AND ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. IN NO EVENT SHALL THE OWNER BE LIABLE FOR ANY DIRECT, INDIRECT, SPECIAL, OR CONSEQUENTIAL DAMAGES IN CONNECTION WITH OR ARISING OUT OF THE PERFORMANCE OR USE OF ANY PORTION OF THE CONFIDENTIAL INFORMATION. The Owner does not represent or warrant that any product or business plans disclosed to the Recipient will be marketed or carried out as disclosed, or at all. Any actions taken by the Recipient in response to the disclosure of the Confidential Information shall be solely at the risk of the Recipient.`,
    `VII. LIMITED LICENSE TO USE. The Recipient shall not acquire any intellectual property rights under this Agreement except the limited right to use as set forth above. The Recipient acknowledges that, as between the Owner and the Recipient, the Confidential Information and all related copyrights and other intellectual property rights, are (and at all times will be) the property of the Owner, even if suggestions, comments, and/or ideas made by the Recipient are incorporated into the Confidential Information or related materials during the period of this Agreement.`,
    `VIII. INDEMNITY. Each party agrees to defend, indemnify, and hold harmless the other party and its officers, directors, agents, affiliates, distributors, representatives, and employees from any and all third party claims, demands, liabilities, costs and expenses, including reasonable attorney's fees, costs and expenses resulting from the indemnifying party's material breach of any duty, representation, or warranty under this Agreement.`,
    `IX. ATTORNEY'S FEES. In any legal action between the parties concerning this Agreement, the prevailing party shall be entitled to recover reasonable attorney's fees and costs.`,
    `X. TERM. The obligations of this Agreement shall survive ${termYears} ${termYears === 1 ? "Year" : "Years"} from the Effective Date or until the Owner sends the Recipient written notice releasing the Recipient from this Agreement. After that, the Recipient must continue to protect the Confidential Information that was received during the term of this Agreement from unauthorized use or disclosure for an additional ${survivalYears} ${survivalYears === 1 ? "year" : "years"}.`,
    `XI. GENERAL PROVISIONS. This Agreement sets forth the entire understanding of the parties regarding confidentiality. Any amendments must be in writing and signed by both parties. This Agreement shall be construed under the laws of the State of ${governingLaw}. This Agreement shall not be assignable by either party. Neither party may delegate its duties under this Agreement without the prior written consent of the other party. The confidentiality provisions of this Agreement shall remain in full force and effect at all times in accordance with the term of this Agreement. If any provision of this Agreement is held to be invalid, illegal or unenforceable, the remaining portions of this Agreement shall remain in full force and effect and construed so as to best effectuate the original intent and purpose of this Agreement.`,
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

// Grimes "Confidentiality Agreement" template — a distinct artist-privacy
// agreement (Claire Elise Boucher p/k/a Grimes as "Artist"). The only
// variables are the effective date and the recipient ("you").
export function buildGrimesBody(f: NdaTemplateFields): string {
  const recipient = f.recipientName.trim() || "____________";
  const date = fmtDate(f.effectiveDate);

  const paras: string[] = [
    "Confidentiality Agreement",
    `Agreement made as of ${date} by and between Claire Elise Boucher p/k/a Grimes ("Artist"), and ${recipient} ("you").`,
    "W I T N E S S E T H:",
    `For good and valuable consideration, the receipt and sufficiency of which is hereby acknowledged by you, you and Artist hereby agree as follows:`,
    `1. You hereby expressly acknowledge and agree that Artist's privacy is highly valued and that all efforts will be made to maintain confidentially with respect to all information and other material of any kind concerning Artist, except for information or material publicly and intentionally disclosed by Artist. Accordingly, you hereby irrevocably and perpetually agree that:`,
    `(a) You shall not at any time use or disclose, directly or indirectly, to anyone any information (whether such information is in written, oral, photographic, audio and/or audiovisual in nature) at any time acquired by you in the course of or in connection with your employment or engagement by, or business or personal relationship with, an "Interested Party", (including from a prior or future employment by, or business relationship with, an Interested Party, if any), or otherwise acquired at any time, in any way relating to: Artist, Artist's entertainment activities or any other services or activities of Artist, Artist's personal life, Artist's business and financial affairs, or the business, financial or personal affairs any person, firm, corporation or other entity associated with or related to Artist, including, without limitation, Artist's family, friends, associates, employees, acquaintances, representatives, management, affiliated entities or companies ("Related Entities"), and all such information shall be deemed to be confidential, private, secret and sensitive and shall be kept by you confidential and secret unless Artist otherwise advises you in writing. You warrant and represent that prior to the date of execution hereof, you have not made any use of, or disclosed any information described above in this paragraph 1(a). As used herein, the term "Interested Party" shall refer to and include Artist, any entity affiliated or associated with Artist, or with whom any of the foregoing has a contractual, business or other relationship. For clarification, nothing contained herein shall require any Interested Party to enter into any agreement with you.`,
    `(b) Any and all information described in subparagraph 1(a) above, including, without limitation, any and all pictures, recordings, documents, or other information, whether prepared by you or otherwise coming into your possession, is and shall remain Artist's sole and exclusive property and shall not be used, disclosed, removed or copied by you without Artist's prior written consent. Without limiting the foregoing, you shall not photograph, tape, film or otherwise record: (A) any likeness or activities of Artist; or (B) any other activities during or related to any service or activity performed by Artist; and to the extent that you may have done so prior to the date of execution hereof, you shall immediately upon execution hereof deliver all such material to Artist or Artist's designees, and/or to the extent you do so in the future, you will deliver all such materials to Artist or Artist's designees promptly after the creation of such materials.`,
    `(c) Further, you shall not, without Artist's prior written consent: (i) photograph, record, film and/or tape Artist in any capacity; or (ii) give any interviews (whether oral or written), write or prepare or assist in the preparation of any books or articles, or make any remarks of any kind, which interviews, books, articles or remarks concern or discuss Artist, Artist and/or any of the information described in paragraph 1(a) and (b) above.`,
    `(d) (i) You acknowledge that, due to the particular nature of the entertainment industry, any disclosure or dissemination by you of any of the information or material described in this paragraph 1 will deprive Artist of the right to use such information or material. Therefore, it would be important and necessary to prevent you from disclosing or disseminating such information or material. You also understand that it may be necessary to have a court order to stop you from doing such acts.`,
    `(ii) Therefore, you expressly agree that in the event you shall breach or threaten to breach any covenant, warranty and/or representation contained in this paragraph 1, Artist would suffer immediate irreparable harm and injury which could not be adequately compensated by an award of monetary damage. Accordingly, in addition to any and all other rights or remedies available to Artist, Artist shall be entitled to injunctive relief and all other remedies provided in such event by law or equity. Such remedies shall include, without limitation, the right to prevent the dissemination of any information or materials described in this paragraph 1 and its subparagraphs, before such information or materials are published or are so disseminated. Further, in the event that you shall breach or threaten to breach any covenant, warranty and/or representation contained in this paragraph 1 and its subparagraphs, without limiting any other rights or remedies Artist may have, you shall be required to pay to Artist damages in an amount to be determined by a court of competent jurisdiction. Finally, you expressly agree that, also without limiting any other rights or remedies, Artist may have, Artist shall be entitled to recover any and all monies or other benefits whatsoever received by you or on your behalf from any and all sources in connection with any use or dissemination by you of any information or material so described in this paragraph 1 and that any such monies or other benefits so received by you or on your behalf shall be held, in trust, by you or on your behalf for immediate payment over to Artist.`,
    `2. The parties acknowledge and agree that their obligations under this agreement shall remain perpetually binding, and, without limitation of the foregoing, shall survive the termination of any current engagement by an Interested Party. Such obligations shall apply equally to any prior engagement or future engagement by an Interested Party without the necessity of further agreement, and shall likewise remain perpetually binding.`,
    `3. To the extent you use any equipment, materials and/or other personal property owned and/or supplied by you in connection with the rendition of any services provided by you, it is expressly understood and agreed that neither Artist nor any Related Entity shall be providing or obtaining any insurance coverage to insure against the loss, theft or damage of any such equipment, materials and/or personal property owned and/or supplied by you in connection with the rendition of services by you, and all liability whatsoever in connection therewith shall be your sole responsibility.`,
    `4. This agreement contains your and Artist's entire understanding relating to the subject matter hereof and cannot be changed or terminated, except by an instrument signed by you and Artist. This agreement shall be deemed to have been entered into in the State of California, and the validity, interpretation and legal effect of this agreement shall be governed by the laws of the State of California applicable to contracts entered into and performed entirely within the State of California. The California courts, only, will have jurisdiction of any controversies regarding this agreement; and any action or other proceeding which involves such a controversy will be brought in the courts located within Los Angeles County, State of California, and not elsewhere. If any term, restriction, covenant or agreement hereunder is deemed invalid or unenforceable, all other terms, restrictions, covenants and agreements hereunder shall remain in full force and effect. In the event either party takes any action to enforce this Agreement against the other party, in addition to any other remedies, the non-breaching party shall be entitled to an award of its' reasonable attorneys' fees and expenses. As used in this agreement, the term "you" shall include each and every corporation or other entity in which you have an ownership or beneficial interest and each of your employees, contractors and other personnel.`,
    `IN WITNESS WHEREOF, the parties hereto have executed this Agreement as of the day and year first above written.`,
  ];

  return paras.join("\n\n");
}

// A subparagraph in the legal-indent style — starts with a parenthesized
// marker like "(a)" or "(ii)" — indents further than a numbered paragraph.
export function isNdaSubparagraph(text: string): boolean {
  return /^\s*\(/.test(text);
}

export type NdaBlock =
  | { kind: "title"; text: string }
  | { kind: "para"; header: string | null; body: string };

// Leading section marker: a roman numeral or a single capital letter + period.
const MARKER_RE = /^((?:[IVXLCDM]+|[A-Z])\.)\s+([\s\S]*)$/;

function isAllCaps(s: string): boolean {
  return /[A-Z]/.test(s) && !/[a-z]/.test(s);
}

export function parseNdaBody(body: string): NdaBlock[] {
  const blocks = body
    .split(/\n\s*\n/)
    .map((b) => b.replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n").trim())
    .filter(Boolean);

  return blocks.map((block, i): NdaBlock => {
    const nl = block.indexOf("\n");
    const firstLine = nl === -1 ? block : block.slice(0, nl);
    const rest = nl === -1 ? "" : block.slice(nl); // keeps leading "\n"

    // The opening line is the document title — centered. Accept either an
    // all-caps heading ("NON-DISCLOSURE AGREEMENT") or a title-case one
    // ("Confidentiality Agreement"); a real sentence (ends in . ! ? :) is not.
    if (i === 0 && !rest && firstLine.length < 80 && !/[.!?:]$/.test(firstLine)) {
      return { kind: "title", text: firstLine };
    }
    // A standalone all-caps line reads as a bold heading.
    if (!rest && isAllCaps(firstLine) && firstLine.length < 80) {
      return { kind: "para", header: firstLine, body: "" };
    }

    const m = MARKER_RE.exec(firstLine);
    if (m) {
      const marker = m[1];
      const after = m[2];
      // Header runs from the marker up to (and including) the first period or
      // colon in the title; everything after is body. The marker's own period
      // is skipped by searching `after`.
      const termIdx = after.search(/[.:]/);
      if (termIdx !== -1) {
        const header = `${marker} ${after.slice(0, termIdx + 1)}`;
        const inline = after.slice(termIdx + 1).trimStart();
        return { kind: "para", header, body: inline + rest };
      }
      return { kind: "para", header: `${marker} ${after}`.trim(), body: rest.replace(/^\n+/, "") };
    }

    return { kind: "para", header: null, body: block };
  });
}
