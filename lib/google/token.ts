import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { DRIVE_SCOPE, hasScope } from "@/lib/google/scope";

export { DRIVE_SCOPE, hasScope };

/**
 * Google OAuth token handling, shared by the Gmail sender and the Drive client.
 *
 * Sign-in asks only for the scopes the app needs for everyone. Drive is opt-in:
 * a separate incremental-auth flow (/api/drive/connect) adds `drive.file` to the
 * same grant, so nobody is pushed through a Drive consent screen just to log in.
 */

export interface GoogleAccount {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
  scope: string | null;
}

export async function googleAccountFor(userId: string): Promise<GoogleAccount | null> {
  const [account] = await db
    .select({
      access_token: accounts.access_token,
      refresh_token: accounts.refresh_token,
      expires_at: accounts.expires_at,
      scope: accounts.scope,
    })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, "google")))
    .limit(1);
  return account ?? null;
}

export async function hasDriveAccess(userId: string): Promise<boolean> {
  const account = await googleAccountFor(userId);
  return hasScope(account?.scope, DRIVE_SCOPE);
}

/**
 * A valid Google access token for `userId`, refreshing if necessary. Null when
 * the user has no linked Google account, or the refresh grant fails (e.g. they
 * revoked access in their Google settings) — callers surface that as
 * "disconnected" rather than a crash.
 */
export async function getGoogleAccessToken(userId: string): Promise<string | null> {
  const account = await googleAccountFor(userId);
  if (!account) return null;

  const now = Math.floor(Date.now() / 1000);
  const stillValid = account.access_token && account.expires_at && account.expires_at > now + 60;
  if (stillValid) return account.access_token;

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
    .set({ access_token: data.access_token, expires_at: now + (data.expires_in ?? 3600) })
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, "google")));

  return data.access_token;
}
