/**
 * R2 client that proxies through a Cloudflare Worker (deanst-r2-proxy)
 * bound directly to the deanst bucket.
 *
 * Cloudflare's new unified API tokens can't access R2's S3 endpoint,
 * and creating bucket-scoped S3 credentials via the new dashboard UI
 * isn't exposed. The Worker has a native R2 binding to the deanst
 * bucket — no tokens, no SigV4, no S3 endpoint, and the binding is
 * scoped to exactly one bucket so nothing leaks across.
 *
 * Setup is one-time, ~5 min: see workers/r2-proxy/README.md.
 *
 * Env vars (Railway):
 *   R2_WORKER_URL     https://deanst-r2-proxy.<sub>.workers.dev
 *   R2_WORKER_SECRET  matches the SHARED_SECRET set in the Worker
 *   R2_BUCKET         informational only (Worker's binding controls the actual bucket)
 */

const workerUrl = (process.env.R2_WORKER_URL ?? "").replace(/\/+$/, "");
const sharedSecret = process.env.R2_WORKER_SECRET ?? "";
export const r2Bucket = process.env.R2_BUCKET ?? "deanst";

function objectUrl(key: string): string {
  if (!workerUrl) throw new Error("R2 not configured: missing R2_WORKER_URL (deploy workers/r2-proxy/ first)");
  if (!sharedSecret) throw new Error("R2 not configured: missing R2_WORKER_SECRET");
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
  const ab = new ArrayBuffer(body.byteLength);
  new Uint8Array(ab).set(body);
  const res = await fetch(objectUrl(key), {
    method: "PUT",
    headers: authHeaders({ "content-type": contentType || "application/octet-stream" }),
    body: new Blob([ab], { type: contentType || "application/octet-stream" }),
  });
  if (!res.ok) throw new Error(`R2 PUT ${res.status}: ${await readError(res)}`);
}

export async function getObject(key: string): Promise<{ body: ArrayBuffer; contentType: string | null }> {
  const res = await fetch(objectUrl(key), { method: "GET", headers: authHeaders() });
  if (!res.ok) throw new Error(`R2 GET ${res.status}: ${await readError(res)}`);
  return { body: await res.arrayBuffer(), contentType: res.headers.get("content-type") };
}

export async function deleteObject(key: string) {
  const res = await fetch(objectUrl(key), { method: "DELETE", headers: authHeaders() });
  if (!res.ok && res.status !== 404) throw new Error(`R2 DELETE ${res.status}: ${await readError(res)}`);
}
