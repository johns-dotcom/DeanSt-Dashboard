import { asc, desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/workspace";
import { db } from "@/lib/db";
import { activityEvents, workspaceMembers } from "@/lib/db/schema";
import { ActivityClient } from "./activity-client";

export const metadata = { title: "Activity · Dean St" };

export default async function ActivityPage() {
  const session = await requireSession();

  const [events, members] = await Promise.all([
    db
      .select()
      .from(activityEvents)
      .where(eq(activityEvents.workspaceId, session.workspace.id))
      .orderBy(desc(activityEvents.createdAt))
      .limit(500),
    db
      .select({
        id: workspaceMembers.id,
        userId: workspaceMembers.userId,
        displayName: workspaceMembers.displayName,
        avatarInitials: workspaceMembers.avatarInitials,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, session.workspace.id))
      .orderBy(asc(workspaceMembers.displayName)),
  ]);

  return <ActivityClient events={events} members={members} />;
}
