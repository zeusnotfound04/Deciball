import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from '@/app/lib/db';
import { authOptions } from "@/app/lib/auth";



// Define schema for upvote validation
const UpvoteSchema = z.object({
    streamId: z.string().uuid("Invalid stream ID format") // Validate stream ID format
});

export async function POST(req: NextRequest) {
    // Get the session, ensure to await the result since it's an async function
    const session = await getServerSession(authOptions); // Make sure to await the session


    //TODO : you can get rid of the db call here
    

    const user = await prisma.user.findFirst({
        where:{
            email : session?.user?.email ?? ""
        }
    })
    if (!user) {
            return NextResponse.json({
                message: "Unauthenticated"
            }, {
                status: 401 // Unauthorized
            });
        }

   
    try {
        const data = UpvoteSchema.parse(await req.json());
        
  
        const stream = await prisma.stream.findUnique({
            where: { id: data.streamId }
        });

        if (!stream) {
            return NextResponse.json({
                message: "Stream not found"
            }, { status: 404 });
        }

    

        // Add the upvote
        await prisma.upvote.create({
            data: {
                userId: user.id,
                streamId: data.streamId
            }
        });

        return NextResponse.json({
            message: "Stream upvoted successfully"
        }, { status: 200 });

    } catch (error) {
        console.error(error); // Log errors for debugging
        return NextResponse.json({
            message: "Invalid data format",
            error: error instanceof Error ? error.message : "Unknown error"
        }, {
            status: 400
        });
    }
}
