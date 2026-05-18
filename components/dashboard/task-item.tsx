"use client";

import { useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge, statusBadgeTone } from "@/components/dashboard/badge";
import { cn, formatDate, isOverdue } from "@/lib/utils";
import { toggleTaskStatus } from "@/app/dashboard/tasks/actions";
import { toast } from "sonner";
import type { Task, WorkspaceMember } from "@/lib/db/schema";

const barColors: Record<string, string> = {
  high: "bg-red-500/70",
  medium: "bg-amber-500/70",
  low: "bg-emerald-500/70",
};

export function TaskItem({
  task,
  members,
}: {
  task: Task;
  members: WorkspaceMember[];
}) {
  const [isPending, startTransition] = useTransition();
  const assignee = members.find((m) => m.id === task.assignedTo);
  const overdue = task.status === "open" && isOverdue(task.dueDate);
  const done = task.status === "done";

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 rounded-md px-3 py-2 pl-4 transition-colors hover:bg-hover",
        done && "opacity-60"
      )}
    >
      <span
        className={cn(
          "absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full",
          barColors[task.priority]
        )}
      />
      <Checkbox
        checked={done}
        disabled={isPending}
        onCheckedChange={(v) =>
          startTransition(async () => {
            const result = await toggleTaskStatus(task.id, v ? "done" : "open");
            if (result.error) toast.error(result.error);
          })
        }
      />
      <div className="flex-1 min-w-0">
        <div className={cn("text-sm truncate", done && "line-through")}>{task.title}</div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span className={cn(overdue && "text-danger-foreground")}>
            {task.dueDate ? formatDate(task.dueDate) : "No due date"}
          </span>
          {assignee ? (
            <span className="inline-flex items-center gap-1">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[9px] font-medium uppercase">
                {assignee.avatarInitials}
              </span>
              <span>{assignee.displayName}</span>
            </span>
          ) : null}
        </div>
      </div>
      <Badge tone={statusBadgeTone[task.priority]}>{task.priority}</Badge>
    </div>
  );
}
