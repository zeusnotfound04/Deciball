
import { NextAuthOptions, Session } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./db";
import { compare } from "bcrypt";
import { User } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { JWT } from "next-auth/jwt";
import { Provider } from "@prisma/client";
import SpotifyProvider from "next-auth/providers/spotify";

type JWTCallbackParams = {
  token: JWT;
  user: User | undefined;
};

type SessionCallbackParams = {
  session: Session;
  token: JWT;
};

interface GoogleProfile {
  email?: string;
  name?: string;
  image?: string;
  picture?: string;
}

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
  debug: true,
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
          scope: "user-read-email user-read-private user-top-read playlist-read-private",
          show_dialog: "true"
        }
      },
      checks: process.env.NODE_ENV === 'development' ? [] : ['state'],
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
        console.log('[NextAuth] signIn callback called:', { user, account, profile });
        if (account?.provider === 'Google' || account?.provider === 'Spotify' ) {
          const googleProfile = profile as GoogleProfile;
          const profileImageUrl = googleProfile.picture || user.image || null;
          console.log('[NextAuth] Google profile image URL:', profileImageUrl);
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
            include: {
              accounts: true
            }
          });
          console.log('[NextAuth] Existing user found:', existingUser);
          if (existingUser) {
            const existingGoogleAccount = existingUser.accounts.find(
              acc => acc.provider === 'Google'
            );
            if (!existingGoogleAccount) {
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
              console.log('[NextAuth] Linked Google account to existing user:', existingUser.id);
            }
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                name: user.name || existingUser.name,
                image: profileImageUrl,
                pfpUrl: profileImageUrl,
                username: existingUser.username || user.name?.toLowerCase().replace(/\s+/g, '') || null,
                provider: Provider.Google,
              },
            });
            console.log('[NextAuth] Updated user info for:', existingUser.id);
            return true;
          } else {
            const newUser = await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name,
                image: profileImageUrl,
                pfpUrl: profileImageUrl,
                username: user.name?.toLowerCase().replace(/\s+/g, '') || null,
                provider: Provider.Google,
              },
            });
            console.log('[NextAuth] Created new user:', newUser.id);
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
            console.log('[NextAuth] Created account for new user:', newUser.id);
            return true;
          }
        }
        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
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
      } else if (token.id) {
        // Fetch fresh user data from database to ensure we have latest profile info
        try {
          const freshUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              id: true,
              email: true,
              name: true,
              username: true,
              pfpUrl: true,
              image: true,
            }
          });
          
          if (freshUser) {
            token.id = freshUser.id;
            token.email = freshUser.email;
            token.username = freshUser.username || '';
            token.pfpUrl = freshUser.pfpUrl || freshUser.image || null;
            token.name = freshUser.name || '';
          }
        } catch (error) {
          console.error('Error fetching fresh user data in JWT callback:', error);
        }
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
};