import type { NextAuthOptions, DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

/**
 * Auth.js configuration for Hydrone.
 *
 * In production this would use a real OAuth provider (Google, GitHub, etc.).
 * For the hackathon demo we use a development-friendly approach:
 * - Anonymous sessions via a generated user ID stored in a JWT
 * - The user ID ties Postgres sessions + HydraDB tenant together
 * - Can be upgraded to OAuth without changing the downstream wiring
 */
export const authOptions: NextAuthOptions = {
  // Use middleware-style session; no database adapter needed
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token }) {
      // Generate a stable anonymous user ID if none exists
      if (!token.sub) {
        token.sub = "user-anon-" + crypto.randomUUID().slice(0, 8);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  // Anonymous credentials provider for development
  providers: [
    {
      id: "anon",
      name: "Anonymous",
      type: "credentials",
      credentials: {},
      async authorize() {
        // Always succeed — create anonymous user
        const id = "user-anon-" + crypto.randomUUID().slice(0, 8);
        return { id, name: "Operator " + id.slice(-4) };
      },
    },
  ],
  pages: {
    signIn: "/",
    error: "/",
  },
  secret:
    process.env.AUTH_SECRET || "hydrone-local-dev-secret-do-not-use-in-prod",
};
