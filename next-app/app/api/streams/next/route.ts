import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";





export async function GET(req:NextRequest) {
    try{
        const session = await getServerSession(authOptions)
    if (!session?.user.id) {
        return NextResponse.json({
            message : "Unauthenticated"
        } ,
    {
        status : 403
    })
        
    }
    

    const user = session.user;
    const spaceId = req.nextUrl.searchParams.get("spaceId")


    const mostUpVotedStream = await prisma.stream.findFirst({
        where : {
            userId : user.id,
            played: false ,
            spaceId : spaceId
        },
        orderBy : {
            upvotes:{
                _count : "desc"
            }
        }
    })

    await Promise.all([
        prisma.currentStream.upsert({
            where : {
                spaceId : spaceId as string,
            },
            update :{
                userId : user.id,
                streamId : mostUpVotedStream?.id,
                spaceId : spaceId
            },
            create:{
                userId : user.id ,
                streamId : mostUpVotedStream?.id,
                spaceId : spaceId,
            },
        }),
        prisma.stream.update({
            where:{
                id : mostUpVotedStream?.id ?? "",

            },
            data :{
                played: true ,
                playedTs : new Date(),
            }
        })
    ])
    return NextResponse.json({
        stream: mostUpVotedStream
    })
    } catch(error : any){
        console.error("Error while getting most Voted Stream" , error)
        NextResponse.json({
            message : error
        })
    }

    

}