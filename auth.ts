import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens, workspaceMembers } from "@/lib/db/schema";
import { authConfig } from "./auth.config";
import { logActivity } from "@/lib/activity";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const parsed = credentialsSchema.safeParse(creds);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
  ],
  events: {
    async signIn({ user, account }) {
      if (!user?.id) return;
      const [member] = await db
        .select({ id: workspaceMembers.id, workspaceId: workspaceMembers.workspaceId, displayName: workspaceMembers.displayName })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.userId, user.id))
        .limit(1);
      await logActivity({
        action: "auth.signed_in",
        actorUserId: user.id,
        actorMemberId: member?.id ?? null,
        actorName: member?.displayName ?? user.name ?? user.email ?? null,
        workspaceId: member?.workspaceId ?? null,
        metadata: { provider: account?.provider ?? "unknown" },
      });
    },
    async signOut(message) {
      const userId = "token" in message ? message.token?.sub : message.session?.userId;
      if (!userId) return;
      const [member] = await db
        .select({ id: workspaceMembers.id, workspaceId: workspaceMembers.workspaceId, displayName: workspaceMembers.displayName })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.userId, userId))
        .limit(1);
      await logActivity({
        action: "auth.signed_out",
        actorUserId: userId,
        actorMemberId: member?.id ?? null,
        actorName: member?.displayName ?? null,
        workspaceId: member?.workspaceId ?? null,
      });
    },
  },
});
