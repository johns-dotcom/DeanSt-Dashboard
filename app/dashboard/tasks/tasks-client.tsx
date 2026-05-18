"use client";

import { useMemo, useState } from "react";
import { Plus, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/dashboard/section-card";
import { TaskItem } from "@/components/dashboard/task-item";
import { EmptyState } from "@/components/dashboard/empty-state";
import { SlideOver, SlideOverContent } from "@/components/dashboard/slide-over";
import { TaskForm } from "./task-form";
import type { Task, WorkspaceMember } from "@/lib/db/schema";

export function TasksClient({
  tasks,
  members,
  currentMemberId,
}: {
  tasks: Task[];
  members: WorkspaceMember[];
  currentMemberId: string;
}) {
  const [openNew, setOpenNew] = useState(false);
  const [assignMode, setAssignMode] = useState(false);

  const { mine, others } = useMemo(() => {
    return {
      mine: tasks.filter((t) => t.assignedTo === currentMemberId),
      others: tasks.filter((t) => t.assignedTo && t.assignedTo !== currentMemberId),
    };
  }, [tasks, currentMemberId]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end gap-2">
        <SlideOver
          open={openNew}
          onOpenChange={(v) => { setOpenNew(v); if (!v) setAssignMode(false); }}
        >
          <Button variant="outline" onClick={() => { setAssignMode(true); setOpenNew(true); }}>Assign task</Button>
          <Button onClick={() => { setAssignMode(false); setOpenNew(true); }}><Plus className="h-4 w-4" /> Add task</Button>
          <SlideOverContent
            title={assignMode ? "Assign task" : "Add task"}
            description={assignMode ? "Create a task for someone else." : "Create a new task."}
          >
            <TaskForm
              members={members}
              defaultAssigneeId={assignMode ? "" : currentMemberId}
              onDone={() => setOpenNew(false)}
            />
          </SlideOverContent>
        </SlideOver>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title={`My tasks · ${mine.length}`}>
          {mine.length === 0 ? (
            <EmptyState
              icon={<CheckSquare className="h-4 w-4" />}
              title="Nothing assigned to you"
              description="Use Add Task to create one."

            />
          ) : (
            <div className="space-y-1">
              {mine.map((t) => <TaskItem key={t.id} task={t} members={members} />)}
            </div>
          )}
        </SectionCard>

        <SectionCard title={`Assigned to others · ${others.length}`}>
          {others.length === 0 ? (
            <EmptyState
              icon={<CheckSquare className="h-4 w-4" />}
              title="No delegated tasks"
              description="Use Assign Task to delegate to a teammate."

            />
          ) : (
            <div className="space-y-1">
              {others.map((t) => <TaskItem key={t.id} task={t} members={members} />)}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
