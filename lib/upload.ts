/**
 * Shared guards for user file uploads (documents, receipts, NDA files) and for
 * serving them back. Two goals:
 *  - Cap size so a single request can't exhaust server memory (files are
 *    buffered fully before hitting R2).
 *  - Keep active content (HTML/SVG/XML/JS) from being stored and later served
 *    inline from our own origin, which would be stored XSS against other
 *    workspace members. Uploads are allowlisted, and even an allowed file is
 *    only ever served inline when its type is render-safe.
 */

export const MAX_UPLOAD_MB = 25;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

// Content types users legitimately upload here: contracts/receipts (PDF),
// scans/screenshots (raster images), and business documents. Deliberately
// excludes text/html, image/svg+xml, and any xml/script type.
const ALLOWED_UPLOAD_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/tiff",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed",
  // Browsers often send this for files with no recognized type. It is never
  // rendered inline by a browser, so it can't be an XSS vector on serve.
  "application/octet-stream",
]);

// Extensions blocked regardless of the declared content type — the type can be
// spoofed, but a .html/.svg served from our origin is the actual danger.
const DANGEROUS_FILENAME = /\.(html?|xht(ml)?|svgz?|xml|js|mjs|mht(ml)?)$/i;

// Types safe to render inline in the browser (no scripting surface).
const INLINE_SAFE_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

/** Returns an error message if the upload should be rejected, else null. */
export function validateUpload(file: Blob, fileName: string): string | null {
  if (file.size === 0) return "File is empty";
  if (file.size > MAX_UPLOAD_BYTES) return `File is too large (max ${MAX_UPLOAD_MB} MB)`;
  if (DANGEROUS_FILENAME.test(fileName.trim())) return "This file type isn't allowed";
  const type = (file.type || "application/octet-stream").toLowerCase().split(";")[0].trim();
  if (!ALLOWED_UPLOAD_TYPES.has(type)) return "This file type isn't allowed";
  return null;
}

/** Chooses a safe Content-Disposition: inline only when requested AND render-safe. */
export function dispositionFor(requestedInline: boolean, contentType: string | null | undefined): "inline" | "attachment" {
  if (!requestedInline) return "attachment";
  const type = (contentType || "").toLowerCase().split(";")[0].trim();
  return INLINE_SAFE_TYPES.has(type) ? "inline" : "attachment";
}
