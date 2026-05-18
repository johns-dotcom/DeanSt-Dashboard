"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateDisplayName } from "./actions";

export function ProfileForm({ displayName }: { displayName: string }) {
  const [name, setName] = useState(displayName);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const r = await updateDisplayName(name);
      if ("error" in r && r.error) toast.error(r.error);
      else toast.success("Profile updated");
    });
  }

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: "12px 14px",
    background: "var(--cream-light)",
    border: "1px solid var(--hair)",
    borderRadius: 8,
    fontSize: 15,
    color: "var(--ink)",
    fontFamily: "inherit",
    outline: "none",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "0 22px",
    background: "var(--sign-green)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    letterSpacing: "0.02em",
    cursor: pending || name === displayName ? "not-allowed" : "pointer",
    opacity: pending || name === displayName ? 0.5 : 1,
    height: 44,
  };

  return (
    <div style={{ display: "flex", gap: 12 }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={inputStyle}
      />
      <button onClick={save} disabled={pending || name === displayName} style={buttonStyle}>
        {pending ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
