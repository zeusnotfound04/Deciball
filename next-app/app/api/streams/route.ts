import { prisma } from '@/app/lib/db';
import { NextRequest, NextResponse } from "next/server"
import {z} from "zod"

import youtubesearchapi from 'youtube-search-api'
const YT_REGEX = /^(?:(?:https?:)?\/\/)?(?:www\.)?(?:m\.)?(?:youtu(?:be)?\.com\/(?:v\/|embed\/|watch(?:\/|\?v=))|youtu\.be\/)((?:\w|-){11})(?:\S+)?$/;

const CreateStreamSchema = z.object({
    creatorId : z.string(),
    url : z.string()
})


export async function POST(req:NextRequest) {

    try {
        const data = CreateStreamSchema.parse(await req.json())
        
        const isYt = data.url.match(YT_REGEX)
        if(!isYt){
            return NextResponse.json({
                message : "Wrong URL format"
            }, {
                status : 411
            })
        }
        const extractedId = data.url.split("?v=")[1]

        const res = await youtubesearchapi.GetVideoDetails(extractedId)


        const smallImage = JSON.stringify(res.thumbnail.thumbnails[0].url);
        
        const bigImage = JSON.stringify(res.thumbnail.thumbnails.at(-1).url);


        const stream = await prisma.stream.create({
            data : {
                userId :data.creatorId,
                url : data.url,
                extractedId,
                title : res.title,
                smallImage : smallImage,
                bigImage : bigImage,
                type : "Youtube"
            }
        })

        console.log(stream)

        return NextResponse.json({
            message : "Stream added successfully",
            id : stream.id
        })
    } catch (e) {
        return NextResponse.json({
            message : "Error while adding a stream"
        }, {
            status : 441
        })
    }
    
}


export async function GET(req :NextRequest) {

    const creatorId = req.nextUrl.searchParams.get("creatorId")
    const streams = await prisma.stream.findMany({
        where :{
            userId : creatorId ?? ""
        }
    })


    return NextResponse.json({
        streams
    })
}