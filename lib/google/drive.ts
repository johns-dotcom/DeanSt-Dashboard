/**
 * Minimal Google Drive v3 client — plain fetch against the REST API, matching
 * how lib/email/gmail.ts talks to Gmail (no SDK, nothing to keep in lockstep).
 *
 * Every call passes supportsAllDrives so Shared Drives work, not just My Drive:
 * import reads from whatever the person picked (their own Drive or a Shared
 * Drive they can see), while exports are written to the workspace's Shared
 * Drive folder when one is configured.
 */
const DRIVE = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
}

/**
 * Google Docs/Sheets/Slides hold no bytes — they have to be exported to a real
 * format. Everything else downloads as-is. Returns null for a normal file.
 */
export function exportFormatFor(mimeType: string): { mimeType: string; extension: string } | null {
  switch (mimeType) {
    case "application/vnd.google-apps.document":
    case "application/vnd.google-apps.presentation":
    case "application/vnd.google-apps.drawing":
      return { mimeType: "application/pdf", extension: ".pdf" };
    case "application/vnd.google-apps.spreadsheet":
      return {
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        extension: ".xlsx",
      };
    default:
      return null;
  }
}

/** The filename to store, giving exported Google files their new extension. */
export function importedFileName(name: string, mimeType: string): string {
  const format = exportFormatFor(mimeType);
  if (!format) return name;
  return name.toLowerCase().endsWith(format.extension) ? name : `${name}${format.extension}`;
}

export class DriveError extends Error {
  // Declared explicitly rather than as a constructor parameter property: the
  // test runner strips types without transforming, and those aren't supported.
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function driveFetch(token: string, url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new DriveError(`Drive ${res.status}: ${body.slice(0, 200)}`, res.status);
  }
  return res;
}

export async function getFile(token: string, fileId: string): Promise<DriveFile> {
  const url = `${DRIVE}/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size,webViewLink&supportsAllDrives=true`;
  const res = await driveFetch(token, url);
  return (await res.json()) as DriveFile;
}

/** File bytes, exporting Google-native documents on the way out. */
export async function downloadFile(token: string, file: DriveFile): Promise<Buffer> {
  const format = exportFormatFor(file.mimeType);
  const url = format
    ? `${DRIVE}/files/${encodeURIComponent(file.id)}/export?mimeType=${encodeURIComponent(format.mimeType)}`
    : `${DRIVE}/files/${encodeURIComponent(file.id)}?alt=media&supportsAllDrives=true`;
  const res = await driveFetch(token, url);
  return Buffer.from(await res.arrayBuffer());
}

/** A subfolder by name under `parentId`, created if it isn't there yet. */
export async function ensureFolder(token: string, name: string, parentId: string): Promise<string> {
  const q = [
    `name = '${name.replace(/'/g, "\\'")}'`,
    `mimeType = '${FOLDER_MIME}'`,
    `'${parentId}' in parents`,
    "trashed = false",
  ].join(" and ");
  const url =
    `${DRIVE}/files?q=${encodeURIComponent(q)}&fields=files(id,name)` +
    "&supportsAllDrives=true&includeItemsFromAllDrives=true&corpora=allDrives";
  const res = await driveFetch(token, url);
  const found = (await res.json()) as { files: DriveFile[] };
  if (found.files?.length) return found.files[0].id;

  const created = await driveFetch(token, `${DRIVE}/files?supportsAllDrives=true&fields=id`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] }),
  });
  return ((await created.json()) as DriveFile).id;
}

/** Uploads bytes as a new Drive file and returns it, link included. */
export async function uploadFile(
  token: string,
  { name, mimeType, parentId, body }: { name: string; mimeType: string; parentId?: string; body: Buffer }
): Promise<DriveFile> {
  const metadata: Record<string, unknown> = { name };
  if (parentId) metadata.parents = [parentId];

  const boundary = `dst${Math.random().toString(36).slice(2)}`;
  const parts = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`),
    Buffer.from(JSON.stringify(metadata)),
    Buffer.from(`\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    body,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const res = await driveFetch(
    token,
    `${UPLOAD}/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,webViewLink`,
    {
      method: "POST",
      headers: { "content-type": `multipart/related; boundary=${boundary}` },
      body: new Uint8Array(parts),
    }
  );
  return (await res.json()) as DriveFile;
}

/** True when the Picker has what it needs to run in the browser. */
export function pickerConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY);
}
