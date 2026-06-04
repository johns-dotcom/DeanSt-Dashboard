import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Nda } from "@/lib/db/schema";

const styles = StyleSheet.create({
  page: { padding: 64, fontSize: 11, fontFamily: "Times-Roman", color: "#1a1a1a", lineHeight: 1.5 },
  title: { fontSize: 13, fontFamily: "Times-Bold", textAlign: "center", marginBottom: 18 },
  paragraph: { marginBottom: 10, textAlign: "justify" },
  bold: { fontFamily: "Times-Bold" },
  italic: { fontFamily: "Times-Italic" },
  sectionTitle: { fontFamily: "Times-Bold", marginTop: 8 },
  subTitle: { fontFamily: "Times-Bold", marginTop: 6 },
  indent: { marginLeft: 14, marginBottom: 4 },
  signatureBlock: { marginTop: 16 },
  signatureLine: { marginTop: 8, marginBottom: 14 },
});

function fmtDate(d?: string | null) {
  if (!d) return "____________";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  const parsed = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(d);
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(parsed);
}

function blank(v?: string | null) {
  return v && v.trim() ? v.trim() : "____________";
}

export function NdaPDF({ nda }: { nda: Nda }) {
  const ownerName = blank(nda.ownerName);
  const ownerAddress = blank(nda.ownerAddress);
  const recipientName = blank(nda.recipientName);
  const recipientAddress = blank(nda.recipientAddress);
  const effectiveDate = fmtDate(nda.effectiveDate);
  const disclosingTo = blank(nda.disclosingToName || nda.ownerSignatoryName);
  const signatoryName = blank(nda.ownerSignatoryName);
  const signatoryPosition = blank(nda.ownerSignatoryPosition);

  return (
    <Document>
      {/* Page 1 */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>NON-DISCLOSURE AGREEMENT</Text>
        <Text style={styles.paragraph}>
          This Non-disclosure Agreement (this &quot;<Text style={styles.bold}>Agreement</Text>&quot;) is made effective as of {effectiveDate} (the &quot;Effective Date&quot;), by and between {ownerName} (the &quot;<Text style={styles.bold}>Owner</Text>&quot;), of {ownerAddress} and {recipientName} (the &quot;<Text style={styles.bold}>Recipient</Text>&quot;), located at {recipientAddress}.
        </Text>
        <Text style={styles.paragraph}>
          Information will be disclosed to {disclosingTo} to determine whether <Text style={styles.bold}>{recipientName}</Text> could assist <Text style={styles.bold}>{ownerName}</Text> with the development of artists, marketing plans, business development and overall company strategy.
        </Text>
        <Text style={styles.paragraph}>
          The Owner has requested and the Recipient agrees that the Recipient will protect the confidential material and information which may be disclosed between the Owner and the Recipient. Therefore, the parties agree as follows:
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>I. CONFIDENTIAL INFORMATION.</Text> The term &quot;Confidential Information&quot; means any information or material which is proprietary to the Owner, whether or not owned or developed by the Owner, which is not generally known other than by the Owner, and which the Recipient may obtain through any direct or indirect contact with the Owner. Regardless of whether specifically identified as confidential or proprietary, Confidential Information shall include any information provided by the Owner concerning the business, technology and information of the Owner and any third party with which the Owner deals, including, without limitation, business records and plans, trade secrets, technical data, product ideas, contracts, financial information, pricing structure, discounts, computer programs and listings, source code and/or object code, copyrights and intellectual property, inventions, sales leads, strategic alliances, partners, and customer and client lists. The nature of the information and the manner of disclosure are such that a reasonable person would understand it to be confidential.
        </Text>
        <Text style={[styles.paragraph, styles.indent]}>
          <Text style={styles.bold}>A. &quot;Confidential Information&quot;</Text> does not include:
        </Text>
        <Text style={[styles.paragraph, styles.indent]}>- matters of public knowledge that result from disclosure by the Owner;</Text>
        <Text style={[styles.paragraph, styles.indent]}>- information rightfully received by the Recipient from a third party without a duty of confidentiality;</Text>
        <Text style={[styles.paragraph, styles.indent]}>- information independently developed by the Recipient;</Text>
        <Text style={[styles.paragraph, styles.indent]}>- information disclosed by operation of law;</Text>
      </Page>

      {/* Page 2 */}
      <Page size="A4" style={styles.page}>
        <Text style={[styles.paragraph, styles.indent]}>- information disclosed by the Recipient with the prior written consent of the Owner; including bank statements, invoices, and any financial documents.</Text>
        <Text style={[styles.paragraph, styles.indent]}>and any other information that both parties agree in writing is not confidential.</Text>

        <Text style={styles.paragraph}>
          <Text style={styles.bold}>II. PROTECTION OF CONFIDENTIAL INFORMATION.</Text> The Recipient understands and acknowledges that the Confidential Information has been developed or obtained by the Owner by the investment of significant time, effort and expense, and that the Confidential Information is a valuable, special and unique asset of the Owner which provides the Owner with a significant competitive advantage, and needs to be protected from improper disclosure. In consideration for the receipt by the Recipient of the Confidential Information, the Recipient agrees as follows:
        </Text>
        <Text style={[styles.paragraph, styles.indent]}>
          <Text style={styles.bold}>A. No Disclosure.</Text> The Recipient will hold the Confidential Information in confidence and will not disclose the Confidential Information to any person or entity without the prior written consent of the Owner.
        </Text>
        <Text style={[styles.paragraph, styles.indent]}>
          <Text style={styles.bold}>B. No Copying/Modifying.</Text> The Recipient will not copy or modify any Confidential Information without the prior written consent of the Owner.
        </Text>
        <Text style={[styles.paragraph, styles.indent]}>
          <Text style={styles.bold}>C. Unauthorized Use.</Text> The Recipient shall promptly advise the Owner if the Recipient becomes aware of any possible unauthorized disclosure or use of the Confidential Information.
        </Text>
        <Text style={[styles.paragraph, styles.indent]}>
          <Text style={styles.bold}>D. Application to Employees.</Text> The Recipient shall not disclose any Confidential Information to any employees of the Recipient, except those employees who are required to have the Confidential Information in order to perform their job duties in connection with the limited purposes of this Agreement. Each permitted employee to whom Confidential Information is disclosed shall sign a non-disclosure agreement substantially the same as this Agreement at the request of the Owner.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>III. UNAUTHORIZED DISCLOSURE OF INFORMATION - INJUNCTION.</Text> If it appears that the Recipient has disclosed (or has threatened to disclose) Confidential Information in violation of this Agreement, the Owner shall be entitled to an injunction to restrain the Recipient from disclosing the Confidential Information in whole or in part. The Owner shall not be prohibited by this provision from pursuing other remedies, including a claim for losses and damages.
        </Text>
      </Page>

      {/* Page 3 */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>IV. RETURN OF CONFIDENTIAL INFORMATION.</Text> Upon the written request of the Owner, the Recipient shall return to the Owner all written materials containing the Confidential Information. The Recipient shall also deliver to the Owner written statements signed by the Recipient certifying that all materials have been returned within five (5) days of receipt of the request.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>V. RELATIONSHIP OF PARTIES.</Text> Neither party has an obligation under this Agreement to purchase any service or item from the other party, or commercially offer any products using or incorporating the Confidential Information. This Agreement does not create any agency, partnership, or joint venture.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>VI. NO WARRANTY.</Text> The Recipient acknowledges and agrees that the Confidential Information is provided on an &quot;AS IS&quot; basis. THE OWNER MAKES NO WARRANTIES, EXPRESS OR IMPLIED, WITH RESPECT TO THE CONFIDENTIAL INFORMATION AND HEREBY EXPRESSLY DISCLAIMS ANY AND ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. IN NO EVENT SHALL THE OWNER BE LIABLE FOR ANY DIRECT, INDIRECT, SPECIAL, OR CONSEQUENTIAL DAMAGES IN CONNECTION WITH OR ARISING OUT OF THE PERFORMANCE OR USE OF ANY PORTION OF THE CONFIDENTIAL INFORMATION. The Owner does not represent or warrant that any product or business plans disclosed to the Recipient will be marketed or carried out as disclosed, or at all. Any actions taken by the Recipient in response to the disclosure of the Confidential Information shall be solely at the risk of the Recipient.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>VII. LIMITED LICENSE TO USE.</Text> The Recipient shall not acquire any intellectual property rights under this Agreement except the limited right to use as set forth above. The Recipient acknowledges that, as between the Owner and the Recipient, the Confidential Information and all related copyrights and other intellectual property rights, are (and at all times will be) the property of the Owner, even if suggestions, comments, and/or ideas made by the Recipient are incorporated into the Confidential Information or related materials during the period of this Agreement.
        </Text>
      </Page>

      {/* Page 4 */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>VIII. INDEMNITY.</Text> Each party agrees to defend, indemnify, and hold harmless the other party and its officers, directors, agents, affiliates, distributors, representatives, and employees from any and all third party claims, demands, liabilities, costs and expenses, including reasonable attorney&apos;s fees, costs and expenses resulting from the indemnifying party&apos;s material breach of any duty, representation, or warranty under this Agreement.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>IX. ATTORNEY&apos;S FEES.</Text> In any legal action between the parties concerning this Agreement, the prevailing party shall be entitled to recover reasonable attorney&apos;s fees and costs.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>X. TERM.</Text> The obligations of this Agreement shall survive 2 Years from the Effective Date or until the Owner sends the Recipient written notice releasing the Recipient from this Agreement. After that, the Recipient must continue to protect the Confidential Information that was received during the term of this Agreement from unauthorized use or disclosure for an additional 2 years.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>XI. GENERAL PROVISIONS.</Text> This Agreement sets forth the entire understanding of the parties regarding confidentiality. Any amendments must be in writing and signed by both parties. This Agreement shall be construed under the laws of the State of California. This Agreement shall not be assignable by either party. Neither party may delegate its duties under this Agreement without the prior written consent of the other party. The confidentiality provisions of this Agreement shall remain in full force and effect at all times in accordance with the term of this Agreement. If any provision of this Agreement is held to be invalid, illegal or unenforceable, the remaining portions of this Agreement shall remain in full force and effect and construed so as to best effectuate the original intent and purpose of this Agreement.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>XII. WHISTLEBLOWER PROTECTION.</Text> This Agreement is in compliance with the Defend Trade Secrets Act and provides civil or criminal immunity to any individual for the disclosure of trade secrets: (i) made in confidence to a federal, state, or local government official, or to an attorney when the disclosure is to report suspected violations of the law; or (ii) in a complaint or other document filed in a lawsuit if made under seal.
        </Text>
      </Page>

      {/* Page 5 - Signatures */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>XIII. SIGNATORIES.</Text> This Agreement shall be executed by {signatoryName}, {signatoryPosition}, on behalf of {ownerName} and {recipientName} and delivered in the manner prescribed by law as of the date first written above.
        </Text>
        <View style={styles.signatureBlock}>
          <Text style={styles.bold}>OWNER:</Text>
          <View style={styles.signatureLine}>
            <Text>By: ______________________</Text>
          </View>
          <View style={styles.signatureLine}>
            <Text>Date: _____________________</Text>
          </View>
        </View>
        <View style={styles.signatureBlock}>
          <Text style={styles.bold}>RECIPIENT:</Text>
          <View style={styles.signatureLine}>
            <Text>By: ______________________</Text>
          </View>
          <View style={styles.signatureLine}>
            <Text>Date: _____________________</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
