import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/workspace";
import { DRIVE_SCOPE } from "@/lib/google/token";

export const runtime = "nodejs";

/**
 * Starts the incremental-auth flow that adds Drive to an existing Google grant.
 * Kept separate from sign-in so nobody is pushed through a Drive consent screen
 * just to log in — include_granted_scopes keeps the scopes they already have.
 */
export async function GET(req: NextRequest) {
  await requireSession();

  const clientId = process.env.AUTH_GOOGLE_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Google OAuth is not configured" }, { status: 501 });
  }

  const redirectUri = new URL("/api/drive/callback", req.nextUrl.origin).toString();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: DRIVE_SCOPE,
    include_granted_scopes: "true",
    access_type: "offline",
    // Forces a refresh token back even when the user has consented before.
    prompt: "consent",
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
