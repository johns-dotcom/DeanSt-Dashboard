/**
 * R2 client that proxies through a Cloudflare Worker (deanst-r2-proxy)
 * bound directly to the bucket.
 *
 * Why a Worker proxy: Cloudflare's new unified API tokens (cfat_…) can't
 * authenticate against R2's S3 endpoint. The official supported path is
 * to access R2 from a Worker with a native binding. A tiny Worker
 * (workers/r2-proxy/) exposes PUT / GET / DELETE on the bucket, and
 * this module talks to it over HTTPS with a shared secret.
 *
 * Env vars (Railway):
 *   R2_WORKER_URL     e.g. https://deanst-r2-proxy.john.workers.dev
 *   R2_WORKER_SECRET  same value set via `wrangler secret put SHARED_SECRET`
 *   R2_BUCKET         (informational; kept for log paths)
 */

const workerUrl = (process.env.R2_WORKER_URL ?? "").replace(/\/+$/, "");
const sharedSecret = process.env.R2_WORKER_SECRET ?? "";
export const r2Bucket = process.env.R2_BUCKET ?? "deanst";

function objectUrl(key: string): string {
  if (!workerUrl) throw new Error("R2 not configured: missing R2_WORKER_URL");
  if (!sharedSecret) throw new Error("R2 not configured: missing R2_WORKER_SECRET");
  // Each segment of the key is URL-encoded but the slashes are preserved.
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return `${workerUrl}/${encoded}`;
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  return { "x-internal-secret": sharedSecret, ...extra };
}

async function readError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  return text.slice(0, 300) || res.statusText || `HTTP ${res.status}`;
}

export async function putObject(key: string, body: Buffer | Uint8Array, contentType: string) {
  // Normalize to a fresh ArrayBuffer for fetch typing
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
