"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Eyebrow } from "@/components/brand/eyebrow";
import { SendIcon, TrashIcon } from "@/components/brand/icons";
import {
  inviteMember,
  resendInvite,
  revokeInvite,
  changeMemberRole,
  removeMember,
} from "./actions";
import type { Role, WorkspaceInvite, WorkspaceMember } from "@/lib/db/schema";

type MemberWithEmail = WorkspaceMember & { email: string };

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "view_only", label: "View only" },
];

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

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  flex: "none",
  width: 140,
  appearance: "none",
  backgroundImage:
    "linear-gradient(45deg, transparent 50%, var(--ink-soft) 50%), linear-gradient(135deg, var(--ink-soft) 50%, transparent 50%)",
  backgroundPosition:
    "calc(100% - 14px) 17px, calc(100% - 9px) 17px",
  backgroundSize: "5px 5px",
  backgroundRepeat: "no-repeat",
  paddingRight: 32,
};

const inviteButton: React.CSSProperties = {
  padding: "0 22px",
  background: "var(--ink)",
  color: "var(--cream)",
  border: "none",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 500,
  letterSpacing: "0.02em",
  cursor: "pointer",
  height: 44,
};

const iconButton: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 6,
  border: "1px solid var(--hair)",
  background: "var(--cream-light)",
  color: "var(--ink-soft)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--paper)",
        border: "1px solid var(--hair)",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function MemberRow({
  initial,
  name,
  email,
  pending,
  right,
  last,
  isYou,
}: {
  initial: string;
  name: string;
  email: string;
  pending?: boolean;
  right: React.ReactNode;
  last?: boolean;
  isYou?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 22px",
        borderBottom: last ? "none" : "1px solid var(--hair)",
      }}
    >
      <span
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: pending ? "var(--cream-deep)" : "var(--sign-green)",
          color: pending ? "var(--ink-soft)" : "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 15,
          fontWeight: 600,
          flex: "none",
        }}
      >
        {initial}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)" }}>
          {name}
          {isYou ? (
            <span
              className="mono"
              style={{
                fontSize: 9.5,
                letterSpacing: "0.2em",
                color: "var(--ink-faint)",
                marginLeft: 8,
              }}
            >
              (you)
            </span>
          ) : null}
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 2 }}>{email}</div>
      </div>
      {right}
    </div>
  );
}

function RolePill({ role }: { role: Role }) {
  return (
    <span
      className="mono"
      style={{
        background: "rgba(29,60,142,0.10)",
        color: "var(--sign-green)",
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 10,
        letterSpacing: "0.24em",
      }}
    >
      {role.replace("_", " ")}
    </span>
  );
}

export function TeamSettings({
  members,
  invites,
  currentMemberId,
  isAdmin,
}: {
  members: MemberWithEmail[];
  invites: WorkspaceInvite[];
  currentMemberId: string;
  isAdmin: boolean;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [, startTransition] = useTransition();

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { toast.error("Enter an email"); return; }
    startTransition(async () => {
      const r = await inviteMember({ email: email.trim(), role });
      if ("error" in r && r.error) { toast.error(r.error); return; }
      if ("warn" in r && r.warn) toast.message(r.warn);
      else toast.success(`Invite sent to ${email}`);
      setEmail("");
    });
  }

  function handleResend(id: string) {
    startTransition(async () => {
      const r = await resendInvite(id);
      if ("error" in r && r.error) toast.error(r.error);
      else if ("warn" in r && r.warn) toast.message(r.warn);
      else toast.success("Invite resent");
    });
  }

  function handleRevoke(id: string) {
    if (!confirm("Revoke this invite?")) return;
    startTransition(async () => {
      await revokeInvite(id);
      toast.success("Invite revoked");
    });
  }

  function handleRoleChange(memberId: string, nextRole: Role) {
    startTransition(async () => {
      const r = await changeMemberRole(memberId, nextRole);
      if ("error" in r && r.error) toast.error(r.error); else toast.success("Role updated");
    });
  }

  function handleRemove(memberId: string) {
    if (!confirm("Remove this member?")) return;
    startTransition(async () => {
      const r = await removeMember(memberId);
      if ("error" in r && r.error) toast.error(r.error); else toast.success("Member removed");
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {isAdmin ? (
        <Card>
          <form onSubmit={handleInvite} style={{ display: "flex", gap: 12, padding: 22 }}>
            <input
              type="email"
              placeholder="invite@deanst.co"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} style={selectStyle}>
              {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <button type="submit" style={inviteButton}>Invite</button>
          </form>
        </Card>
      ) : null}

      <div>
        <Eyebrow size={10}>Active members</Eyebrow>
        <div style={{ marginTop: 10 }}>
          <Card>
            {members.map((m, i) => (
              <MemberRow
                key={m.id}
                initial={m.avatarInitials.charAt(0)}
                name={m.displayName}
                email={m.email}
                isYou={m.id === currentMemberId}
                last={i === members.length - 1}
                right={
                  isAdmin && m.id !== currentMemberId ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.id, e.target.value as Role)}
                        style={{ ...selectStyle, width: 130, height: 36, fontSize: 13, paddingTop: 0, paddingBottom: 0, backgroundPosition: "calc(100% - 14px) 15px, calc(100% - 9px) 15px" }}
                      >
                        {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                      <button onClick={() => handleRemove(m.id)} style={iconButton} aria-label="Remove">
                        <TrashIcon />
                      </button>
                    </div>
                  ) : (
                    <RolePill role={m.role} />
                  )
                }
              />
            ))}
          </Card>
        </div>
      </div>

      {isAdmin && invites.length > 0 ? (
        <div>
          <Eyebrow size={10}>Pending invites</Eyebrow>
          <div style={{ marginTop: 10 }}>
            <Card>
              {invites.map((i, idx) => (
                <MemberRow
                  key={i.id}
                  initial={i.email.charAt(0).toUpperCase()}
                  name={i.email}
                  email={i.role.replace("_", " ")}
                  pending
                  last={idx === invites.length - 1}
                  right={
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => handleResend(i.id)} style={iconButton} aria-label="Resend">
                        <SendIcon />
                      </button>
                      <button onClick={() => handleRevoke(i.id)} style={iconButton} aria-label="Revoke">
                        <TrashIcon />
                      </button>
                    </div>
                  }
                />
              ))}
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
