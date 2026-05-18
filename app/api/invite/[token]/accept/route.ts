import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { workspaceInvites, workspaceMembers } from "@/lib/db/schema";
import { initialsFor } from "@/lib/auth/workspace";

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const displayName = (body.display_name as string | undefined) ?? session.user.email.split("@")[0];

  const [invite] = await db
    .select()
    .from(workspaceInvites)
    .where(eq(workspaceInvites.token, params.token))
    .limit(1);

  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (invite.accepted) return NextResponse.json({ error: "Invite already accepted" }, { status: 410 });
  if (invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
    return NextResponse.json({ error: "This invite was sent to a different email" }, { status: 403 });
  }

  const [existingMember] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, invite.workspaceId), eq(workspaceMembers.userId, session.user.id)))
    .limit(1);

  if (!existingMember) {
    await db.insert(workspaceMembers).values({
      workspaceId: invite.workspaceId,
      userId: session.user.id,
      role: invite.role,
      displayName,
      avatarInitials: initialsFor(displayName),
    });
  }

  await db
    .update(workspaceInvites)
    .set({ accepted: true, updatedAt: new Date() })
    .where(eq(workspaceInvites.id, invite.id));

  return NextResponse.json({ ok: true });
}
