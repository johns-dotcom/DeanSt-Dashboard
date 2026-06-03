import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { workspaceMembers, workspaces, type Workspace, type WorkspaceMember } from "@/lib/db/schema";

export interface SessionContext {
  user: { id: string; email: string; name: string | null };
  member: WorkspaceMember;
  workspace: Workspace;
}

/**
 * Loads the signed-in user, their workspace_member record, and workspace.
 * Redirects to /login if unauthenticated, /onboarding if not yet attached to a workspace.
 */
export async function requireSession(): Promise<SessionContext> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  // When a user has multiple memberships, prefer the workspace with the
  // most members (the shared one) and use oldest-membership as tiebreaker.
  // This avoids stranding users on accidental duplicate solo workspaces.
  const [member] = await db
    .select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(
      sql`(select count(*) from ${workspaceMembers} m2 where m2.workspace_id = ${workspaceMembers.workspaceId}) desc`,
      sql`${workspaceMembers.createdAt} asc`
    )
    .limit(1);

  if (!member) redirect("/onboarding");

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, member.workspaceId))
    .limit(1);

  if (!workspace) redirect("/onboarding");

  return {
    user: {
      id: userId,
      email: session.user.email ?? "",
      name: session.user.name ?? null,
    },
    member,
    workspace,
  };
}

export async function requireAdmin(): Promise<SessionContext> {
  const ctx = await requireSession();
  if (ctx.member.role !== "admin") {
    throw new Error("Only admins can perform this action");
  }
  return ctx;
}

export function initialsFor(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}
