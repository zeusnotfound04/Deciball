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
  debug: process.env.NODE_ENV === 'development',
  useSecureCookies: false, // Disable secure cookies for development
  pages: {
    signIn: '/signin',
    signOut: '/signout',
  },
  
  cookies: {
    state: {
      name: "next-auth.state",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
        maxAge: 900,
      },
    },
    pkceCodeVerifier: {
      name: "next-auth.pkce.code_verifier", 
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
        maxAge: 900,
      },
    },
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
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      checks: process.env.NODE_ENV === 'development' ? [] : ['state'],
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
    console.log('[NextAuth] 🎗️⚡😍 signIn called with user:', user, 'account:', account, 'profile:', profile);
    
    // Basic validation
    if (!user.email || !account) {
      console.error('[NextAuth] Missing user email or account');
      return false;
    }

    const provider = account.provider;
    console.log('Provider:', provider);
    console.log('Getting existing user with email:', user.email);

    // Handle OAuth providers (Google, Spotify)
    if (["google", "spotify"].includes(provider)) {
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
        include: { accounts: true },
      });

      if (existingUser) {
        console.log('Found existing user:', existingUser.email);
        
        // Check if this provider account is already linked
        const alreadyLinked = existingUser.accounts.some(
          (acc) => acc.provider === provider && acc.providerAccountId === account.providerAccountId
        );

        if (!alreadyLinked) {
          console.log("Linking new account for existing user:", existingUser.email);
          
          // Create new account link
          const newAccount = await prisma.account.create({
            data: {
              userId: existingUser.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              access_token: account.access_token || null,
              expires_at: account.expires_at || null,
              token_type: account.token_type || null,
              scope: account.scope || null,
              id_token: account.id_token || null,
              refresh_token: account.refresh_token || null,
            },
          });
          console.log("Account created:", newAccount.id);

          // Update user profile if needed
          const profileImage = (profile as any)?.picture || user.image || null;
          
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              name: user.name || existingUser.name,
              image: profileImage || existingUser.image,
              pfpUrl: profileImage || existingUser.pfpUrl,
              username: existingUser.username || 
                       user.name?.toLowerCase().replace(/\s+/g, "") || 
                       null,
              provider: provider as Provider,
            },
          });
        } else {
          console.log("Account already linked for user:", existingUser.email);
        }
      } else {
        console.log("Creating new user for email:", user.email);
        
        // Create new user
        const profileImage = (profile as any)?.picture || user.image || null;
        console.log("Profile data:", {
           email: user.email,
            name: user.name || null,
            image: profileImage,
            pfpUrl: profileImage,
            username: user.name?.toLowerCase().replace(/\s+/g, "") || null,
            provider: provider as Provider,
        });
        const newUser = await prisma.user.create({
          data: {
            email: user.email,
            name: user.name || null,
            image: profileImage,
            pfpUrl: profileImage,
            username: user.name?.toLowerCase().replace(/\s+/g, "") || null,
            provider: provider as Provider,
          },
        });
        console.log("New user created:", newUser.id);

        // Create account for new user
        const newAccount = await prisma.account.create({
          data: {
            userId: newUser.id,
            type: account.type,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            access_token: account.access_token || null,
            expires_at: account.expires_at || null,
            token_type: account.token_type || null,
            scope: account.scope || null,
            id_token: account.id_token || null,
            refresh_token: account.refresh_token || null,
          },
        });
        console.log("Account created for new user:", newAccount.id);
      }
    }

    console.log('[NextAuth] signIn callback completed successfully');
    return true;
    
  } catch (err) {
    console.error("❌ signIn error:", err);
    // Log the full error for debugging
    if (err instanceof Error) {
      console.error("Error message:", err.message);
      console.error("Error stack:", err.stack);
    }
    return false;
  }
},
    async jwt({ token, user }) {
      console.log('[NextAuth] jwt callback called with user:', user , token);
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
      console.log('[NextAuth] session callback called with session:_______>', session, 'token:', token);
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