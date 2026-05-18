"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { SignPlate } from "@/components/brand/sign-plate";
import {
  GridIcon,
  DocIcon,
  BriefcaseIcon,
  UsersIcon,
  CheckIcon,
  FolderIcon,
  GearIcon,
} from "@/components/brand/icons";
import type { WorkspaceMember } from "@/lib/db/schema";

type NavEntry = {
  label: string;
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const WORKSPACE_NAV: NavEntry[] = [
  { label: "Overview", href: "/dashboard", Icon: GridIcon },
  { label: "Invoices", href: "/dashboard/invoices", Icon: DocIcon },
  { label: "Deals", href: "/dashboard/deals", Icon: BriefcaseIcon },
  { label: "Contacts", href: "/dashboard/contacts", Icon: UsersIcon },
  { label: "Tasks", href: "/dashboard/tasks", Icon: CheckIcon },
  { label: "Documents", href: "/dashboard/documents", Icon: FolderIcon },
];

function NavLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mono"
      style={{
        fontSize: 10,
        letterSpacing: "0.34em",
        color: "var(--ink-faint)",
        padding: "0 14px",
        marginBottom: 8,
        marginTop: 4,
      }}
    >
      {children}
    </div>
  );
}

function NavItem({
  href,
  label,
  Icon,
  active,
}: NavEntry & { active: boolean }) {
  return (
    <Link
      href={href}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 14,
        width: "100%",
        padding: "10px 14px",
        borderRadius: 6,
        fontSize: 14.5,
        fontWeight: active ? 600 : 500,
        background: active ? "var(--cream-deep)" : "transparent",
        color: "var(--ink)",
        textDecoration: "none",
        transition: "background 120ms ease",
      }}
      className="group"
    >
      {active ? (
        <span
          style={{
            position: "absolute",
            left: -1,
            top: 8,
            bottom: 8,
            width: 3,
            background: "var(--sign-green)",
            borderRadius: 2,
          }}
        />
      ) : null}
      <span
        style={{
          color: active ? "var(--sign-green)" : "var(--ink-soft)",
          display: "flex",
        }}
      >
        <Icon />
      </span>
      <span>{label}</span>
    </Link>
  );
}

export function Sidebar({
  member,
  userEmail,
}: {
  member: WorkspaceMember;
  workspaceName: string;
  userEmail: string;
  overdueCount?: number;
  openTaskCount?: number;
}) {
  const pathname = usePathname();

  return (
    <aside
      className="hidden md:flex"
      style={{
        width: 280,
        flex: "none",
        background: "var(--cream-light)",
        borderRight: "1px solid var(--hair)",
        padding: "32px 18px 24px",
        flexDirection: "column",
        gap: 24,
        boxSizing: "border-box",
        minHeight: "100vh",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "0 6px 8px" }}>
        <SignPlate size={1} />
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
          <span className="serif" style={{ fontSize: 22 }}>Operations</span>
          <span
            className="mono"
            style={{
              fontSize: 9,
              letterSpacing: "0.3em",
              color: "var(--ink-faint)",
              marginTop: 2,
            }}
          >
            NYC · Est MMXXV
          </span>
        </div>
      </div>

      <div style={{ height: 1, background: "var(--hair)", margin: "0 6px" }} />

      <div>
        <NavLabel>Workspace</NavLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {WORKSPACE_NAV.map((item) => {
            const active =
              item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
            return <NavItem key={item.href} {...item} active={active} />;
          })}
        </div>
      </div>

      <div>
        <NavLabel>Settings</NavLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <NavItem
            href="/dashboard/settings"
            label="Settings"
            Icon={GearIcon}
            active={pathname.startsWith("/dashboard/settings")}
          />
        </div>
      </div>

      <div style={{ marginTop: "auto", paddingTop: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 6px 12px",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              height: 28,
              width: 28,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              background: "var(--sign-green)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {member.avatarInitials}
          </span>
          <div style={{ minWidth: 0, lineHeight: 1.2 }}>
            <div style={{ fontSize: 13.5 }}>{member.displayName}</div>
            <div
              style={{
                fontSize: 11,
                color: "var(--ink-faint)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 220,
              }}
            >
              {userEmail}
            </div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mono"
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            padding: "6px 14px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--ink-faint)",
            fontSize: 9,
            letterSpacing: "0.32em",
          }}
        >
          Sign out
        </button>
        <div style={{ padding: "10px 14px 0" }}>
          <div
            className="mono"
            style={{ fontSize: 9, letterSpacing: "0.32em", color: "var(--ink-faint)" }}
          >
            v0.1 · Internal
          </div>
          <div
            className="serif"
            style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4, fontStyle: "italic" }}
          >
            Turning vision into velocity
          </div>
        </div>
      </div>
    </aside>
  );
}
