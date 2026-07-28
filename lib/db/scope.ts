import { and, eq, type SQL } from "drizzle-orm";
import { type AnyPgColumn } from "drizzle-orm/pg-core";

/**
 * Tenant-scoping condition helpers. Every workspace-scoped query must filter on
 * workspaceId; these make that filter impossible to forget by construction.
 *
 *   .where(byId(invoices, id, session.workspace.id))
 *   .where(inWorkspace(invoices, session.workspace.id))
 */
type WorkspaceTable = { workspaceId: AnyPgColumn };
type IdWorkspaceTable = WorkspaceTable & { id: AnyPgColumn };

export function inWorkspace(table: WorkspaceTable, workspaceId: string): SQL {
  return eq(table.workspaceId, workspaceId);
}

export function byId(table: IdWorkspaceTable, id: string, workspaceId: string): SQL {
  return and(eq(table.id, id), eq(table.workspaceId, workspaceId))!;
}
