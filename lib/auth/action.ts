import { requireEditor, type SessionContext } from "@/lib/auth/workspace";

/**
 * Wraps a mutating server action body: resolves the editor session (rejecting
 * view-only members and redirecting unauthenticated ones — those must propagate,
 * so they run outside the try) and turns any thrown DB/runtime error into a
 * returned { error } instead of an unhandled server-action rejection.
 *
 *   export async function createDeal(input: Input) {
 *     const parsed = schema.safeParse(input);
 *     if (!parsed.success) return { error: ... };
 *     return editorMutation("createDeal", async (session) => {
 *       ...db work...
 *       return { ok: true as const };
 *     });
 *   }
 */
export async function editorMutation<R>(
  label: string,
  handler: (session: SessionContext) => Promise<R>
): Promise<R | { error: string }> {
  const session = await requireEditor();
  try {
    return await handler(session);
  } catch (err) {
    console.error(`[${label}] failed`, err instanceof Error ? err.message : err);
    return { error: "Something went wrong. Please try again." };
  }
}
