import { S3Client, DeleteObjectCommand, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID ?? "";
const endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");

export const r2Bucket = process.env.R2_BUCKET ?? "deanst-documents";

export const r2 = new S3Client({
  region: "auto",
  endpoint: endpoint || undefined,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
  // R2 doesn't enforce checksum headers; disable to avoid spurious 501s
  forcePathStyle: true,
});

export async function createUploadUrl(key: string, contentType: string) {
  const cmd = new PutObjectCommand({
    Bucket: r2Bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2, cmd, { expiresIn: 60 * 5 });
}

export async function createDownloadUrl(key: string, fileName: string) {
  const cmd = new GetObjectCommand({
    Bucket: r2Bucket,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${fileName.replace(/"/g, "")}"`,
  });
  return getSignedUrl(r2, cmd, { expiresIn: 60 });
}

export async function deleteObject(key: string) {
  await r2.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: key }));
}
