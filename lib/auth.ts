import NextAuth from "next-auth";
import Cognito from "next-auth/providers/cognito";
import { prisma } from "@/lib/db";
import type { UserRole } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Cognito({
      clientId: process.env.COGNITO_CLIENT_ID!,
      clientSecret: process.env.COGNITO_CLIENT_SECRET!,
      issuer: process.env.COGNITO_ISSUER!,
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async signIn({ user }) {
      // Auto-create user in Prisma on first Cognito login
      if (user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (!existingUser) {
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name || null,
              role: "CLINICIAN",
            },
          });
        }
      }
      return true;
    },

    async jwt({ token, user, account }) {
      // On initial sign in, fetch the Prisma user to get their ID and role
      if (account && user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
        }
      }
      return token;
    },

    async session({ session, token }) {
      // Expose userId and role to the client session
      if (token) {
        (session.user as unknown as { id: string; role: UserRole }).id = token.userId as string;
        (session.user as unknown as { id: string; role: UserRole }).role = token.role as UserRole;
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
});
