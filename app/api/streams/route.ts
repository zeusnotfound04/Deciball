import { prismaClient } from './../../lib/db';
import { NextRequest, NextResponse } from "next/server"
import {z} from "zod"


const CreatStreamSchema = z.object({
    creatorId : z.string(),
    url : z.string()
})


export async function POST(req:NextRequest) {

    try {
        const data = CreatStreamSchema.parse(await req.json())
        prismaClient.stream.create({
            userId :data.creatorId,
            

        })
    } catch (e) {
        return NextResponse.json({
            message : "Error while adding a stream"
        }, {
            status : 441
        })
    }
    
}