/**
 * NDA client templates. Each client the workspace issues NDAs for gets its own
 * subpage with its own owner identity, body template, and signature block.
 * Code-defined (not a CRUD table) because each is a legally-distinct document.
 * Pure module — safe to import from both server and client components.
 */
import { buildNdaBody, buildGrimesBody, type NdaTemplateFields } from "@/lib/nda-template";

export interface NdaClientConfig {
  slug: string;
  name: string;
  /** Fixed owner/disclosing party. When omitted, the workspace default is used. */
  owner?: { name: string; signatoryName: string; signatoryPosition: string; address?: string };
  /** Whether the form exposes the owner-side fields (hidden when the owner is fixed). */
  showOwnerFields: boolean;
  /** Whether the form exposes the term/survival/governing-law/clauses fields. */
  showTerms: boolean;
  buildBody: (f: NdaTemplateFields) => string;
  /** The signature block, rendered verbatim under the body in preview + PDF. */
  signatureLines: (f: { recipientName: string }) => string[];
}

const DEAN_ST: NdaClientConfig = {
  slug: "dean-st",
  name: "Dean St",
  showOwnerFields: true,
  showTerms: true,
  buildBody: buildNdaBody,
  signatureLines: () => [
    "OWNER:",
    "By: ______________________",
    "Date: _____________________",
    "",
    "RECIPIENT:",
    "By: ______________________",
    "Date: _____________________",
  ],
};

const GRIMES: NdaClientConfig = {
  slug: "grimes",
  name: "Grimes",
  owner: { name: "Claire Elise Boucher p/k/a Grimes", signatoryName: "Claire Elise Boucher", signatoryPosition: "" },
  showOwnerFields: false,
  showTerms: false,
  buildBody: buildGrimesBody,
  signatureLines: (f) => [
    "By: ______________________",
    "Claire Elise Boucher",
    "",
    "ACCEPTED AND AGREED:",
    "",
    "Signature: ______________________",
    `Print Name: ${f.recipientName.trim() || "______________________"}`,
  ],
};

export const NDA_CLIENTS: NdaClientConfig[] = [DEAN_ST, GRIMES];

export const DEFAULT_NDA_CLIENT_SLUG = DEAN_ST.slug;

export function getNdaClient(slug?: string | null): NdaClientConfig {
  return NDA_CLIENTS.find((c) => c.slug === slug) ?? DEAN_ST;
}
