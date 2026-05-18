import { and, eq, sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth/workspace";
import { db } from "@/lib/db";
import { invoices, tasks } from "@/lib/db/schema";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  const [[{ count: overdueCount }], [{ count: openTaskCount }]] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(invoices)
      .where(and(eq(invoices.workspaceId, session.workspace.id), eq(invoices.status, "overdue"))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(and(eq(tasks.workspaceId, session.workspace.id), eq(tasks.status, "open"))),
  ]);

  return (
    <div className="flex min-h-screen bg-base">
      <Sidebar
        member={session.member}
        workspaceName={session.workspace.name}
        userEmail={session.user.email}
        overdueCount={overdueCount ?? 0}
        openTaskCount={openTaskCount ?? 0}
      />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-6 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
