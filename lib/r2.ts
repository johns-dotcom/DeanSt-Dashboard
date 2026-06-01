/**
 * R2 client using Cloudflare's REST API for object operations.
 *
 * Cloudflare's new unified API tokens (cfat_...) don't work against the
 * S3-compatible endpoint (https://{account}.r2.cloudflarestorage.com).
 * They DO work against Cloudflare's own REST API at
 * https://api.cloudflare.com/client/v4/accounts/{account}/r2/buckets/{bucket}/objects/{key}
 * with Authorization: Bearer {token}. So we use that.
 *
 * All calls are server-side. The browser never sees the token — uploads,
 * downloads, and deletes proxy through the Next.js API routes.
 */

const accountId = process.env.R2_ACCOUNT_ID ?? "";
const apiToken = process.env.R2_BEARER_TOKEN ?? process.env.R2_SECRET_ACCESS_KEY ?? "";
export const r2Bucket = process.env.R2_BUCKET ?? "deanst";

const apiBase = "https://api.cloudflare.com/client/v4";

function objectUrl(key: string): string {
  if (!accountId) throw new Error("R2 not configured: missing R2_ACCOUNT_ID");
  if (!r2Bucket) throw new Error("R2 not configured: missing R2_BUCKET");
  if (!apiToken) throw new Error("R2 not configured: missing R2_BEARER_TOKEN");
  // Encode each path segment but preserve "/" separators within the key
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return `${apiBase}/accounts/${accountId}/r2/buckets/${r2Bucket}/objects/${encoded}`;
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  return { authorization: `Bearer ${apiToken}`, ...extra };
}

async function readError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  if (!text) return res.statusText || `HTTP ${res.status}`;
  try {
    const parsed = JSON.parse(text);
    if (parsed?.errors?.length) {
      return parsed.errors.map((e: { code?: number; message?: string }) => `${e.code ?? ""} ${e.message ?? ""}`.trim()).join("; ");
    }
  } catch {
    /* not JSON, return raw */
  }
  return text.slice(0, 300);
}

export async function putObject(key: string, body: Buffer | Uint8Array, contentType: string) {
  // Normalize to a plain ArrayBuffer-backed view so fetch typings are happy
  const ab = new ArrayBuffer(body.byteLength);
  new Uint8Array(ab).set(body);
  const res = await fetch(objectUrl(key), {
    method: "PUT",
    headers: authHeaders({ "content-type": contentType || "application/octet-stream" }),
    body: new Blob([ab], { type: contentType || "application/octet-stream" }),
  });
  if (!res.ok) {
    throw new Error(`R2 PUT ${res.status}: ${await readError(res)}`);
  }
}

export async function getObject(key: string): Promise<{ body: ArrayBuffer; contentType: string | null }> {
  const res = await fetch(objectUrl(key), { method: "GET", headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`R2 GET ${res.status}: ${await readError(res)}`);
  }
  return { body: await res.arrayBuffer(), contentType: res.headers.get("content-type") };
}

export async function deleteObject(key: string) {
  const res = await fetch(objectUrl(key), { method: "DELETE", headers: authHeaders() });
  if (!res.ok && res.status !== 404) {
    throw new Error(`R2 DELETE ${res.status}: ${await readError(res)}`);
  }
}
