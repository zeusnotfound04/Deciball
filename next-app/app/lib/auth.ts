import { NextAuthOptions, Session } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./db";
import { compare } from "bcrypt";
import { User } from "next-auth"
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { JWT } from "next-auth/jwt";
import { Provider } from "@prisma/client";



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
        if (!credentials?.email || !credentials.password) {
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
          throw new Error('No user found with the provided email');
        }

        const isPasswordValid = await compare(credentials.password, user.password!);
        if (!isPasswordValid) {
          throw new Error('Incorrect password');
        }

        // Return user object that matches NextAuth User type
        return {
          id: user.id,
          email: user.email,
          name: user.name || null,
          image: user.image || user.pfpUrl || null,
          username: user.username || '', // Convert null to empty string
          pfpUrl: user.pfpUrl || null,
        } as User;
      },
    })
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // Only handle Google provider
        if (account?.provider === 'google') {
          const googleProfile = profile as GoogleProfile;
          
          // Get the profile image URL from Google (prefer 'picture' over 'image')
          const profileImageUrl = googleProfile.picture || user.image || null;
          
          // Check if user already exists in database
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
            include: {
              accounts: true
            }
          });

          if (existingUser) {
            // User exists, check if they have a Google account linked
            const existingGoogleAccount = existingUser.accounts.find(
              acc => acc.provider === 'google'
            );

            if (!existingGoogleAccount) {
              // Link Google account to existing user
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
            }

            // Update user info including profile image
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                name: user.name || existingUser.name,
                image: profileImageUrl, // NextAuth standard field
                pfpUrl: profileImageUrl, // Your custom field
                // Update username if it's null and we have a name
                username: existingUser.username || user.name?.toLowerCase().replace(/\s+/g, '') || null,
                provider: Provider.Google, // Update provider to Google
              },
            });

            return true;
          } else {
            // New user - create user with Google profile image
            const newUser = await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name,
                image: profileImageUrl, // NextAuth standard field
                pfpUrl: profileImageUrl, // Your custom field
                username: user.name?.toLowerCase().replace(/\s+/g, '') || null,
                provider: Provider.Google,
                // password is optional for Google users
              },
            });

            // Create the account record
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

            return true;
          }
        }

        // For other providers (credentials), let the default behavior handle it
        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return false; // This will prevent the sign-in
      }
    },
    
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.username = user.username;
        token.pfpUrl = user.pfpUrl || null;
        token.name = user.name || null;
      }
      return token;
    },
    
    async session({ session, token }) {
      session.user = {
        id: token.id,
        email: token.email,
        username: token.username,
        pfpUrl: token.pfpUrl,
        name: token.name,
      }
      return session;
    }
  }
}