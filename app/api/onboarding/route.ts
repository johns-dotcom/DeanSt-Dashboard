import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers } from "@/lib/db/schema";
import { initialsFor } from "@/lib/auth/workspace";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const workspaceName = (body.workspace_name as string | undefined)?.trim() || "Dean St";
  const displayName = (body.display_name as string | undefined)?.trim() || session.user.name || session.user.email?.split("@")[0] || "Owner";

  const [existing] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, session.user.id))
    .limit(1);
  if (existing) return NextResponse.json({ error: "Already in a workspace" }, { status: 409 });

  const [workspace] = await db
    .insert(workspaces)
    .values({
      name: workspaceName,
      invoicePrefix: "INV-",
      defaultPaymentTerms: "Net 30",
      domainRestriction: "deanst.co",
    })
    .returning();

  await db.insert(workspaceMembers).values({
    workspaceId: workspace.id,
    userId: session.user.id,
    role: "admin",
    displayName,
    avatarInitials: initialsFor(displayName),
  });

  return NextResponse.json({ ok: true, workspace_id: workspace.id });
}
