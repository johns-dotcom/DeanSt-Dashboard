"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/dashboard/badge";
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

const ROLE_TONE: Record<Role, "success" | "info" | "neutral"> = {
  admin: "success",
  member: "info",
  view_only: "neutral",
};

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
  const [pending, startTransition] = useTransition();

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
      const r = await revokeInvite(id);
      void r;
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
    <div className="space-y-5">
      {isAdmin ? (
        <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[200px]">
            <Input type="email" placeholder="invite@deanst.co" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button type="submit" disabled={pending}>Invite</Button>
        </form>
      ) : null}

      <div>
        <h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Active members</h3>
        <ul className="divide-y-hairline divide-border rounded-md border-hairline border-border bg-surface">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {m.avatarInitials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm">{m.displayName}{m.id === currentMemberId ? <span className="ml-2 text-xs text-muted-foreground">(you)</span> : null}</div>
                <div className="truncate text-xs text-muted-foreground">{m.email}</div>
              </div>
              {isAdmin && m.id !== currentMemberId ? (
                <>
                  <Select value={m.role} onValueChange={(v) => handleRoleChange(m.id, v as Role)}>
                    <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <button onClick={() => handleRemove(m.id)} className="rounded p-1.5 text-muted-foreground hover:bg-hover hover:text-foreground" aria-label="Remove">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <Badge tone={ROLE_TONE[m.role]}>{m.role.replace("_", " ")}</Badge>
              )}
            </li>
          ))}
        </ul>
      </div>

      {isAdmin && invites.length > 0 ? (
        <div>
          <h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Pending invites</h3>
          <ul className="divide-y-hairline divide-border rounded-md border-hairline border-border bg-surface">
            {invites.map((i) => (
              <li key={i.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{i.email}</div>
                  <div className="text-xs text-muted-foreground">{i.role.replace("_", " ")}</div>
                </div>
                <button onClick={() => handleResend(i.id)} className="rounded p-1.5 text-muted-foreground hover:bg-hover hover:text-foreground" aria-label="Resend">
                  <Send className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleRevoke(i.id)} className="rounded p-1.5 text-muted-foreground hover:bg-hover hover:text-foreground" aria-label="Revoke">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
