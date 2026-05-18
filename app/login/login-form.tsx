"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function LoginForm({
  redirectedFrom,
  initialError,
}: {
  redirectedFrom?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  async function handleGoogle() {
    setError(null);
    await signIn("google", { callbackUrl: redirectedFrom ?? "/dashboard" });
  }

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setSubmitting(false);
    if (!result || result.error) {
      const msg = result?.error === "CredentialsSignin" ? "Invalid email or password" : result?.error ?? "Sign-in failed";
      setError(msg);
      toast.error(msg);
      return;
    }
    router.replace(redirectedFrom ?? "/dashboard");
    router.refresh();
  }

  return (
    <div className="rounded-lg border-hairline border-border bg-surface p-6 space-y-5">
      <Button onClick={handleGoogle} variant="outline" className="w-full" type="button">
        <GoogleIcon /> Continue with Google
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t-hairline border-border" /></div>
        <div className="relative flex justify-center text-[10px] uppercase tracking-wider"><span className="bg-surface px-2 text-muted-foreground">or email</span></div>
      </div>

      <form className="space-y-3" onSubmit={handleCredentials}>
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error ? <p className="text-xs text-danger-foreground">{error}</p> : null}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="text-center text-[11px] text-muted-foreground">Access is invite-only. Contact an admin for an invite.</p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.97h5.59c-.25 1.39-1.7 4.07-5.59 4.07-3.36 0-6.1-2.78-6.1-6.2s2.74-6.2 6.1-6.2c1.92 0 3.2.81 3.93 1.51l2.68-2.58C16.94 3.12 14.7 2 12 2 6.99 2 3 5.99 3 11s3.99 9 9 9c5.2 0 8.62-3.65 8.62-8.79 0-.59-.06-1.04-.14-1.51H12z"/>
    </svg>
  );
}
