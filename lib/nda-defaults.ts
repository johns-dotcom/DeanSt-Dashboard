/**
 * Default values for the editable NDA terms. Used to prefill the form, fall
 * back when a stored value is empty, and keep the PDF + preview + form in sync.
 * The standard 13 clauses themselves remain fixed in lib/pdf/nda-pdf.tsx — only
 * these key terms (and an optional additional-clauses block) are user-editable.
 */
export const DEFAULT_PURPOSE =
  "the development of artists, marketing plans, business development and overall company strategy";
export const DEFAULT_TERM_YEARS = 2;
export const DEFAULT_SURVIVAL_YEARS = 2;
export const DEFAULT_GOVERNING_LAW = "California";
