"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@/components/brand/icons";

const TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/invoices": "Invoices",
  "/dashboard/deals": "Deals",
  "/dashboard/contacts": "Contacts",
  "/dashboard/tasks": "Tasks",
  "/dashboard/documents": "Documents",
  "/dashboard/settings": "Settings",
};

export function Topbar() {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "Dashboard";
  const [dark, setDark] = useState<boolean>(false);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  function toggleDark() {
    const next = document.documentElement.dataset.theme !== "dark";
    document.documentElement.dataset.theme = next ? "dark" : "";
    localStorage.setItem("deanst.theme", next ? "dark" : "light");
    setDark(next);
  }

  return (
    <header
      style={{
        padding: "34px 48px 26px",
        borderBottom: "1px solid var(--hair)",
        background: "var(--cream)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}
    >
      <div>
        <div
          className="mono"
          style={{ fontSize: 10, letterSpacing: "0.36em", color: "var(--ink-faint)" }}
        >
          Dean St · Operations
        </div>
        <h1
          style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            marginTop: 6,
            color: "var(--ink)",
          }}
        >
          {title}
        </h1>
      </div>

      <button
        onClick={toggleDark}
        aria-label="Toggle theme"
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          border: "1px solid var(--hair)",
          background: "var(--cream-light)",
          color: "var(--ink-soft)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        {dark ? <SunIcon /> : <MoonIcon />}
      </button>
    </header>
  );
}
