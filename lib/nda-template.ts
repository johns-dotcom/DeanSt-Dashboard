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
  const recipientName = f.recipientName.trim() || "RECIPIENT";
  const effectiveDate = fmtDate(f.effectiveDate);
  // Addresses are optional. When present the party clause carries its address
  // ("of <addr>" / "located at <addr>"); when blank the whole clause is dropped
  // so the recital reads cleanly instead of leaving a blank underscore.
  const ownerClause = f.ownerAddress.trim()
    ? `${ownerName} (the "Owner"), of ${f.ownerAddress.trim()}`
    : `${ownerName} (the "Owner")`;
  const recipientClause = f.recipientAddress.trim()
    ? `${recipientName} (the "Recipient"), located at ${f.recipientAddress.trim()}`
    : `${recipientName} (the "Recipient")`;
  // The signatory is optional: when the owner signs in their own name, leave
  // the signatory fields blank and the "on behalf of" clause is dropped — the
  // agreement is simply executed by the Owner. A signatory name with no
  // position still reads cleanly (no dangling comma).
  const sigName = f.ownerSignatoryName.trim();
  const sigPosition = f.ownerSignatoryPosition.trim();
  const executedBy = sigName
    ? `${sigName}${sigPosition ? `, ${sigPosition},` : ""} on behalf of ${ownerName}`
    : ownerName;
  const termYears = f.termYears || DEFAULT_TERM_YEARS;
  const survivalYears = f.survivalYears || DEFAULT_SURVIVAL_YEARS;
  const governingLaw = f.governingLaw.trim() || DEFAULT_GOVERNING_LAW;
  const extra = f.additionalClauses.trim();
  const sigNum = extra ? "XIV" : "XIII";

  const paras: string[] = [
    "NON-DISCLOSURE AGREEMENT",
    `This Non-disclosure Agreement (this "Agreement") is made effective as of ${effectiveDate} (the "Effective Date"), by and between ${ownerClause} and ${recipientClause}.`,
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
    `${sigNum}. SIGNATORIES. This Agreement shall be executed by ${executedBy} and ${recipientName} and delivered in the manner prescribed by law as of the date first written above.`
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

/**
 * Everyoung LLC / Winnie Harlow confidentiality agreement — transcribed from
 * the client's own PDF, so the wording is theirs and must stay verbatim. Only
 * the effective date and the recipient's name are filled in; every other term
 * (perpetual obligations, New York law) is fixed by the template, which is why
 * the Winnie Harlow subpage hides the owner and term fields.
 */
export function buildWinnieHarlowBody(f: NdaTemplateFields): string {
  const recipient = f.recipientName.trim() || BLANK;
  const date = fmtDate(f.effectiveDate);

  const paras: string[] = [
    "CONFIDENTIALITY AGREEMENT",
    `This Confidentiality Agreement ("Agreement") is made and effective as of ${date} by and on behalf of ${recipient} ("you"). As used in this Agreement, the term "you" shall include you, your estate, each and every corporation and/or other business entity in which you have an ownership or beneficial interest and any and all persons and/or entities owned and/or controlled by you and/or such businesses (e.g., affiliates, employees, officers, directors, managers, accountants and agents), and all of your respective heirs, executors, representatives, administrators, employees, licensees, successors and assigns. For good and valuable consideration (collectively, the "Consideration") provided by or on behalf of Everyoung LLC ("Company") and Chantelle Whitney Brown-Young p/k/a "Winnie Harlow" ("Artist"), the receipt and sufficiency of which is hereby acknowledged by you, you hereby irrevocably and perpetually agree as follows:`,
    "1. You hereby expressly acknowledge and agree that the privacy of Artist is highly valued and all efforts will be made to maintain confidentiality with respect to all information and other material of any kind (including without limitation, the terms and conditions of, as well as the existence of, this Agreement) concerning and/or related to (directly and/or indirectly) Artist, Company and/or any person, firm, partnership, corporation and/or any other entity in any way related to or affiliated and/or associated with Company and/or Artist personally and/or professionally (including without limitation, Artist's family members, fiancés, ex-fiancés, boyfriends, ex-boyfriends, friends and relatives, business associates, prospective business associates, guest and anyone else you may come into contact with the course of your dealings with Artist) (collectively, the \"Artist Parties\"), except for information or material publicly and intentionally disclosed by Artist. Accordingly, you hereby irrevocably and perpetually agree that: (a) You shall not at any time or disclose, directly or indirectly, to anyone any of the following described information: any information acquired by you in any manner whatsoever at any time the past, present and/or future which concerns or in any way relates to Artist, the Artist Parties and/or Artist's business activities, entertainment activities, financial affairs and/or personal life, and all such information shall be deemed to be confidential, private, secret and sensitive and shall be kept by you confidential and secret unless Artist otherwise advises you in writing in his sole discretion; (b) Any and all information described in subparagraph 1(a) above, including without limitation, any and all pictures, recordings, records, documents, property, merchandise or other information related to Artist and/or Artist's and/or the Artist Parties' personal, professional and/or other activities, whether prepared by or on behalf of you or otherwise coming into your possession, is and shall remain Artist's sole and exclusive property and shall not be disclosed, removed, sold, disseminated, copied or otherwise used and/or exploited by or on behalf of you without Artist's prior written consent; (c) Without limiting the foregoing, you shall not (and shall not authorize any other person and/or entity to) photograph, tape, film or otherwise record: (i) any sound, likeness and/or activities of Artist and/or the Artist Parties of any kind or nature, whether personal, professional or otherwise (including without limitation, any appearance and/or performance by Artist or any rehearsals therefor); and/or (ii) any other activities during or related to any service or activity performed by Artist and/or the Artist Parties; (d) Without limitation of the foregoing, you shall not (and shall not authorize or facilitate any third party to), without Artist's prior written consent (which may be withheld for any or no reason), give any interviews (whether oral or written), write or prepare or assist in the preparation of any books or articles (whether fictional or nonfictional), make any remarks of any kind, or create any other materials in any media (including without limitation, confirming and/or denying any confidential information related to Artist and/or the Artist Parties) to or for use by yourself and/or any other person or entity (including but not limited to the print and/or broadcast media), which interviews, books, articles, remarks and/or materials concern, discuss or reference Artist and/or Artist Parties in any manner whatsoever (all information and materials referenced in paragraph 1(a)-(d) being the \"Prohibited Material\") (and without limiting the foregoing, (i) you hereby irrevocably and perpetually grant, convey, transfer and assign to Artist all worldwide right, title and interest [including all copyrights and any renewal, extension or similar rights] in and to any Prohibited Material, whether or not the same are used and/or exploited and regardless of the medium involved, and Artist may register such copyright in his own name [or the name of any designee], and (ii) without limitation of any other rights or remedies of Artist and/or Artist Parties, Artist and/or the Artist Parties shall be entitled to recover any and all monies or other benefits whatsoever received by or on behalf of you, from any and all sources, in connection with any use and/or dissemination by or on behalf of you of any confidential information described herein and/or Prohibited Material hereunder, and any such monies or other benefits so received by or on behalf of you shall be held, in trust, by or on behalf of you for immediate payment to Artist and/or the Artist Parties); and (e) Without limiting the generality of this paragraph 1, you shall not at any time defame or disparage Artist and/or the Artist Parties and/or use, disclose, disseminate or confirm, directly or indirectly, to anyone any information or material which may harm, disparage, demean or reflect negatively or poorly upon or cause injury to the reputation, character or career of Artist and/or any of the Artist Parties. The foregoing expressly includes, without limitation, communications appearing on the Internet via blogging and/or social networking sites such as Facebook and Twitter.",
    "2. You acknowledge that, due to the particular nature of the entertainment industry, any disclosure or dissemination by you of any of the information or material described in paragraph 1 above will deprive Artist and/or the Artist Parties of the right to use such information or material. Therefore, you expressly agree that in the event you breach or threaten to breach any covenant in paragraph 1, Artist and/or the Artist Parties would suffer immediate irreparable harm and injury which could not be adequately compensated by an award of monetary damage. Accordingly, in addition to any and all other rights or remedies available to Artist and/or the Artist Parties, Artist and/or the Artist Parties shall be entitled to injunctive relief and all other remedies provided in such event by law or equity. Such remedies shall include, without limitation, the right to prevent the dissemination of any information or materials described in paragraph 1 above, before such information or materials are published. You agree to execute any documents and take such other actions as may be reasonably requested by Artist and/or the Artist Parties to further evidence or effectuate Artist's and/or the Artist Parties' rights set forth in this Agreement. You hereby appoint Artist as your attorney-in-fact (which appointment is irrevocable and coupled with an interest) with full power of substitution and delegation to execute any and all such documents which you fail to execute, and to do any and all such other acts that you fail to do promptly within five (5) days after Artist and/or any Artist Party's reasonable request therefor.",
    "3. You acknowledge and agree that (i) you have carefully read and fully understand all of the terms of this Agreement, (ii) this Agreement contains your and Artist's entire understanding relating to the subject matter hereof and cannot be changed or terminated, except by an instrument signed by you and Artist and (iii) you have signed this Agreement voluntarily, without duress, coercion or undue influence. This Agreement shall be deemed to have been entered into in the State of New York, and the validity, interpretation and legal effect of this Agreement shall be governed by the laws of the State of New York applicable to contracts entered into and performed entirely within such state. The New York courts, only, will have jurisdiction of any controversies regarding this Agreement; and any action or other proceeding which involves such a controversy will be brought in the courts located within the State of New York, and not elsewhere. Accordingly, both you and Artist hereby consent to the personal jurisdiction of such court and waive any objection based on personal jurisdiction, venue or forum non conveniens. This Agreement embodies our entire agreement with respect to the subject matter hereof. This Agreement shall inure to the benefit of, and be binding upon, the parties hereto and their respective heirs, executors, administrators, representatives, members, owners, shareholders, licensees, designees, successors and assigns. Faxed, scanned and similar photocopied signatures of this Agreement shall be deemed effective as originals.",
    "4. All covenants, terms, restrictions and other provisions contained in this Agreement are severable, and if any covenant, term, restriction and/or other provision of this Agreement is held by a court of competent jurisdiction (or by any other legally constituted body having competent jurisdiction to make such determination) (a \"Competent Judicial Authority\") to be invalid, void or unenforceable, such covenant, term, restriction or other provision shall be amended to the extent necessary to be valid and enforceable to the maximum extent possible, and the remainder of the covenants, terms, restrictions and provisions contained in this Agreement shall remain in full force and effect and shall in no way be affected, impaired or invalidated. Without limiting the foregoing, if any Competent Judicial Authority determines that any covenant, term, restriction or other provision of this Agreement, or any part thereof, is unenforceable because of the scope (geographic or otherwise), duration or other term of the same, the scope, duration or other unenforceable term (as the case may be) of such covenant, term, restriction or other provision shall be reduced in a manner so that such covenant, term, restriction or other provision becomes enforceable to the maximum extent possible hereunder and, in its reduced form, such covenant, term, restriction or other provision shall then be enforceable and shall be enforced. Accordingly, the parties acknowledge that any Competent Judicial Authority shall be empowered to modify such invalid, illegal or unenforceable covenant, term, restriction and/or other provision (if any) in accordance with the terms and conditions of this paragraph.",
    "IN WITNESS WHEREOF, the undersigned has executed this Agreement as of the day and year first above written.",
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
