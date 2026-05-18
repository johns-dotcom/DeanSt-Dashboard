"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";

export function AppearanceSettings() {
  const [dark, setDark] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setCompact(document.documentElement.classList.contains("compact"));
  }, []);

  function toggleDark(next: boolean) {
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("deanst.theme", next ? "dark" : "light");
    setDark(next);
  }

  function toggleCompact(next: boolean) {
    document.documentElement.classList.toggle("compact", next);
    localStorage.setItem("deanst.compact", next ? "1" : "0");
    setCompact(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm">Dark mode</div>
          <div className="text-xs text-muted-foreground">Use the dark color scheme.</div>
        </div>
        <Switch checked={dark} onCheckedChange={toggleDark} />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm">Compact view</div>
          <div className="text-xs text-muted-foreground">Tighter row spacing across tables.</div>
        </div>
        <Switch checked={compact} onCheckedChange={toggleCompact} />
      </div>
    </div>
  );
}
