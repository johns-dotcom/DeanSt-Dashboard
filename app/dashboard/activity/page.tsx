import { desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/workspace";
import { db } from "@/lib/db";
import { activityEvents } from "@/lib/db/schema";
import { ActivityClient } from "./activity-client";

export const metadata = { title: "Activity · Dean St" };

export default async function ActivityPage() {
  const session = await requireSession();

  const rows = await db
    .select()
    .from(activityEvents)
    .where(eq(activityEvents.workspaceId, session.workspace.id))
    .orderBy(desc(activityEvents.createdAt))
    .limit(500);

  return <ActivityClient events={rows} />;
}
