import { NextAuthOptions, Session } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./db";
import { compare } from "bcrypt";
import { User } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { JWT } from "next-auth/jwt";
import { Provider } from "@prisma/client";
import jwt from "jsonwebtoken";

import SpotifyProvider from "next-auth/providers/spotify";
type JWTCallbackParams = {
  token: JWT;
  user: User | undefined;
};

type SessionCallbackParams = {
  session: Session;
  token: JWT;
};

// Define Google profile type
interface GoogleProfile {
  email?: string;
  name?: string;
  image?: string;
  picture?: string;
}

// Define account type for OAuth
interface OAuthAccount {
  provider: string;
  type: string;
  providerAccountId: string;
  access_token?: string;
  expires_at?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
  refresh_token?: string;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/signin',
    signOut: '/signout',
  },
  session: {
    strategy: 'jwt',
  },
  providers: [
SpotifyProvider({
  clientId: process.env.SPOTIFY_CLIENT_ID!,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
  authorization: {
    url: "https://accounts.spotify.com/authorize",
    params: {
      scope: "user-library-read user-read-email user-read-private playlist-read-private",
    },
  },
}),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: 'Sign in',
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "hello@gmail.com"
        },
        password: {
          label: "Password",
          type: "password"
        }
      },

      async authorize(credentials): Promise<User | null> {
        console.log('[NextAuth] Credentials authorize called with:', credentials);
        if (!credentials?.email || !credentials.password) {
          console.error('[NextAuth] Missing email or password');
          throw new Error('Email and password are required');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            username: true,
            password: true,
            name: true,
            pfpUrl: true,
            image: true,
          }
        });

        if (!user) {
          console.error('[NextAuth] No user found for email:', credentials.email);
          throw new Error('No user found with the provided email');
        }

        const isPasswordValid = await compare(credentials.password, user.password!);
        if (!isPasswordValid) {
          console.error('[NextAuth] Incorrect password for user:', user.email);
          throw new Error('Incorrect password');
        }
        console.log('[NextAuth] User authorized:', user.email);
        return {
          id: user.id,
          email: user.email,
          name: user.name || null,
          image: user.image || user.pfpUrl || null,
          username: user.username || '',
          pfpUrl: user.pfpUrl || null,
        } as User;
      },
    })
  ],

  callbacks: {
      async signIn({ user, account, profile }) {
      try {
        const provider = account?.provider;

        if (!user.email || !account) return false;

        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { accounts: true },
        });

        // Link OAuth accounts (Google or Spotify)
        if (["google", "spotify"].includes(provider!)) {
          const alreadyLinked = existingUser?.accounts.some(
            (acc) => acc.provider === provider
          );

          if (!alreadyLinked && existingUser) {
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                refresh_token: account.refresh_token,
              },
            });

            // Update user profile image if not set
            const profileImage =
              (profile as GoogleProfile)?.picture || user.image || null;

            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                name: user.name || existingUser.name,
                image: profileImage,
                pfpUrl: profileImage,
                username:
                  existingUser.username ||
                  user.name?.toLowerCase().replace(/\s+/g, "") ||
                  null,
                provider: provider as Provider,
              },
            });
          }

          // Create new user if not found
          if (!existingUser) {
            const newUser = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name,
                image: (profile as GoogleProfile)?.picture || user.image,
                pfpUrl: (profile as GoogleProfile)?.picture || user.image,
                username:
                  user.name?.toLowerCase().replace(/\s+/g, "") || null,
                provider: provider as Provider,
              },
            });

            await prisma.account.create({
              data: {
                userId: newUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                refresh_token: account.refresh_token,
              },
            });
          }
        }

        return true;
      } catch (err) {
        console.error("❌ signIn error:", err);
        return false;
      }
    },
    
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.username = user.username;
        token.pfpUrl = user.image || null;
        token.name = user.name ;
      }
      console.log('[NextAuth] jwt callback token:', token);
      return token;
    },

    async session({ session, token }) {
    //       const customJwt = jwt.sign(
    //   {
    //     userId: token.id,
    //     email: token.email,
    //     creatorId: token.id, // or any other logic
    //     username: token.username || null,
    //     pfpUrl: token.pfpUrl || null,
    //     name: token.name || null,
    //   },
    //   process.env.JWT_SECRET!,
    //   { expiresIn: "1d" }
    // );
      session.user = {
        id: token.id,
        email: token.email,
        username: token.username,
        pfpUrl: token.pfpUrl,
        name: token.name,
      }
      console.log('[NextAuth] session callback session:', session);
      return session;
    }
  }
};