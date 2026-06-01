/**
 * R2 client using HTTP Bearer auth against the S3-compatible endpoint.
 *
 * Cloudflare's new unified API tokens (`cfat_...`) authenticate via the
 * Authorization: Bearer header. The legacy Access Key ID + Secret flow is
 * no longer available in the dashboard for newer tenants, and the AWS SDK
 * rejects the 53-char token as an Access Key ID before sending the
 * request. So we talk to R2 with plain fetch() calls.
 *
 * All calls run server-side (Node runtime). The browser never sees the
 * bearer token — uploads, downloads, and deletes proxy through the
 * Next.js API routes.
 */

const accountId = process.env.R2_ACCOUNT_ID ?? "";
const bearerToken = process.env.R2_BEARER_TOKEN ?? process.env.R2_SECRET_ACCESS_KEY ?? "";
export const r2Bucket = process.env.R2_BUCKET ?? "deanst";

const endpointBase =
  process.env.R2_ENDPOINT?.replace(/\/+$/, "") ||
  (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");

function objectUrl(key: string): string {
  if (!endpointBase) throw new Error("R2 not configured: missing R2_ACCOUNT_ID or R2_ENDPOINT");
  if (!r2Bucket) throw new Error("R2 not configured: missing R2_BUCKET");
  if (!bearerToken) throw new Error("R2 not configured: missing R2_BEARER_TOKEN");
  // Encode each path segment but preserve "/" separators
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return `${endpointBase}/${r2Bucket}/${encoded}`;
}

function amzDate(): string {
  // ISO 8601 basic format: YYYYMMDDTHHMMSSZ
  return new Date().toISOString().replace(/[-:]|\.\d{3}/g, "");
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  // R2's S3 endpoint requires these headers on every request even with
  // Bearer auth. UNSIGNED-PAYLOAD opts out of the body-integrity check.
  return {
    authorization: `Bearer ${bearerToken}`,
    "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
    "x-amz-date": amzDate(),
    ...extra,
  };
}

export async function putObject(key: string, body: Buffer | Uint8Array, contentType: string) {
  const ab = new ArrayBuffer(body.byteLength);
  new Uint8Array(ab).set(body);
  const blob = new Blob([ab], { type: contentType || "application/octet-stream" });
  const res = await fetch(objectUrl(key), {
    method: "PUT",
    headers: authHeaders({ "content-type": contentType || "application/octet-stream" }),
    body: blob,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`R2 PUT ${res.status}: ${text.slice(0, 200) || res.statusText}`);
  }
}

export async function getObject(key: string): Promise<{ body: ArrayBuffer; contentType: string | null }> {
  const res = await fetch(objectUrl(key), { method: "GET", headers: authHeaders() });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`R2 GET ${res.status}: ${text.slice(0, 200) || res.statusText}`);
  }
  return { body: await res.arrayBuffer(), contentType: res.headers.get("content-type") };
}

export async function deleteObject(key: string) {
  const res = await fetch(objectUrl(key), { method: "DELETE", headers: authHeaders() });
  // 404 is fine — already gone is the desired state
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "");
    throw new Error(`R2 DELETE ${res.status}: ${text.slice(0, 200) || res.statusText}`);
  }
}
