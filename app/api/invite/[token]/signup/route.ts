import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users, workspaceInvites } from "@/lib/db/schema";

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const body = await request.json().catch(() => ({}));
  const password = body.password as string | undefined;
  const displayName = (body.display_name as string | undefined)?.trim();

  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const [invite] = await db
    .select()
    .from(workspaceInvites)
    .where(eq(workspaceInvites.token, params.token))
    .limit(1);

  if (!invite || invite.accepted) {
    return NextResponse.json({ error: "Invite not valid" }, { status: 404 });
  }

  const [existing] = await db.select().from(users).where(eq(users.email, invite.email)).limit(1);
  if (existing) {
    return NextResponse.json({ error: "An account already exists with this email — try signing in" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await db.insert(users).values({
    email: invite.email,
    name: displayName ?? null,
    passwordHash,
    emailVerified: new Date(),
  });

  return NextResponse.json({ ok: true });
}
