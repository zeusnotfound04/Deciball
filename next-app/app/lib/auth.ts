
import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./db";
import  { compare } from "bcrypt";
import { User } from "next-auth"

import  CredentialsProvider  from "next-auth/providers/credentials";


export const authOptions : NextAuthOptions = {

    adapter: PrismaAdapter(prisma),
    secret: process.env.NEXTAUTH_SECRET,
pages: {
    signIn: '/signin',
    signOut: '/signout',
},
session : {
    strategy: 'jwt',
},  
    providers: [
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
          select : {
            id : true,
            email : true,
            username : true,
            // role : true,
            password : true,
        
          }
        });

        if (!user) {
          throw new Error('No user found with the provided email');
        }

        const isPasswordValid = await compare(credentials.password, user!.password!);
        if (!isPasswordValid) {
          throw new Error('Incorrect password');
        }
        
        return user

      },

        })
    ],


    callbacks: {
        async jwt({token, user}) {
            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.username = user.username;
            }
            // console.log('JWT callback', token);
            return token;
        },
        async session({session, token}) {
            session.user = {
                id : token.id,
                email : token.email,
                username : token.username,
            }
            // console.log('Session callback', session);
            return session;
        }
    }

}