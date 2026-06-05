import { NextResponse, type NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers } from "@/lib/db/schema";
import { initialsFor } from "@/lib/auth/workspace";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const workspaceName = (body.workspace_name as string | undefined)?.trim() || "Dean St";
  const displayName = (body.display_name as string | undefined)?.trim() || session.user.name || session.user.email?.split("@")[0] || "Owner";

  const [existing] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, session.user.id))
    .limit(1);
  if (existing) return NextResponse.json({ error: "Already in a workspace" }, { status: 409 });

  // Guard against accidental duplicate workspaces: if a workspace already
  // exists for this user's email domain, join it as a member instead of
  // spinning up a brand-new (often identically-named) one. Only the first
  // user of a domain founds the workspace; everyone after joins it.
  const emailDomain = session.user.email?.split("@")[1]?.toLowerCase() || null;
  if (emailDomain) {
    const [domainWorkspace] = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.domainRestriction, emailDomain))
      // Prefer the most-populated workspace for the domain (the shared one).
      .orderBy(
        sql`(select count(*) from ${workspaceMembers} m where m.workspace_id = ${workspaces.id}) desc`
      )
      .limit(1);
    if (domainWorkspace) {
      await db.insert(workspaceMembers).values({
        workspaceId: domainWorkspace.id,
        userId: session.user.id,
        role: "member",
        displayName,
        avatarInitials: initialsFor(displayName),
      });
      return NextResponse.json({ ok: true, workspace_id: domainWorkspace.id, joined: true });
    }
  }

  // No workspace exists for this domain yet — this user founds it (admin).
  const [workspace] = await db
    .insert(workspaces)
    .values({
      name: workspaceName,
      invoicePrefix: "INV-",
      defaultPaymentTerms: "Net 30",
      domainRestriction: emailDomain ?? "deanst.co",
    })
    .returning();

  await db.insert(workspaceMembers).values({
    workspaceId: workspace.id,
    userId: session.user.id,
    role: "admin",
    displayName,
    avatarInitials: initialsFor(displayName),
  });

  return NextResponse.json({ ok: true, workspace_id: workspace.id });
}
