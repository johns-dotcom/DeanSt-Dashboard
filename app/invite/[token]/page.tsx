import { eq } from "drizzle-orm";
import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";
import { workspaceInvites, workspaces } from "@/lib/db/schema";
import { InviteForm } from "./invite-form";

export const metadata = { title: "Accept invite · Dean St" };

export default async function InvitePage({ params }: { params: { token: string } }) {
  const [invite] = await db
    .select({
      id: workspaceInvites.id,
      email: workspaceInvites.email,
      role: workspaceInvites.role,
      accepted: workspaceInvites.accepted,
      workspaceId: workspaceInvites.workspaceId,
      workspaceName: workspaces.name,
    })
    .from(workspaceInvites)
    .innerJoin(workspaces, eq(workspaceInvites.workspaceId, workspaces.id))
    .where(eq(workspaceInvites.token, params.token))
    .limit(1);

  if (!invite || invite.accepted) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-lg border-hairline border-border bg-surface p-6 text-center">
          <h1 className="text-base font-medium">Invite not found</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            This invite has already been accepted, revoked, or never existed.
          </p>
        </div>
      </main>
    );
  }

  const session = await auth();
  if (session?.user?.email && session.user.email.toLowerCase() !== invite.email.toLowerCase()) {
    await signOut({ redirect: false });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-base px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium">
            D
          </div>
          <h1 className="text-lg font-medium">You&apos;re invited</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Join {invite.workspaceName} as <strong>{invite.role.replace("_", " ")}</strong>
          </p>
        </div>
        <InviteForm
          token={params.token}
          email={invite.email}
          alreadySignedIn={Boolean(session?.user?.email && session.user.email.toLowerCase() === invite.email.toLowerCase())}
        />
      </div>
    </main>
  );
}
