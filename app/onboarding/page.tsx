import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { workspaceMembers } from "@/lib/db/schema";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Welcome · Dean St" };

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [existing] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, session.user.id))
    .limit(1);
  if (existing) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-base px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium">
            D
          </div>
          <h1 className="text-lg font-medium">Set up your workspace</h1>
          <p className="mt-1 text-xs text-muted-foreground">You&apos;re the first user — name your workspace and pick a display name.</p>
        </div>
        <OnboardingForm email={session.user.email ?? ""} />
      </div>
    </main>
  );
}
