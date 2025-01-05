import { prismaClient } from "@/app/lib/db";
import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

const handler = NextAuth({
    providers: [
        DiscordProvider({
            clientId: process.env.DISCORD_CLIENT_ID ?? "",
            clientSecret: process.env.DISCORD_CLIENT_SECRET ?? ""
        })
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            try {
               
                await prismaClient.user.create({
                    data: {
                        email: user.email ?? "",
                        provider: "Discord" // Assuming you have a DISCORD value in your Provider enum
                    }
                });
               
                
                return true;
            } catch (error) {
                console.error("Error in signIn callback:", error);
                return false;
            }
        },

    }
});

export { handler as GET, handler as POST };