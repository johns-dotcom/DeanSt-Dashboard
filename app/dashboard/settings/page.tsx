import { and, asc, desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/workspace";
import { db } from "@/lib/db";
import { workspaceInvites, workspaceMembers, users } from "@/lib/db/schema";
import { SectionHeader } from "@/components/brand/section-header";
import { PageFooter } from "@/components/brand/page-footer";
import { Eyebrow } from "@/components/brand/eyebrow";
import { AppearanceSettings } from "./appearance-settings";
import { ProfileForm } from "./profile-form";
import { TeamSettings } from "./team-settings";

function SectionCard({ children, padded = true }: { children: React.ReactNode; padded?: boolean }) {
  return (
    <section
      style={{
        background: "var(--paper)",
        border: "1px solid var(--hair)",
        borderRadius: 10,
        padding: padded ? "0" : undefined,
        overflow: "hidden",
      }}
    >
      {children}
    </section>
  );
}

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
      ? db.select().from(workspaceInvites)
          .where(and(eq(workspaceInvites.workspaceId, session.workspace.id), eq(workspaceInvites.accepted, false)))
          .orderBy(desc(workspaceInvites.createdAt))
      : Promise.resolve([]),
  ]);

  return (
    <div
      style={{
        padding: "32px 48px 60px",
        display: "flex",
        flexDirection: "column",
        gap: 36,
        maxWidth: 880,
      }}
    >
      <section>
        <SectionHeader number="01" kicker="Surface" title="Appearance" />
        <SectionCard>
          <AppearanceSettings />
        </SectionCard>
      </section>

      <section>
        <SectionHeader number="02" kicker="You" title="Profile" />
        <SectionCard>
          <div style={{ padding: "22px 26px" }}>
            <Eyebrow size={10}>Display name</Eyebrow>
            <div style={{ marginTop: 10 }}>
              <ProfileForm displayName={session.member.displayName} />
            </div>
          </div>
        </SectionCard>
      </section>

      <section>
        <SectionHeader number="03" kicker="Access" title="Team members" />
        <TeamSettings
          members={memberRows}
          invites={invites}
          currentMemberId={session.member.id}
          isAdmin={isAdmin}
        />
      </section>

      <PageFooter />
    </div>
  );
}
