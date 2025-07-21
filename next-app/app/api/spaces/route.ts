import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        console.log("=== Space Creation API Called ===");
        
        const session = await getServerSession(authOptions);
        console.log("Session:", JSON.stringify(session, null, 2));

        if (!session?.user?.id) {
            console.log("No valid session found");
            return NextResponse.json(
                { success: false, message: "You must be logged in to create a space" },
                { status: 401 }
            );
        }

        const data = await req.json();
        console.log("Request data:", JSON.stringify(data, null, 2));

        if (!data.spaceName) {
            console.log("Missing spaceName in request");
            return NextResponse.json(
                { success: false, message: "Space name is required" },
                { status: 400 }
            );
        }

        console.log("Testing database connection...");
        await prisma.$connect();
        console.log("Database connected successfully");


        console.log("Creating space with data:", {
            name: data.spaceName,
            hostId: session.user.id
        });

        const space = await prisma.space.create({
            data: {
                name: data.spaceName,
                hostId: session.user.id,
                
            }
        });

        console.log("Space created successfully:", space);

        return NextResponse.json(
            { success: true, message: "Space created successfully", space },
            { status: 201 }
        );

    } catch (error: any) {
        console.error("=== ERROR IN SPACE CREATION ===");
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        
        if (error.code === 'P2002') {
            return NextResponse.json(
                { success: false, message: "A space with this name already exists" },
                { status: 409 }
            );
        }
        
        if (error.code === 'P2003' || error.message.includes('Foreign key constraint')) {
            return NextResponse.json(
                { 
                    success: false, 
                    message: "User not found in database. Please log out and log back in.",
                    errorCode: "USER_NOT_FOUND"
                },
                { status: 400 }
            );
        }

        if (error.message === "Unauthenticated Request") {
            return NextResponse.json(
                { success: false, message: "You must be logged in to create a space" },
                { status: 401 }
            );
        }

        if (error.message.includes('connect') || error.message.includes('database')) {
            return NextResponse.json(
                { success: false, message: "Database connection error" },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { 
                success: false, 
                message: `An unexpected error occurred: ${error.message}`,
                errorCode: error.code || 'UNKNOWN'
            },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}
export async function DELETE(req : NextRequest){
    try {
        const spaceId = req.nextUrl.searchParams.get("spaceId");
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success : false , message : "Space Id is required"},
                {status : 401}
            )
        }

        if (!spaceId){
            return NextResponse.json(
                {success : false , message : "Space not found" },
                { status : 404}
            )
        }

        console.log(spaceId);

        const space = await prisma.space.findUnique({
            where :{
                id : spaceId
            }
        })

        if(!space){
            return NextResponse.json(
                { success: false, message: "Space not found" },
                { status: 404 }
            )
        }

        if ( space.hostId !== session.user.id){
            return NextResponse.json(
                {success : false , message : "You are not authorized to delete this space"},
                {status : 403}
            )
        }

        await prisma.space.delete({
            where : {id : spaceId}
        })

        return NextResponse.json(
            {success : true , message : "space deleted successfully"},
            {status : 200}
        )

        
    } catch (error : any) {
        console.error("Error Deleting the space"  , error)

        return NextResponse.json(
            {success : false , message : `Error deleting space : ${error.message}`},
            {status : 401}
        )
    }
}



export async function GET(req:NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
              { success: false, message: "You must be logged in to retrieve space information" },
              { status: 401 }
            );
          }
          const spaceId = req.nextUrl.searchParams.get("spaceId");


          if (spaceId) {
            const space = await prisma.space.findUnique({
              where: { id: spaceId },
              select: { hostId: true, name: true },
            });
      
            if (!space) {
              return NextResponse.json(
                { success: false, message: "Space not found" },
                { status: 404 }
              );
            }
      
            return NextResponse.json(
              { success: true, message: "Space information retrieved successfully", hostId: space.hostId, spaceName: space.name },
              { status: 200 }
            );
          }
      
         
        const spaces = await prisma.space.findMany({
            where:{
                hostId:session.user.id
            },
            select: {
                id: true,
                name: true,
                hostId: true,
                isActive: true
            },
            orderBy: {
                id: 'desc'
            }
        });


        return NextResponse.json(
            { success: true, message: "Spaces retrieved successfully", spaces: spaces },
            { status: 200 }
        )
      
    } catch (error:any) {


        console.error("Error retrieving space:", error);

        return NextResponse.json(
            { success: false, message: `Error retrieving space: ${error.message}` },
            { status: 500 }
        );
            
    }
}