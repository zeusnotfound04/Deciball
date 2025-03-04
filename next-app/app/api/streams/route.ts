import { prisma } from '@/app/lib/db';
import { NextRequest, NextResponse } from "next/server"
import {z} from "zod"

//@ts-ignore
import youtubesearchapi from 'youtube-search-api'
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';




const YT_REGEX = /^(?:(?:https?:)?\/\/)?(?:www\.)?(?:m\.)?(?:youtu(?:be)?\.com\/(?:v\/|embed\/|watch(?:\/|\?v=))|youtu\.be\/)((?:\w|-){11})(?:\S+)?$/;

const CreateStreamSchema = z.object({
    spaceId : z.string(),
    creatorId : z.string(),
    url : z.string()
})


export async function POST(req:NextRequest) {

    try {
        const session = await getServerSession(authOptions)
        const data = CreateStreamSchema.parse(await req.json())
        
        
        if(!session?.user.id){
            return NextResponse.json(
                {
                    message : "Youtube link cannot be empty"
                },
                {
                    status : 400
                }
            )
        }
       
        
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

        const user = session.user;

        if (user.id !== data.creatorId){
            const tenMinutesAgo = new Date(Date.now()- 10 * 60 * 1000 )
            const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)

            const userRecentStreams = await prisma.stream.count({
                where : {
                    userId : data.creatorId,
                    extractedId : user.id,
                    createAt : {
                        gte : tenMinutesAgo,
                    }
                }
            })

            const duplicateSong = await prisma.stream.findFirst({
                where : {
                    userId : data.creatorId,
                    extractedId : extractedId,
                    createAt : {
                        gte : tenMinutesAgo,
                    }
                }
            })

            if(duplicateSong){
                return NextResponse.json(
                    {
                        message : "This song was already added in the last 10 minutes"
                    },
                    {
                        status : 429
                    }
                )
            }

            const streamLastTwoMinutes = await prisma.stream.count({
                where : {
                    userId : data.creatorId,
                    addedBy : user.id,
                    createAt: {
                        gte : twoMinutesAgo
                    }
                }
            })

            if (userRecentStreams >= 5) {
                return NextResponse.json({
                    message : "Rate limit Exceeded: You can only add 5 songs per 10 minutes"
                } ,{
                    status : 429
                })
            }
        }

        const smallImage = JSON.stringify(res.thumbnail.thumbnails[0].url);
        
        const bigImage = JSON.stringify(res.thumbnail.thumbnails.at(-1).url);


        const stream = await prisma.stream.create({
            data : {
                userId :data.creatorId,
                addedBy : user.id,
                url : data.url,
                extractedId,
                title : res.title,
                smallImg : smallImage,
                bigImg : bigImage,
                type : "Youtube"
            }
        })

        console.log(stream)

        return NextResponse.json({
          ...stream ,
          hasUpvoted: false,
          upvotes : 0
        })
    } catch (e) {
        return NextResponse.json({
            message : "Error while adding a stream"
        }, {
            status : 441
        })
    }
    
}

export async function GET(req: NextRequest) {
    const spaceId = req.nextUrl.searchParams.get("spaceId");
    const session = await getServerSession(authOptions);
    if (!session?.user.id) {
      return NextResponse.json(
        {
          message: "Unauthenticated",
        },
        {
          status: 403,
        },
      );
    }
    const user = session.user;
  
    if (!spaceId) {
      return NextResponse.json({
          message: "Error"
      }, {
          status: 411
      })
  }
  
    const [space, activeStream] = await Promise.all([
      prisma.space.findUnique({
        where: {
            id: spaceId,
        },
        include: {
            streams: {
                include: {
                    _count: {
                        select: {
                            upvotes: true
                        }
                    },
                    upvotes: {
                        where: {
                            userId: session?.user.id
                        }
                    }
  
                },
                where:{
                    played:false
                }
            },
            _count: {
                select: {
                    streams: true
                }
            },                
  
        }
        
    }),
    prisma.currentStream.findFirst({
        where: {
            spaceId: spaceId
        },
        include: {
            stream: true
        }
    })
    ]);
  
    const hostId =space?.hostId;
    const isCreator = session.user.id=== hostId
  
    return NextResponse.json({
      streams: space?.streams.map(({_count, ...rest}) => ({
          ...rest,
          upvotes: _count.upvotes,
          haveUpvoted: rest.upvotes.length ? true : false
      })),
      activeStream,
      hostId,
      isCreator,
      spaceName:space?.name
  });
  }