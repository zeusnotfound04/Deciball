import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";







const RemoveStreamSchema = z.object({
    streamId : z.string(),
    spaceId : z.string()
})



export async function DELETE(req:NextRequest) {
    try{

        const session = await getServerSession(authOptions)

        if (!session?.user.id){
            return NextResponse.json({
                message : "Unauthenticated"
            } ,
        {
            status: 403
        })
        }
        
        const user = session.user


        const { searchParams } = new URL(req.url)
        const streamId = searchParams.get("streamId")
        const spaceId = searchParams.get("spaceId")


        if(!streamId){
            return NextResponse.json({
                message : "Stream ID is required"
            } ,{
                status : 400
            })
        }

        await prisma.stream.delete({
            where: {
                id : streamId,
                userId : user.id,
                spaceId : spaceId
            }
        })

        return NextResponse.json({
            message : "Song removed successfully"
        })


    }  catch(error : any){
        console.error("Error while Removing the Song")
        return NextResponse.json({
                message: "Error while removing the songs "
        },{
            status: 400
        }
    )
    }
        
}