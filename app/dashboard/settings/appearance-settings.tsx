"use client";

import { useEffect, useState } from "react";
import { Toggle } from "@/components/brand/toggle";

function SettingRow({
  title,
  sub,
  control,
  last,
}: {
  title: string;
  sub: string;
  control: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "18px 26px",
        borderBottom: last ? "none" : "1px solid var(--hair)",
        gap: 24,
      }}
    >
      <div>
        <div style={{ fontSize: 15.5, fontWeight: 500, color: "var(--ink)" }}>{title}</div>
        <div style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 3 }}>{sub}</div>
      </div>
      {control}
    </div>
  );
}

export function AppearanceSettings() {
  const [dark, setDark] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
    setCompact(document.documentElement.dataset.compact === "true");
  }, []);

  function toggleDark(next: boolean) {
    document.documentElement.dataset.theme = next ? "dark" : "";
    localStorage.setItem("deanst.theme", next ? "dark" : "light");
    setDark(next);
  }

  function toggleCompact(next: boolean) {
    document.documentElement.dataset.compact = next ? "true" : "";
    localStorage.setItem("deanst.compact", next ? "1" : "0");
    setCompact(next);
  }

  return (
    <>
      <SettingRow
        title="Dark mode"
        sub="Switch the surface to ink and cream-on-shadow."
        control={<Toggle checked={dark} onCheckedChange={toggleDark} ariaLabel="Toggle dark mode" />}
      />
      <SettingRow
        title="Compact view"
        sub="Tighter row spacing across tables."
        control={<Toggle checked={compact} onCheckedChange={toggleCompact} ariaLabel="Toggle compact view" />}
        last
      />
    </>
  );
}
