import WebSocket from "ws";
import { createClient, RedisClientType } from "redis";
//@ts-ignore
import youtubesearchapi from "youtube-search-api";
import { Job, Queue, Worker } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { getVideoId, isValidYoutubeURL } from "./utils";
const redisUrl = process.env.REDIS_URL




const TIME_SPAN_FOR_VOTE = 1200000; // 20min
const TIME_SPAN_FOR_QUEUE = 1200000; // 20min
const TIME_SPAN_FOR_REPEAT = 3600000;
const MAX_QUEUE_LENGTH = 20;


const connection = {
    username: process.env.REDIS_USERNAME || "",
    password: process.env.REDIS_PASSWORD || "",
    host: process.env.REDIS_HOST || "",
    port: parseInt(process.env.REDIS_PORT || "") || 6379,
  };
  
export class RoomManager {

    private static instance : RoomManager;
    public spaces : Map<string , Space>;
    public users : Map<string , Users>
    public redisClient : RedisClientType;
    public publisher : RedisClientType;
    public subscriber : RedisClientType;
    public prisma : PrismaClient;
    public queue : Queue ;
    public worker : Worker;
    public wsToSpace : Map<WebSocket, string>

    
    private constructor() {
        this.spaces = new Map();
        this.users = new Map();
        
        this.redisClient = createClient({
            url : redisUrl,
            socket : {
                tls : true,
                reconnectStrategy : () => 1000,
            }
        })

        this.publisher = createClient({
            url : redisUrl,
            socket : {
                tls : true,
                reconnectStrategy : () => 1000,
            }
        })

        this.subscriber = createClient({
            url : redisUrl,
            socket : {
                tls : true,
                reconnectStrategy : () => 1000,
            }
        })
        this.prisma = new PrismaClient();
        this.queue = new Queue(process.pid.toString(), {
            connection
        })
        this.worker = new Worker(process.pid.toString(), this.processJob, {
            connection,
          });
        this.wsToSpace = new Map();
    }

    static getInstance() {
        if (!RoomManager.instance) {
            RoomManager.instance = new RoomManager();
        }
        return RoomManager.instance;
    }

//
    // async processJob (job : Job){
    //     const {data , name} = job;
    //     if(name  === "cast-vote"){
    //         await RoomManager.getInstance().admin
    //     }
    // }


    async initRedisClient () {
        await this.redisClient.connect();
        await this.publisher.connect();
        await this.subscriber.connect();
        console.log("✅ Connected to Upstash Redis");
    }

    onSubscribeRoom( message : string , spaceId : string ){
        console.log("Subscribe Room" , spaceId )
        const {type , data } = JSON.parse(message);
        if (type === "new-stream"){
            RoomManager.getInstance().puli
        }
    }

    async CreateRoom(spaceId : string) {
        console.log(process.pid + ": createRoom" , {spaceId});
        if (!this.spaces.has(spaceId)){
         this.spaces.set(spaceId , {
            users : new Map<string , Users>(),
            creatorId : "",
         })
         await this.subscriber.subscribe(spaceId , thiss)
        }
    }


    async adminCasteVote (
        creatorId : string ,
        userId : string,
        streamId : string,
        vote : string,
        spaceId : string
    ) {
        console.log(process.pid + "adminCaste");
        if (vote === "upvote"){
            await this.prisma.upvote.create({
              data: {
                id : crypto.randomUUID(),
                userId ,
                streamId 
              }
            })
        } else {
            await this.prisma.upvote.delete({
                where : {
                    userId_streamId : {
                        userId,
                        streamId
                    }
                }
            })
        }

        await this.redisClient.set(
            `lastVoted-${spaceId}-${userId}`,
            new Date().getTime(),
            {
                EX : TIME_SPAN_FOR_VOTE /1000,
            }
        )


        await this.publisher.publish(
            spaceId,
            JSON.stringify({
                type : "new-type",
                data : {
                    streamId,
                    vote,
                    voteBy : userId
                }
            })

        )
    }


    async casteVote( 

        userId : string,
        streamId : string,
        vote : "upvote" | "downvote",
        spaceId : string
    ){
        console.log(process.pid + "casteVote")
        const space = this.spaces.get(spaceId)
        const currentUser = this.users.get(userId)
        const creatorId = this.spaces.get(spaceId)?.creatorId;
        const isCreator = currentUser?.userId === creatorId;

        if(!space || !currentUser){
            return;
        }

        if (!isCreator){
            const lastVoted = await this.redisClient.get(
                `lastVoted-${spaceId}-${userId}`
            )
            if (lastVoted){
                currentUser?.ws.forEach((ws : WebSocket)=> {
                    ws.send(
                        JSON.stringify({
                            type : "error",
                            data : {
                                message : "You can vote after 20 mins"
                            }
                        })
                    )
                    
                });

                return;
            }

            await this.queue.add("cast-vote" , {
                creatorId,
                userId,
                streamId,
                vote,
                spaceId : spaceId
            })
        }
    }


