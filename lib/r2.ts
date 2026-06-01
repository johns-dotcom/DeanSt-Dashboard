/**
 * R2 client using SigV4 with credentials derived from the cfat_ API token.
 *
 * Cloudflare's new unified API tokens don't expose Access Key ID + Secret
 * in the dashboard, but the S3 endpoint requires SigV4 (bearer auth is
 * not accepted). Cloudflare's documented derivation for backwards
 * compatibility:
 *   Access Key ID     = first 32 hex chars of SHA-256(token)
 *   Secret Access Key = full 64-char hex SHA-256 digest
 *
 * This produces valid S3 credentials we can hand to the AWS SDK.
 */

import { createHash } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID ?? "";
const apiToken = process.env.R2_BEARER_TOKEN ?? process.env.R2_SECRET_ACCESS_KEY ?? "";
export const r2Bucket = process.env.R2_BUCKET ?? "deanst";

const endpoint =
  process.env.R2_ENDPOINT?.replace(/\/+$/, "") ||
  (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");

function derivedCredentials() {
  if (!apiToken) {
    throw new Error("R2 not configured: missing R2_BEARER_TOKEN");
  }
  const sha = createHash("sha256").update(apiToken).digest("hex");
  return { accessKeyId: sha.slice(0, 32), secretAccessKey: sha };
}

declare global {
  // eslint-disable-next-line no-var
  var __r2Client: S3Client | undefined;
}

function client(): S3Client {
  if (globalThis.__r2Client) return globalThis.__r2Client;
  if (!endpoint) throw new Error("R2 not configured: missing R2_ACCOUNT_ID or R2_ENDPOINT");
  const { accessKeyId, secretAccessKey } = derivedCredentials();
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
