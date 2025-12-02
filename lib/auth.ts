import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  NotAuthorizedException,
  UserNotFoundException,
} from "@aws-sdk/client-cognito-identity-provider";
import { createHmac } from "crypto";
import { prisma } from "@/lib/db";
import type { UserRole } from "@prisma/client";

// Cognito client for direct authentication
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "us-east-2",
});

// Compute SECRET_HASH required when app client has a secret
function computeSecretHash(username: string): string {
  const clientId = process.env.COGNITO_CLIENT_ID!;
  const clientSecret = process.env.COGNITO_CLIENT_SECRET!;
  const message = username + clientId;
  return createHmac("sha256", clientSecret).update(message).digest("base64");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        try {
          // Authenticate with Cognito using USER_PASSWORD_AUTH flow
          const command = new InitiateAuthCommand({
            AuthFlow: "USER_PASSWORD_AUTH",
            ClientId: process.env.COGNITO_CLIENT_ID!,
            AuthParameters: {
              USERNAME: email,
              PASSWORD: password,
              SECRET_HASH: computeSecretHash(email),
            },
          });

          const response = await cognitoClient.send(command);

          if (!response.AuthenticationResult) {
            throw new Error("Authentication failed");
          }

          // Return user object for NextAuth
          return {
            id: email,
            email: email,
            name: email.split("@")[0], // Will be updated from DB
          };
        } catch (error) {
          if (error instanceof NotAuthorizedException) {
            throw new Error("Invalid email or password");
          }
          if (error instanceof UserNotFoundException) {
            throw new Error("Invalid email or password");
          }
          console.error("Cognito auth error:", error);
          throw new Error("Authentication failed");
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async signIn({ user }) {
      // Auto-create user in Prisma on first login
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

    async jwt({ token, user }) {
      // On initial sign in, fetch the Prisma user to get their ID and role
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
          token.name = dbUser.name; // Use name from DB
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
