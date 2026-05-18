import Link from "next/link";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth/workspace";
import { db } from "@/lib/db";
import { invoices, tasks, workspaceMembers, deals } from "@/lib/db/schema";
import { StatCard } from "@/components/dashboard/stat-card";
import { SectionCard } from "@/components/dashboard/section-card";
import { Badge, statusBadgeTone } from "@/components/dashboard/badge";
import { TaskItem } from "@/components/dashboard/task-item";
import { EmptyState } from "@/components/dashboard/empty-state";
import { CheckSquare, FileText } from "lucide-react";
import { formatCurrency, formatDate, isOverdue } from "@/lib/utils";

export default async function OverviewPage() {
  const session = await requireSession();
  const wsId = session.workspace.id;

  const [outstandingRows, activeDealsCountRows, openTasks, recentInvoices, members] = await Promise.all([
    db
      .select({ total: invoices.total })
      .from(invoices)
      .where(and(eq(invoices.workspaceId, wsId), inArray(invoices.status, ["pending", "overdue"]))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(deals)
      .where(and(eq(deals.workspaceId, wsId), eq(deals.status, "active"))),
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.workspaceId, wsId), eq(tasks.status, "open")))
      .orderBy(sql`${tasks.dueDate} asc nulls last`),
    db
      .select()
      .from(invoices)
      .where(eq(invoices.workspaceId, wsId))
      .orderBy(desc(invoices.issuedDate))
      .limit(5),
    db.select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, wsId)),
  ]);

  const outstandingTotal = outstandingRows.reduce((s, r) => s + Number(r.total), 0);
  const overdueCount = openTasks.filter((t) => isOverdue(t.dueDate)).length;
  const activeDealsCount = activeDealsCountRows[0]?.count ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard label="Outstanding invoices" value={formatCurrency(outstandingTotal)} hint={`${outstandingRows.length} open`} />
        <StatCard label="Active deals" value={String(activeDealsCount)} hint="Recording + brand" />
        <StatCard label="Open tasks" value={String(openTasks.length)} hint={overdueCount ? `${overdueCount} overdue` : "All on track"} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Recent invoices"
          action={<Link href="/dashboard/invoices" className="text-xs text-muted-foreground hover:text-foreground">View all →</Link>}
        >
          {recentInvoices.length ? (
            <div className="overflow-hidden rounded-md">
              <table className="w-full text-sm table-row-hover">
                <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Client</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id} className="border-t-hairline border-border">
                      <td className="px-3 py-2 truncate">{inv.client}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(Number(inv.total))}</td>
                      <td className="px-3 py-2"><Badge tone={statusBadgeTone[inv.status]}>{inv.status}</Badge></td>
                      <td className="px-3 py-2 text-muted-foreground">{formatDate(inv.dueDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={<FileText className="h-4 w-4" />}
              title="No invoices yet"
              description="Create your first invoice to start tracking revenue."
            />
          )}
        </SectionCard>

        <SectionCard
          title="Tasks due soon"
          action={<Link href="/dashboard/tasks" className="text-xs text-muted-foreground hover:text-foreground">View all →</Link>}
        >
          {openTasks.length ? (
            <div className="space-y-1">
              {openTasks.slice(0, 8).map((t) => (
                <TaskItem key={t.id} task={t} members={members} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<CheckSquare className="h-4 w-4" />}
              title="No open tasks"
              description="You're all caught up."
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
