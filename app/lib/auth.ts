import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./db";
import  { compare } from "bcrypt";

import  CredentialsProvider  from "next-auth/providers/credentials";


export const authOptions : NextAuthOptions = {

    adapter: PrismaAdapter(prisma),
    secret: process.env.NEXTAUTH_SECRET,
pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
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

            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Please enter your email and password');
                }


                const user = await prisma.user.findUnique({
                    where: {
                        email: credentials.email,
                    },
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        password: true,
                    },
                });

                if (!user) {
                    throw new Error('No user found with the provided email');
                }

                const isPasswordValid = await compare(credentials.password, user.password);
                    if (!isPasswordValid) {
                        throw new Error('Invalid password');
                    }

                    console.log('User found', user);

                    return user;
            }
        })
    ],


    callbacks: {
        async jwt({token, user}) {
            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.username = user.username;
            }
            console.log('JWT callback', token);
            return token;
        },
        async session({session, token}) {
            session.user = {
                id : token.id,
                email : token.email,
                username : token.username,
            }
            console.log('Session callback', session);
            return session;
        }
    }

}