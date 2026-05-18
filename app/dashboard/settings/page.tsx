import { and, asc, desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/workspace";
import { db } from "@/lib/db";
import { workspaceInvites, workspaceMembers, users } from "@/lib/db/schema";
import { SectionCard } from "@/components/dashboard/section-card";
import { AppearanceSettings } from "./appearance-settings";
import { ProfileForm } from "./profile-form";
import { TeamSettings } from "./team-settings";
import { WorkspaceSettings } from "./workspace-settings";
import { AuthSettings } from "./auth-settings";

export default async function SettingsPage() {
  const session = await requireSession();
  const isAdmin = session.member.role === "admin";

  const [memberRows, invites] = await Promise.all([
    db
      .select({
        id: workspaceMembers.id,
        workspaceId: workspaceMembers.workspaceId,
        userId: workspaceMembers.userId,
        role: workspaceMembers.role,
        displayName: workspaceMembers.displayName,
        avatarInitials: workspaceMembers.avatarInitials,
        createdAt: workspaceMembers.createdAt,
        updatedAt: workspaceMembers.updatedAt,
        email: users.email,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, session.workspace.id))
      .orderBy(asc(workspaceMembers.createdAt)),
    isAdmin
      ? db
          .select()
          .from(workspaceInvites)
          .where(
            and(eq(workspaceInvites.workspaceId, session.workspace.id), eq(workspaceInvites.accepted, false))
          )
          .orderBy(desc(workspaceInvites.createdAt))
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-5 max-w-3xl">
      <SectionCard title="Appearance">
        <AppearanceSettings />
      </SectionCard>

      <SectionCard title="Profile">
        <ProfileForm displayName={session.member.displayName} />
      </SectionCard>

      <SectionCard title="Team members">
        <TeamSettings
          members={memberRows}
          invites={invites}
          currentMemberId={session.member.id}
          isAdmin={isAdmin}
        />
      </SectionCard>

      <SectionCard title="Workspace">
        <WorkspaceSettings workspace={session.workspace} disabled={!isAdmin} />
      </SectionCard>

      <SectionCard title="Authentication">
        <AuthSettings workspace={session.workspace} disabled={!isAdmin} />
      </SectionCard>
    </div>
  );
}
