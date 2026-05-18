"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers, workspaceInvites } from "@/lib/db/schema";
import { requireSession, requireAdmin, initialsFor } from "@/lib/auth/workspace";
import { inviteEmail } from "@/lib/email/invite-template";
import type { Role } from "@/lib/db/schema";

async function sendInviteEmail({
  email,
  token,
  workspaceName,
  inviterName,
  role,
}: {
  email: string;
  token: string;
  workspaceName: string;
  inviterName: string;
  role: Role;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "Dean St <onboarding@resend.dev>";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const acceptUrl = `${appUrl}/invite/${token}`;
  if (!apiKey) {
    return { warn: `Resend not configured. Share this link directly: ${acceptUrl}` };
  }
  const resend = new Resend(apiKey);
  const { subject, html, text } = inviteEmail({ workspaceName, inviterName, acceptUrl, role });
  const { error } = await resend.emails.send({ from, to: email, subject, html, text });
  if (error) return { warn: `Could not send email: ${error.message}. Share link directly: ${acceptUrl}` };
  return { ok: true as const };
}

const inviteSchema = z.object({
  email: z.string().email("Valid email required"),
  role: z.enum(["admin", "member", "view_only"]),
});

export async function inviteMember(input: z.infer<typeof inviteSchema>) {
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const session = await requireAdmin();

  const [existing] = await db
    .select()
    .from(workspaceInvites)
    .where(
      and(
        eq(workspaceInvites.workspaceId, session.workspace.id),
        eq(workspaceInvites.email, parsed.data.email),
        eq(workspaceInvites.accepted, false)
      )
    )
    .limit(1);

  let inviteToken = existing?.token;

  if (!existing) {
    const [inserted] = await db
      .insert(workspaceInvites)
      .values({
        workspaceId: session.workspace.id,
        email: parsed.data.email,
        role: parsed.data.role,
        invitedBy: session.user.id,
      })
      .returning({ token: workspaceInvites.token });
    inviteToken = inserted.token;
  } else if (existing.role !== parsed.data.role) {
    await db
      .update(workspaceInvites)
      .set({ role: parsed.data.role, updatedAt: new Date() })
      .where(eq(workspaceInvites.id, existing.id));
  }

  const emailResult = await sendInviteEmail({
    email: parsed.data.email,
    token: inviteToken!,
    workspaceName: session.workspace.name,
    inviterName: session.member.displayName,
    role: parsed.data.role,
  });

  revalidatePath("/dashboard/settings");
  if ("warn" in emailResult) return { ok: true as const, warn: emailResult.warn };
  return { ok: true as const };
}

export async function resendInvite(inviteId: string) {
  const session = await requireAdmin();
  const [invite] = await db
    .select()
    .from(workspaceInvites)
    .where(and(eq(workspaceInvites.id, inviteId), eq(workspaceInvites.workspaceId, session.workspace.id)))
    .limit(1);
  if (!invite) return { error: "Invite not found" };

  const r = await sendInviteEmail({
    email: invite.email,
    token: invite.token,
    workspaceName: session.workspace.name,
    inviterName: session.member.displayName,
    role: invite.role,
  });
  if ("warn" in r) return { ok: true as const, warn: r.warn };
  return { ok: true as const };
}

export async function revokeInvite(inviteId: string) {
  const session = await requireAdmin();
  await db
    .delete(workspaceInvites)
    .where(and(eq(workspaceInvites.id, inviteId), eq(workspaceInvites.workspaceId, session.workspace.id)));
  revalidatePath("/dashboard/settings");
  return { ok: true as const };
}

export async function changeMemberRole(memberId: string, role: Role) {
  const session = await requireAdmin();
  if (memberId === session.member.id && role !== "admin") {
    return { error: "You can't demote yourself" };
  }
  await db
    .update(workspaceMembers)
    .set({ role, updatedAt: new Date() })
    .where(and(eq(workspaceMembers.id, memberId), eq(workspaceMembers.workspaceId, session.workspace.id)));
  revalidatePath("/dashboard/settings");
  return { ok: true as const };
}

export async function removeMember(memberId: string) {
  const session = await requireAdmin();
  if (memberId === session.member.id) return { error: "You can't remove yourself" };
  await db
    .delete(workspaceMembers)
    .where(and(eq(workspaceMembers.id, memberId), eq(workspaceMembers.workspaceId, session.workspace.id)));
  revalidatePath("/dashboard/settings");
  return { ok: true as const };
}

const workspaceSchema = z.object({
  name: z.string().min(1),
  invoice_prefix: z.string().min(1).max(8),
  default_payment_terms: z.string().min(1),
  domain_restriction: z.string().nullable(),
});

export async function updateWorkspace(input: z.infer<typeof workspaceSchema>) {
  const session = await requireAdmin();
  const parsed = workspaceSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await db
    .update(workspaces)
    .set({
      name: parsed.data.name,
      invoicePrefix: parsed.data.invoice_prefix,
      defaultPaymentTerms: parsed.data.default_payment_terms,
      domainRestriction: parsed.data.domain_restriction,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, session.workspace.id));

  revalidatePath("/dashboard/settings");
  return { ok: true as const };
}

export async function updateDisplayName(displayName: string) {
  const session = await requireSession();
  const trimmed = displayName.trim();
  if (!trimmed) return { error: "Display name required" };
  await db
    .update(workspaceMembers)
    .set({ displayName: trimmed, avatarInitials: initialsFor(trimmed), updatedAt: new Date() })
    .where(eq(workspaceMembers.id, session.member.id));
  revalidatePath("/dashboard");
  return { ok: true as const };
}
