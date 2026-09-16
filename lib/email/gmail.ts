import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getGoogleAccessToken } from "@/lib/google/token";

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
  const token = await getGoogleAccessToken(fromUserId);
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
