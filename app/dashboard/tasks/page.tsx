import { asc, eq, sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth/workspace";
import { db } from "@/lib/db";
import { tasks, workspaceMembers } from "@/lib/db/schema";
import { TasksClient } from "./tasks-client";

export default async function TasksPage() {
  const session = await requireSession();
  const wsId = session.workspace.id;

  const [taskRows, members] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(eq(tasks.workspaceId, wsId))
      .orderBy(asc(tasks.status), sql`${tasks.dueDate} asc nulls last`),
    db.select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, wsId)),
  ]);

  return (
    <TasksClient
      tasks={taskRows}
      members={members}
      currentMemberId={session.member.id}
    />
  );
}
