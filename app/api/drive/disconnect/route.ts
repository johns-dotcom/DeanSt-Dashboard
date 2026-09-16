import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/workspace";
import { DRIVE_SCOPE, googleAccountFor } from "@/lib/google/token";

export const runtime = "nodejs";

/**
 * Drops Drive from the stored grant so the app stops using it. Deliberately
 * does NOT call Google's revoke endpoint: that would kill the whole grant,
 * including the gmail.send scope invites depend on. Fully revoking access is a
 * one-click job in the user's own Google account settings.
 */
export async function POST() {
  const session = await requireSession();
  const account = await googleAccountFor(session.user.id);
  if (!account) return NextResponse.json({ error: "No Google account linked" }, { status: 400 });

  const remaining = (account.scope ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .filter((s) => s !== DRIVE_SCOPE)
    .join(" ");

  await db
    .update(accounts)
    .set({ scope: remaining })
    .where(and(eq(accounts.userId, session.user.id), eq(accounts.provider, "google")));

  return NextResponse.json({ ok: true });
}
