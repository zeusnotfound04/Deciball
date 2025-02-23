import WebSocket from "ws";
import { createClient, RedisClientType } from "redis";
//@ts-ignore
import youtubesearchapi from "youtube-search-api";
import { Job, Queue, Worker } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { getVideoId, isValidYoutubeURL } from "./utils";
const redisUrl = process.env.REDIS_URL

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

    async addToQueue(spaceId : string , currentUserId : string , url : string ){
        console.log(process.pid + ": addToQueue");

        const space = this.spaces.get(spaceId);
        const currentUser = this.users.get(currentUserId);
        const creatorId = this.spaces.get(spaceId)?.createdId;
        const isCreator = currentUserId === creatorId;
        
        if (!isValidYoutubeURL(url)){
            currentUser?.ws.forEach((ws)=> {
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
                currentUser.ws.forEach((ws) => {
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
                currentUser.ws.forEach((ws) => {
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