    publishNewStream(spaceId : string , data : any){
        console.log(process.pid + ": PublishNewStream");
        console.log("Publish New Stream" , spaceId)
        const space = this.spaces.get(spaceId);

        if (space){
            space?.users.forEach((user ,userId) => {
                user?.ws.forEach((ws : WebSocket) {
                    ws.send(
                        JSON.stringify({
                            type : `new-stream/${spaceId}`,
                            data : data
                        })
                    )
                })
            })
        }
    }

    async adminStreamHandler(
        spaceId : string,
        userId : string,
        url : string,
        existingActiveStream : string
        ){
            console.log(process.pid+"adminAddStreamHandler")
            console.log("adminAddStreamHandler" , spaceId)
            const room = this.spaces.get(spaceId)
            const currentUser = this.users.get(userId)


            if(!room || typeof existingActiveStream !== "number"){
                return
            }


            const extractedId = getVideoId(url)


            if(!extractedId){
                currentUser?.ws.forEach((ws : WebSocket ) => {
                    ws.send(
                        JSON.stringify({
                            type : "error",
                            data : {
                                message : "Invalid Youtube URL"
                            }
                        })
                    )
                    
                });
                return
            }

            await this.redisClient.set(
                `queue-length-${spaceId}`,
                existingActiveStream + 1
            )

            const res = await  youtubesearchapi.GetVideoDetails(extractedId)


            if (res.thumbnail){
                const stream = await this.prisma.stream.create({
                    data : {
                        id : crypto.randomUUID(),
                        userId : userId ,
                        url : url,
                        extractedId,
                        type : "Youtube",
                        addedBy : userId,
                        title : res.title ?? "Cant Find the video",
                        smallImg : res.thumbnail.thumbnails[0].url,
                        bigImg : res.thumbnail.thumbnails.at(-1).url,
                        spaceId : spaceId

                    }
                })

                await this.redisClient.set(`${spaceId}-${url}`, new Date().getTime(), {
                    EX : TIME_SPAN_FOR_REPEAT / 1000,
                }  )

                await this.redisClient.set(
                    `lastAdded-${spaceId}-${userId}`,
                    new Date().getTime(),
                    {
                        EX : TIME_SPAN_FOR_REPEAT / 1000
                    }

                )

                await this.publisher.publish(
                    spaceId,
                    JSON.stringify({
                      type: "new-stream",
                      data: {
                        ...stream,
                        hasUpvoted: false,
                        upvotes: 0,
                      },
                    })
                  );

            } else {
                currentUser?.ws.forEach((ws : WebSocket) => {
                    ws.send(
                        JSON.stringify({
                            type : "error",
                            data : {
                                message : "Video Not Found"
                            }
                        })
                    )
                    
                });
            }

        }

    async addToQueue(spaceId : string , currentUserId : string , url : string ){
        console.log(process.pid + ": addToQueue");

        const space = this.spaces.get(spaceId);
        const currentUser = this.users.get(currentUserId);
        const creatorId = this.spaces.get(spaceId)?.creatorId;
        const isCreator = currentUserId === creatorId;
        
        if (!isValidYoutubeURL(url)){
            currentUser?.ws.forEach((ws : WebSocket)=> {
                ws.send(
                    JSON.stringify({
                        type: "error",
                        data : { message : "Invalid Youtube URL"}
                    })
                )
                
            });
            return;
        }

        let previousQueueLength = parseInt(
         (await this.redisClient.get(`queue-length-${spaceId}`)) || "0",
         10
        )


        // checking if its zero that means theres is no record in

        if (!previousQueueLength){
            previousQueueLength = await this.prisma.stream.count({
                where : {
                    spaceId : spaceId,
                    played : false,
                }
            })
        }

        if (!isCreator){
            let lastAdded = await this.redisClient.get(
                `lastAdded-${spaceId}-${currentUserId} `
            )

            if(lastAdded){
                currentUser.ws.forEach((ws : WebSocket) => {
                    ws.send(
                        JSON.stringify({
                            type : "error",
                            data : {
                                message : "You can add again after 20 min"
                            }
                        })
                    )
                    
                });
                return;
            }
            let alreadyAdded = await this.redisClient.get(`${spaceId}-${url}`)

            if (alreadyAdded){
                currentUser.ws.forEach(() => {
                    JSON.stringify({
                        type : "error",
                        data : {
                            message :"This song is Blocked for 1 hour"
                        }
                    })
                });
                return;
            }

            if (previousQueueLength >=MAX_QUEUE_LENGTH){
                currentUser.ws.forEach((ws : WebSocket ) => {
                    ws.send(
                        JSON.stringify({
                            type : "error",
                            data : {
                                message : "Queue limit reached"
                            }
                        })
                    )
                    
                });
                return;
            }

            await this.queue.add("add-to-queue" ,{
                spaceId,
                userId : currentUser.userId,
                url,
                existingActiveStream : previousQueueLength,
            })
        }
    }
    

}



type User = {
    userId: string;
    ws: WebSocket[];
    token: string;
  };
  
  type Space = {
    creatorId: string;
    users: Map<String, User>;
  };