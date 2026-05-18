"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function InviteForm({
  token,
  email,
  alreadySignedIn,
}: {
  token: string;
  email: string;
  alreadySignedIn: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "signin">(alreadySignedIn ? "signin" : "create");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function acceptInvite(displayNameOverride?: string) {
    const res = await fetch(`/api/invite/${token}/accept`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ display_name: displayNameOverride ?? displayName ?? email.split("@")[0] }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(body.error ?? "Could not accept invite");
    }
  }

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      // 1. Create the user record + hashed password
      const signupRes = await fetch(`/api/invite/${token}/signup`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password, display_name: displayName || email.split("@")[0] }),
      });
      if (!signupRes.ok) {
        const body = await signupRes.json().catch(() => ({ error: "Signup failed" }));
        throw new Error(body.error ?? "Signup failed");
      }
      // 2. Sign in with credentials
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) throw new Error(result.error);
      // 3. Accept invite (create membership)
      await acceptInvite();
      toast.success("Welcome to Dean St");
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function signInAndAccept(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) throw new Error(result.error === "CredentialsSignin" ? "Invalid password" : result.error);
      await acceptInvite();
      toast.success("Welcome to Dean St");
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function justAccept() {
    setBusy(true);
    try {
      await acceptInvite(displayName || undefined);
      toast.success("Welcome to Dean St");
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (alreadySignedIn) {
    return (
      <div className="rounded-lg border-hairline border-border bg-surface p-6 space-y-4 text-center">
        <p className="text-sm">Signed in as <strong>{email}</strong></p>
        <div className="space-y-2 text-left">
          <Label htmlFor="dn">Display name</Label>
          <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={email.split("@")[0]} />
        </div>
        <Button onClick={justAccept} disabled={busy} className="w-full">{busy ? "Joining…" : "Accept invite"}</Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-hairline border-border bg-surface p-6 space-y-4">
      <div className="flex rounded-md bg-muted p-0.5 text-xs">
        <button type="button" onClick={() => setMode("create")} className={`flex-1 rounded py-1.5 ${mode === "create" ? "bg-surface" : ""}`}>Create account</button>
        <button type="button" onClick={() => setMode("signin")} className={`flex-1 rounded py-1.5 ${mode === "signin" ? "bg-surface" : ""}`}>I already have one</button>
      </div>

      <form className="space-y-3" onSubmit={mode === "create" ? createAccount : signInAndAccept}>
        <div className="space-y-1">
          <Label>Email</Label>
          <Input value={email} disabled />
        </div>
        {mode === "create" ? (
          <div className="space-y-1">
            <Label htmlFor="dn">Display name</Label>
            <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Jane Smith" />
          </div>
        ) : null}
        <div className="space-y-1">
          <Label htmlFor="pw">Password</Label>
          <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Working…" : mode === "create" ? "Create account & join" : "Sign in & join"}
        </Button>
      </form>
    </div>
  );
}
