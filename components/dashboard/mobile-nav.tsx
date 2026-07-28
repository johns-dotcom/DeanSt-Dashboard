"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { SidebarBody } from "./sidebar";
import type { WorkspaceMember } from "@/lib/db/schema";

/**
 * Mobile navigation: a hamburger button (shown below md) that opens a slide-in
 * drawer with the same nav as the desktop sidebar. The desktop <aside> stays
 * hidden below md, so this is the only way to navigate on phones.
 */
export function MobileNav({ member, userEmail }: { member: WorkspaceMember; userEmail: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on navigation (backup to the per-link onNavigate).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="md:hidden"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          border: "1px solid var(--hair)",
          background: "var(--cream-light)",
          color: "var(--ink-soft)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flex: "none",
        }}
      >
        <Menu className="h-5 w-5" />
      </button>

      {open ? (
        <div className="md:hidden" style={{ position: "fixed", inset: 0, zIndex: 50 }}>
          <div
            onClick={() => setOpen(false)}
            aria-hidden
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: 280,
              maxWidth: "82%",
              background: "var(--cream-light)",
              borderRight: "1px solid var(--hair)",
              padding: "20px 18px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 20,
              boxSizing: "border-box",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: "1px solid var(--hair)",
                  background: "transparent",
                  color: "var(--ink-soft)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarBody member={member} userEmail={userEmail} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
