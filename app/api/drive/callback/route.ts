import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/workspace";

export const runtime = "nodejs";

/**
 * Completes the Drive grant and folds it into the user's existing Google
 * account row: the scope string gains drive.file and the refresh token is
 * replaced with the one covering both. Gmail keeps working off the same row.
 */
export async function GET(req: NextRequest) {
  const session = await requireSession();
  const settings = new URL("/dashboard/settings", req.nextUrl.origin);

  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    settings.searchParams.set("drive", "denied");
    return NextResponse.redirect(settings);
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.AUTH_GOOGLE_ID ?? "",
      client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
      redirect_uri: new URL("/api/drive/callback", req.nextUrl.origin).toString(),
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    console.error("[drive/callback] token exchange failed", await res.text().catch(() => ""));
    settings.searchParams.set("drive", "error");
    return NextResponse.redirect(settings);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  await db
    .update(accounts)
    .set({
      access_token: data.access_token,
      expires_at: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
      scope: data.scope ?? null,
      ...(data.refresh_token ? { refresh_token: data.refresh_token } : {}),
    })
    .where(and(eq(accounts.userId, session.user.id), eq(accounts.provider, "google")));

  settings.searchParams.set("drive", "connected");
  return NextResponse.redirect(settings);
}
