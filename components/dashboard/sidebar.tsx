"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Users,
  CheckSquare,
  FolderClosed,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceMember } from "@/lib/db/schema";

const NAV: { label: string; href: string; icon: React.ComponentType<{ className?: string }>; badgeKey?: "overdue" | "open" }[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Invoices", href: "/dashboard/invoices", icon: FileText, badgeKey: "overdue" },
  { label: "Deals", href: "/dashboard/deals", icon: Briefcase },
  { label: "Contacts", href: "/dashboard/contacts", icon: Users },
  { label: "Tasks", href: "/dashboard/tasks", icon: CheckSquare, badgeKey: "open" },
  { label: "Documents", href: "/dashboard/documents", icon: FolderClosed },
];

export function Sidebar({
  member,
  workspaceName,
  userEmail,
  overdueCount,
  openTaskCount,
}: {
  member: WorkspaceMember;
  workspaceName: string;
  userEmail: string;
  overdueCount: number;
  openTaskCount: number;
}) {
  const pathname = usePathname();
  const badge = (key?: "overdue" | "open") => {
    if (key === "overdue") return overdueCount > 0 ? overdueCount : null;
    if (key === "open") return openTaskCount > 0 ? openTaskCount : null;
    return null;
  };

  return (
    <aside className="hidden w-[220px] shrink-0 flex-col border-r-hairline border-border bg-surface md:flex">
      <div className="flex h-14 items-center gap-2 border-b-hairline border-border px-5">
        <div className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-medium">D</div>
        <div className="leading-tight">
          <div className="text-sm font-medium">{workspaceName}</div>
          <div className="text-[10px] text-muted-foreground">Operations</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <div className="px-2 pb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">Workspace</div>
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
            const count = badge(item.badgeKey);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-hover",
                    active && "bg-hover text-foreground"
                  )}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Icon className="h-4 w-4 opacity-70 group-hover:opacity-100" />
                    {item.label}
                  </span>
                  {count ? (
                    <span className={cn(
                      "pill",
                      item.badgeKey === "overdue" ? "bg-danger text-danger-foreground" : "bg-info text-info-foreground"
                    )}>{count}</span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 px-2 pb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">Settings</div>
        <ul className="space-y-0.5">
          <li>
            <Link
              href="/dashboard/settings"
              className={cn(
                "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-hover",
                pathname.startsWith("/dashboard/settings") && "bg-hover text-foreground"
              )}
            >
              <Settings className="h-4 w-4 opacity-70 group-hover:opacity-100" />
              Settings
            </Link>
          </li>
        </ul>
      </nav>

      <div className="border-t-hairline border-border p-3">
        <div className="flex items-center gap-2.5 px-1.5 pb-2.5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium uppercase">
            {member.avatarInitials}
          </span>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm">{member.displayName}</div>
            <div className="truncate text-[10px] text-muted-foreground">{userEmail}</div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    </aside>
  );
}
