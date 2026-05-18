import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityEvents, workspaceMembers } from "@/lib/db/schema";
import type { ActivityAction } from "@/lib/activity-format";

export type { ActivityAction } from "@/lib/activity-format";
export { describeActivity, activityCategory } from "@/lib/activity-format";

interface LogInput {
  action: ActivityAction;
  workspaceId?: string | null;
  actorUserId?: string | null;
  actorMemberId?: string | null;
  actorName?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  entityLabel?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Append an activity event. Failure is logged but doesn't propagate —
 * this is a write-side log, not a user-facing operation.
 */
export async function logActivity(input: LogInput) {
  try {
    let actorName = input.actorName ?? null;
    let actorMemberId = input.actorMemberId ?? null;

    if (!actorName && input.actorUserId && input.workspaceId) {
      const [member] = await db
        .select({ id: workspaceMembers.id, displayName: workspaceMembers.displayName })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.userId, input.actorUserId))
        .limit(1);
      if (member) {
        actorMemberId = member.id;
        actorName = member.displayName;
      }
    }

    await db.insert(activityEvents).values({
      workspaceId: input.workspaceId ?? null,
      actorUserId: input.actorUserId ?? null,
      actorMemberId,
      actorName,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      entityLabel: input.entityLabel ?? null,
      metadata: input.metadata ?? null,
    });
  } catch (err) {
    console.error("[activity] log failed", err);
  }
}
