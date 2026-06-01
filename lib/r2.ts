/**
 * R2 client using temporary S3 credentials minted from a cfat_ API token.
 *
 * The new Cloudflare unified API tokens (cfat_...) authenticate to
 * `api.cloudflare.com` but NOT to the S3-compatible endpoint. To use
 * the S3 endpoint we mint short-lived Access Key ID + Secret + Session
 * Token via:
 *   POST /accounts/{account_id}/r2/temp-access-credentials
 *   { bucket, parentAccessKeyId, permission, ttlSeconds }
 *
 * Required parent-token permission: "Workers R2 Storage Bucket Item"
 * with Read + Edit — exactly what the user's token has.
 *
 * Credentials get cached in-process until ~30s before expiry, then
 * silently refreshed on next use.
 */

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

interface TempCreds {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiresAt: number; // unix ms
}

declare global {
  // eslint-disable-next-line no-var
  var __r2Creds: TempCreds | undefined;
  // eslint-disable-next-line no-var
  var __r2Client: S3Client | undefined;
  // eslint-disable-next-line no-var
  var __r2ClientCredsAt: number | undefined;
}

async function mintTempCredentials(): Promise<TempCreds> {
  if (!accountId) throw new Error("R2 not configured: missing R2_ACCOUNT_ID");
  if (!apiToken) throw new Error("R2 not configured: missing R2_BEARER_TOKEN");

  const ttlSeconds = 3600; // max allowed by Cloudflare
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/temp-access-credentials`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      bucket: r2Bucket,
      permission: "object-read-write",
      ttlSeconds,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`R2 temp-access-credentials ${res.status}: ${text.slice(0, 300) || res.statusText}`);
  }

  const data = (await res.json()) as {
    success?: boolean;
    errors?: { code?: number; message?: string }[];
    result?: { accessKeyId?: string; secretAccessKey?: string; sessionToken?: string };
  };

  if (data.success === false || !data.result?.accessKeyId || !data.result?.secretAccessKey || !data.result?.sessionToken) {
    const errs = (data.errors ?? []).map((e) => `${e.code ?? ""} ${e.message ?? ""}`.trim()).join("; ");
    throw new Error(`R2 temp-access-credentials returned no creds: ${errs || JSON.stringify(data).slice(0, 200)}`);
  }

  return {
    accessKeyId: data.result.accessKeyId,
    secretAccessKey: data.result.secretAccessKey,
    sessionToken: data.result.sessionToken,
    expiresAt: Date.now() + ttlSeconds * 1000,
  };
}

async function getCreds(): Promise<TempCreds> {
  const cached = globalThis.__r2Creds;
  if (cached && cached.expiresAt - Date.now() > 30_000) return cached;
  const fresh = await mintTempCredentials();
  globalThis.__r2Creds = fresh;
  // Force a new S3Client next time so it picks up the new creds
  globalThis.__r2Client = undefined;
  globalThis.__r2ClientCredsAt = undefined;
  return fresh;
}

async function client(): Promise<S3Client> {
  if (!endpoint) throw new Error("R2 not configured: missing R2_ACCOUNT_ID or R2_ENDPOINT");
  const creds = await getCreds();
  if (
    globalThis.__r2Client &&
    globalThis.__r2ClientCredsAt === creds.expiresAt
  ) {
    return globalThis.__r2Client;
  }
  globalThis.__r2Client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
      sessionToken: creds.sessionToken,
    },
    forcePathStyle: true,
  });
  globalThis.__r2ClientCredsAt = creds.expiresAt;
  return globalThis.__r2Client;
}

export async function putObject(key: string, body: Buffer | Uint8Array, contentType: string) {
  const c = await client();
  await c.send(
    new PutObjectCommand({
      Bucket: r2Bucket,
      Key: key,
      Body: body,
      ContentType: contentType || "application/octet-stream",
    })
  );
}

export async function getObject(key: string): Promise<{ body: ArrayBuffer; contentType: string | null }> {
  const c = await client();
  const res = await c.send(new GetObjectCommand({ Bucket: r2Bucket, Key: key }));
  if (!res.Body) throw new Error(`R2 GET ${key}: empty body`);
  const arr = await res.Body.transformToByteArray();
  const buf = new ArrayBuffer(arr.byteLength);
  new Uint8Array(buf).set(arr);
  return { body: buf, contentType: res.ContentType ?? null };
}

export async function deleteObject(key: string) {
  const c = await client();
  await c.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: key }));
}
