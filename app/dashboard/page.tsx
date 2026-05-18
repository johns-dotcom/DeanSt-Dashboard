import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth/workspace";
import { db } from "@/lib/db";
import { invoices, tasks, workspaceMembers, deals } from "@/lib/db/schema";
import { StatCard } from "@/components/dashboard/stat-card";
import { ListCard } from "@/components/dashboard/list-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { TaskItem } from "@/components/dashboard/task-item";
import { Eyebrow } from "@/components/brand/eyebrow";
import { PageFooter } from "@/components/brand/page-footer";
import { InboxEmptyIcon, CheckEmptyIcon } from "@/components/brand/icons";
import { formatCurrency, formatDate, isOverdue } from "@/lib/utils";

function formatDateStamp(d: Date) {
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 4).toUpperCase();
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const year = romanNumeral(d.getFullYear());
  return `${weekday} · ${day} ${month} · ${year}`;
}

function romanNumeral(n: number): string {
  const map: [number, string][] = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let out = "";
  for (const [val, sym] of map) {
    while (n >= val) { out += sym; n -= val; }
  }
  return out;
}

export default async function OverviewPage() {
  const session = await requireSession();
  const wsId = session.workspace.id;

  const [outstandingRows, activeDealsCountRows, openTasks, recentInvoices, members] = await Promise.all([
    db.select({ total: invoices.total }).from(invoices)
      .where(and(eq(invoices.workspaceId, wsId), inArray(invoices.status, ["pending", "overdue"]))),
    db.select({ count: sql<number>`count(*)::int` }).from(deals)
      .where(and(eq(deals.workspaceId, wsId), eq(deals.status, "active"))),
    db.select().from(tasks)
      .where(and(eq(tasks.workspaceId, wsId), eq(tasks.status, "open")))
      .orderBy(sql`${tasks.dueDate} asc nulls last`),
    db.select().from(invoices)
      .where(eq(invoices.workspaceId, wsId))
      .orderBy(desc(invoices.issuedDate))
      .limit(5),
    db.select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, wsId)),
  ]);

  const outstandingTotal = outstandingRows.reduce((s, r) => s + Number(r.total), 0);
  const overdueCount = openTasks.filter((t) => isOverdue(t.dueDate)).length;
  const activeDealsCount = activeDealsCountRows[0]?.count ?? 0;

  return (
    <div style={{ padding: "32px 48px 60px", display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Eyebrow size={10} spacing={0.36}>№ 01 · Pulse</Eyebrow>
        <Eyebrow size={10} spacing={0.32}>{formatDateStamp(new Date())}</Eyebrow>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }}>
        <StatCard
          label="Outstanding"
          prefix="$"
          value={formatCurrency(outstandingTotal).replace(/^\$/, "")}
          sub={`${outstandingRows.length} open ledger ${outstandingRows.length === 1 ? "entry" : "entries"}`}
          plate={{ label: "INV", sub: "01" }}
        />
        <StatCard
          label="Active deals"
          value={activeDealsCount}
          sub="Recording & brand"
          plate={{ label: "DLS", sub: "02" }}
        />
        <StatCard
          label="Open tasks"
          value={openTasks.length}
          sub={overdueCount ? `${overdueCount} overdue` : "All on track"}
          plate={{ label: "TSK", sub: "03" }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 22 }}>
        <ListCard kicker="Recent" title="Recent invoices" href="/dashboard/invoices">
          {recentInvoices.length ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {recentInvoices.map((inv, i) => (
                <div
                  key={inv.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 0",
                    borderTop: i === 0 ? "none" : "1px solid var(--hair)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 500 }}>{inv.client}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>
                      {inv.invoiceNumber} · {formatDate(inv.dueDate)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14.5, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                      {formatCurrency(Number(inv.total))}
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: 9.5,
                        letterSpacing: "0.24em",
                        color:
                          inv.status === "overdue" ? "#a01e1e" :
                          inv.status === "paid" ? "var(--sign-green)" : "var(--ink-soft)",
                        marginTop: 2,
                      }}
                    >
                      {inv.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<InboxEmptyIcon />}
              title="No invoices yet"
              description="The ledger is empty. Create your first invoice to begin tracking revenue."
            />
          )}
        </ListCard>

        <ListCard kicker="Up next" title="Tasks due soon" href="/dashboard/tasks">
          {openTasks.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {openTasks.slice(0, 8).map((t) => (
                <TaskItem key={t.id} task={t} members={members} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<CheckEmptyIcon />}
              title="Nothing on the docket"
              description="You're all caught up. New tasks will appear here as they're added."
            />
          )}
        </ListCard>
      </div>

      <PageFooter />
    </div>
  );
}
