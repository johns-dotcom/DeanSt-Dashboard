import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

const DOMAIN_RESTRICTION = "deanst.co";

/**
 * Edge-safe auth config used by middleware.
 * No database adapter, no credentials authorize() — those live in auth.ts.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          hd: DOMAIN_RESTRICTION,
          scope: "openid email profile https://www.googleapis.com/auth/gmail.send",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        const email = profile?.email ?? "";
        const domain = email.split("@")[1];
        if (domain && domain !== DOMAIN_RESTRICTION) return false;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
