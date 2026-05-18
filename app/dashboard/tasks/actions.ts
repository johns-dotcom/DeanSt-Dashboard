"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/workspace";
import type { TaskPriority, TaskStatus } from "@/lib/db/schema";

const taskInput = z.object({
  title: z.string().min(1, "Title is required"),
  priority: z.enum(["high", "medium", "low"]),
  due_date: z.string().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  linked_entity_type: z.enum(["invoice", "deal", "contact"]).optional().nullable(),
  linked_entity_id: z.string().uuid().optional().nullable(),
});

export async function createTask(input: z.infer<typeof taskInput>) {
  const parsed = taskInput.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const session = await requireSession();

  await db.insert(tasks).values({
    workspaceId: session.workspace.id,
    title: parsed.data.title,
    priority: parsed.data.priority,
    dueDate: parsed.data.due_date || null,
    assignedTo: parsed.data.assigned_to || session.member.id,
    createdBy: session.member.id,
    linkedEntityType: parsed.data.linked_entity_type || null,
    linkedEntityId: parsed.data.linked_entity_id || null,
    status: "open",
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tasks");
  return { ok: true as const };
}

export async function toggleTaskStatus(taskId: string, status: TaskStatus) {
  const session = await requireSession();
  await db
    .update(tasks)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, session.workspace.id)));
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tasks");
  return { ok: true as const, error: undefined };
}

export async function deleteTask(taskId: string) {
  const session = await requireSession();
  await db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, session.workspace.id)));
  revalidatePath("/dashboard/tasks");
  return { ok: true as const };
}

export async function updateTask(
  taskId: string,
  patch: { title?: string; priority?: TaskPriority; due_date?: string | null; assigned_to?: string | null }
) {
  const session = await requireSession();
  await db
    .update(tasks)
    .set({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
      ...(patch.due_date !== undefined ? { dueDate: patch.due_date } : {}),
      ...(patch.assigned_to !== undefined ? { assignedTo: patch.assigned_to } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, session.workspace.id)));
  revalidatePath("/dashboard/tasks");
  return { ok: true as const };
}
