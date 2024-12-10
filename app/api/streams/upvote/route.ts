import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaClient } from '../../../lib/db';



// Define schema for upvote validation
const UpvoteSchema = z.object({
    streamId: z.string().uuid("Invalid stream ID format") // Validate stream ID format
});

export async function POST(req: NextRequest) {
    // Get the session, ensure to await the result since it's an async function
    const session = await getServerSession(); // Make sure to await the session


    //TODO : you can get rid of the db call here

    const user = await prismaClient.user.findFirst({
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

    // Validate the request body using Zod
    try {
        const data = UpvoteSchema.parse(await req.json());
        
        // Check if the stream exists in the database
        const stream = await prismaClient.stream.findUnique({
            where: { id: data.streamId }
        });

        if (!stream) {
            return NextResponse.json({
                message: "Stream not found"
            }, { status: 404 });
        }

    

        // Add the upvote
        await prismaClient.upvote.create({
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
