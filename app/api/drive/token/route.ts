import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/workspace";
import { DRIVE_SCOPE, getGoogleAccessToken, hasDriveAccess } from "@/lib/google/token";

export const runtime = "nodejs";

/**
 * Hands the browser a short-lived access token for the Google Picker, which
 * runs client-side and needs one. Only ever issued to a signed-in member who
 * has connected Drive, and only covers drive.file — the app can still see just
 * the files it created or the user picks.
 */
export async function GET() {
  const session = await requireSession();
  if (!(await hasDriveAccess(session.user.id))) {
    return NextResponse.json({ error: "Drive not connected" }, { status: 403 });
  }
  const token = await getGoogleAccessToken(session.user.id);
  if (!token) {
    return NextResponse.json({ error: "Drive access expired — reconnect" }, { status: 401 });
  }
  return NextResponse.json(
    { token, scope: DRIVE_SCOPE, apiKey: process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY ?? null },
    { headers: { "cache-control": "no-store" } }
  );
}
