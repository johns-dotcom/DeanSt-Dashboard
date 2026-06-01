/**
 * R2 client using the standard S3-compatible API with Access Key ID +
 * Secret Access Key. The cleanest path when you already have legacy R2
 * tokens (e.g. minted via Cloudflare's older UI or another project).
 *
 * Required env vars:
 *   R2_ACCOUNT_ID         (32-char hex from R2 dashboard)
 *   R2_ACCESS_KEY_ID      (32-char hex)
 *   R2_SECRET_ACCESS_KEY  (64-char hex)
 *   R2_BUCKET             (bucket name, defaults to "deanst")
 *
 * The Worker fallback (workers/r2-proxy/) is still in the repo if these
 * credentials are unavailable — flip R2_WORKER_URL + R2_WORKER_SECRET
 * to use it instead.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID ?? "";
const accessKeyId = process.env.R2_ACCESS_KEY_ID ?? "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? "";
export const r2Bucket = process.env.R2_BUCKET ?? "deanst";

const endpoint =
  process.env.R2_ENDPOINT?.replace(/\/+$/, "") ||
  (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");

declare global {
  // eslint-disable-next-line no-var
  var __r2Client: S3Client | undefined;
}

function client(): S3Client {
  if (globalThis.__r2Client) return globalThis.__r2Client;
  if (!endpoint) throw new Error("R2 not configured: missing R2_ACCOUNT_ID or R2_ENDPOINT");
  if (!accessKeyId) throw new Error("R2 not configured: missing R2_ACCESS_KEY_ID");
  if (!secretAccessKey) throw new Error("R2 not configured: missing R2_SECRET_ACCESS_KEY");
  globalThis.__r2Client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
  return globalThis.__r2Client;
}

export async function putObject(key: string, body: Buffer | Uint8Array, contentType: string) {
  await client().send(
    new PutObjectCommand({
      Bucket: r2Bucket,
      Key: key,
      Body: body,
      ContentType: contentType || "application/octet-stream",
    })
  );
}

export async function getObject(key: string): Promise<{ body: ArrayBuffer; contentType: string | null }> {
  const res = await client().send(new GetObjectCommand({ Bucket: r2Bucket, Key: key }));
  if (!res.Body) throw new Error(`R2 GET ${key}: empty body`);
  const arr = await res.Body.transformToByteArray();
  const buf = new ArrayBuffer(arr.byteLength);
  new Uint8Array(buf).set(arr);
  return { body: buf, contentType: res.ContentType ?? null };
}

export async function deleteObject(key: string) {
  await client().send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: key }));
}
