import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";

/**
 * Resolve a valid Google access token for `userId`, refreshing if necessary.
 * Returns null when the user has no linked Google account, or when the refresh
 * grant fails (e.g. they revoked access).
 */
async function getValidAccessToken(userId: string): Promise<string | null> {
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, "google")))
    .limit(1);

  if (!account) return null;

  const now = Math.floor(Date.now() / 1000);
  const stillValid =
    account.access_token && account.expires_at && account.expires_at > now + 60;
  if (stillValid) return account.access_token!;

  if (!account.refresh_token) return account.access_token; // last-resort

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID ?? "",
      client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
      refresh_token: account.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { access_token: string; expires_in?: number };

  await db
    .update(accounts)
    .set({
      access_token: data.access_token,
      expires_at: now + (data.expires_in ?? 3600),
    })
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, "google")));

  return data.access_token;
}

function encodeRfc822({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const boundary = `_dst_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    text,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    html,
    "",
    `--${boundary}--`,
  ].join("\r\n");

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function sendInviteViaGmail({
  fromUserId,
  to,
  subject,
  html,
  text,
}: {
  fromUserId: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: true } | { error: string }> {
  const token = await getValidAccessToken(fromUserId);
  if (!token) {
    return {
      error:
        "Couldn't send the email through Gmail. Sign out and sign back in with Google to refresh permissions, then try again.",
    };
  }

  const raw = encodeRfc822({ to, subject, html, text });

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { error: `Gmail API ${res.status}: ${body.slice(0, 200) || "send failed"}` };
  }

  return { ok: true };
}
