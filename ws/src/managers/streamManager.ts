import WebSocket from "ws";
import { createClient, RedisClientType } from "redis";
//@ts-ignore
import youtubesearchapi from "youtube-search-api";
import { Job, Queue, tryCatch, Worker } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { getVideoId, isValidYoutubeURL } from "../utils/utils";
import { MusicSourceManager } from "../handlers";




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
    private musicSourceManager: MusicSourceManager;
    private static instance : RoomManager;
    public spaces : Map<string , Space>;
    public users : Map<string , User>
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
        this.musicSourceManager = new MusicSourceManager();
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


    async processJob(job: Job) {
      try{
        const { data, name } = job;
        if (name === "cast-vote") {
          console.log("From the Process Job 💦 Going to caste the vote (btw em minor)")
          await RoomManager.getInstance().adminCasteVote(
            // data.creatorId,
            data.userId,
            data.streamId,
            data.vote,
            data.spaceId
          );
        } else if (name === "add-to-queue") {
          console.log("Processing add-to-queue job", data);
          await RoomManager.getInstance().adminStreamHandler(
            data.spaceId,
            data.userId,
            data.url,
            data.existingActiveStream
          );
          console.log("Finished processing add-to-queue job");
        } else if (name === "play-next") {
          await RoomManager.getInstance().adminPlayNext(data.spaceId, data.userId , data.url);
        } else if (name === "remove-song") {
          await RoomManager.getInstance().adminRemoveSong(
            data.spaceId,
            data.userId,
            data.streamId
          );
        } else if (name === "empty-queue") {
          await RoomManager.getInstance().adminEmptyQueue(data.spaceId);
        }
      } catch(error : any){
        console.error("Error processing job:", error);
        throw error; // Re-throw to mark job as failed
      }
        
      }
    


    async initRedisClient () {
        await this.redisClient.connect();
        await this.publisher.connect();
        await this.subscriber.connect();
        console.log("✅ Connected to Upstash Redis");
    }
    onSubscribeRoom(message: string, spaceId: string) {
        console.log("Subscibe Room", spaceId);
        const { type, data } = JSON.parse(message);
        if (type === "new-stream") {
          RoomManager.getInstance().publishNewStream(spaceId, data);
        } else if (type === "new-vote") {
          RoomManager.getInstance().publishNewVote(
            spaceId,
            data.streamId,
            data.vote,
            data.votedBy
          );
        } else if (type === "play-next") {
          RoomManager.getInstance().publishPlayNext(spaceId);
        } else if (type === "remove-song") {
          RoomManager.getInstance().publishRemoveSong(spaceId, data.streamId);
        } else if (type === "empty-queue") {
          RoomManager.getInstance().publishEmptyQueue(spaceId);
        }
      }


    async createRoom(spaceId: string) {
        console.log(process.pid + ": createRoom: ", { spaceId });
        if (!this.spaces.has(spaceId)) {
          this.spaces.set(spaceId, {
            users: new Map<string, User>(),
            creatorId: "",
          });
        
          await this.subscriber.subscribe(spaceId, this.onSubscribeRoom);
        }
      }
    


    async addUser(userId: string, ws: WebSocket, token: string) {
        let user = this.users.get(userId);
        if (!user) {
          this.users.set(userId, {
            userId,
            ws: [ws],
            token,
          });
        } else {
          if (!user.ws.some((existingWs : any ) => existingWs === ws)) {
            user.ws.push(ws);
          }
        }
      }
    


      async joinRoom(
        spaceId: string,
        creatorId: string,
        userId: string,
        ws: WebSocket,
        token: string
      ) {
        console.log("Join Room" + spaceId);
    
        let space = this.spaces.get(spaceId);
        let user = this.users.get(userId);
    
        if (!space) {
          await this.createRoom(spaceId);
          space = this.spaces.get(spaceId);
        }
    
        if (!user) {
          await this.addUser(userId, ws, token);
          user = this.users.get(userId);
        } else {
          if (!user.ws.some((existingWs : any) => existingWs === ws)) {
            user.ws.push(ws);
          }
        }
    
        this.wsToSpace.set(ws, spaceId);
    
        if (space && user) {
          space.users.set(userId, user);
          this.spaces.set(spaceId, {
            ...space,
            users: new Map(space.users),
            creatorId: creatorId,
          });
        }
      }

    publishEmptyQueue(spaceId: string) {
        const space = this.spaces.get(spaceId);
        space?.users.forEach((user, userId) => {
          user?.ws.forEach((ws : WebSocket ) => {
            ws.send(
              JSON.stringify({
                type: `empty-queue/${spaceId}`,
              })
            );
          });
        });
      }

    async adminEmptyQueue(spaceId: string) {
        const room = this.spaces.get(spaceId);
        const userId = this.spaces.get(spaceId)?.creatorId;
        const user = this.users.get(userId as string);
    
        if (room && user) {
          await this.prisma.stream.updateMany({
            where: {
              played: false,
              spaceId: spaceId,
            },
            data: {
              played: true,
              playedTs: new Date(),
            },
          });
          await this.publisher.publish(
            spaceId,
            JSON.stringify({
              type: "empty-queue",
            })
          );
        }
      }

    publishRemoveSong(spaceId : string , streamId : string){
        console.log("publishRemoveSong")
        const space = this.spaces.get(spaceId);
        space?.users.forEach((user , userId) => {
            user?.ws.forEach((ws : WebSocket) => {
                ws.send(
                    JSON.stringify({
                        type: `remove-song/${spaceId}`,
                        data: {
                          streamId,
                          spaceId,
                        }
                    })
                )
                
            });
        });
    }


    
    async adminRemoveSong(spaceId : string , userId : string , streamId : string  ){
        console.log("adminRemoveSong")
        const user = this.users.get(userId);
        const creatorId = this.spaces.get(spaceId)?.creatorId;

        if (user && userId == creatorId){
            await this.prisma.stream.delete({
                where : {
                    id :streamId,
                    spaceId : spaceId
                }
            })

            await this.publisher.publish(
                spaceId,
                JSON.stringify({
                    type : "remove-song",
                    data :{
                        streamId,
                        spaceId
                    }

                })
            )
        } else {
            user?.ws.forEach((ws : WebSocket) => {
                ws.send(
                    JSON.stringify({
                        type : "error",
                        data : {
                            message : "You cant remove the song. You are not the host"
                        }
                    })
                )
                
            });
        }

    }


    publishPlayNext(spaceId: string) {
        const space = this.spaces.get(spaceId);
        space?.users.forEach((user, userId) => {
          user?.ws.forEach((ws) => {
            ws.send(
              JSON.stringify({
                type: `play-next/${spaceId}`,
              })
            );
          });
        });
      }


    async PlayNext(spaceId: string, userId: string, url: string) {
        const creatorId = this.spaces.get(spaceId)?.creatorId;
        console.log("PlayNext", creatorId, userId);
    
        const targetUser = this.users.get(userId);
        if (!targetUser || !creatorId) return;
    
        const extractedId = getVideoId(url);
        if (!extractedId) {
            targetUser?.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "error",
                        data: { message: "Invalid YouTube URL" },
                    }));
                }
            });
            return;
        }
    
        let res;
        try {
            res = await youtubesearchapi.GetVideoDetails(extractedId);
        } catch (error) {
            console.error("YouTube API error:", error);
            targetUser?.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "error",
                        data: { message: "Failed to fetch video details" },
                    }));
                }
            });
            return;
        }
    
        if (!res.thumbnail) {
            targetUser?.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "error",
                        data: { message: "Unable to fetch video details" },
                    }));
                }
            });
            return;
        }
    
        const stream = await this.prisma.stream.create({
            data: {
                id: crypto.randomUUID(),
                userId: creatorId,
                url,
                extractedId,
                type: "Youtube",
                addedBy: userId,
                title: res.title ?? "Can't find video",
                smallImg: res.thumbnail.thumbnails[0].url,
                bigImg: res.thumbnail.thumbnails.at(-1).url,
                spaceId,
            },
        });
    
        await Promise.all([
            this.prisma.currentStream.upsert({
                where: { spaceId },
                update: { spaceId, userId, streamId: stream.id },
                create: { id: crypto.randomUUID(), spaceId, userId, streamId: stream.id },
            }),
            this.prisma.stream.update({
                where: { id: stream.id },
                data: { played: true, playedTs: new Date() },
            }),
        ]);
    
        try {
            await this.publisher.publish(spaceId, JSON.stringify({ type: "play-next" }));
        } catch (error) {
            console.error("Publish error:", error);
        }
    }
    

    async adminPlayNext(spaceId : string , userId : string , URL : string){

       const creatorId = this.spaces.get(spaceId)?.creatorId;
        const targetUser = this.users.get(userId);
        
        if (!targetUser || !creatorId) return;

        // Use the new music source manager
        const trackDetails = await this.musicSourceManager.getTrackDetails(URL);
        
        if (!trackDetails) {
            targetUser?.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "error",
                        data: { message: "Invalid track URL or unable to fetch details" },
                    }));
                }
            });
            return;
        }

        const stream = await this.prisma.stream.create({
            data: {
                id: crypto.randomUUID(),
                userId: creatorId,
                url : URL,
                type: trackDetails.source,
                extractedId: trackDetails.extractedId,
                title: trackDetails.title,
                artist: trackDetails.artist,
                album: trackDetails.album,
                duration: trackDetails.duration,
                smallImg: trackDetails.smallImg,
                bigImg: trackDetails.bigImg,
                privousURL: trackDetails.previewUrl,
                addedBy: userId,
                spaceId,
            },
        });

        await Promise.all([
            this.prisma.currentStream.upsert({
                where: { spaceId },
                update: { spaceId, userId, streamId: stream.id },
                create: { id: crypto.randomUUID(), spaceId, userId, streamId: stream.id },
            }),
            this.prisma.stream.update({
                where: { id: stream.id },
                data: { played: true, playedTs: new Date() },
            }),
        ]);

        try {
            await this.publisher.publish(spaceId, JSON.stringify({ type: "play-next" }));
        } catch (error) {
            console.error("Publish error:", error);
        }



    }
    //     const creatorId = this.spaces.get(spaceId)?.creatorId;
    //     console.log("adminPlayNext" , creatorId , userId)
    //     let targetUser = this.users.get(userId)

    //     if(!targetUser){
    //         return
    //     }

    //     if (targetUser.userId !== creatorId){
    //         targetUser.ws.forEach((ws : WebSocket) => {
    //             ws.send(
    //                 JSON.stringify({
    //                     type : "error",
    //                     data : {
    //                         message : "You cant perform this action"
    //                     }
    //                 })
    //             )
                
    //         });
    //         return
    //     }

    //     const mostUpVotedStream = await this.prisma.stream.findFirst({
    //         where : {
    //             played : false,
    //             spaceId : spaceId,
    //         },
    //         orderBy: {
    //             upvotes : {
    //                 _count: "desc",
    //             }
    //         }
            
    //     }) 

    //     if (!mostUpVotedStream){
    //         targetUser.ws.forEach((ws :WebSocket) => {
    //             ws.send(
    //                 JSON.stringify({
    //                     type : "error",
    //                     data : {
    //                         message : "Please add video in queue"
    //                     }
    //                 })
    //             )
                
    //         });

    //         return
    //     }

    //     await Promise.all([
    //         this.prisma.currentStream.upsert({
    //             where : {
    //                 spaceId : spaceId,
    //             },
    //             update : {
    //                 spaceId : spaceId,
    //                 userId,
    //                 streamId: mostUpVotedStream.id
    //             },
    //             create : {
    //                 spaceId : spaceId,
    //                 userId,
    //                 streamId : mostUpVotedStream.id
    //             }
    //         }),
    //         this.prisma.stream.update({
    //             where : {
    //                 id : mostUpVotedStream.id
    //             },
    //             data : {
    //                 played: true,
    //                 playedTs : new Date()
    //             }
    //         })
    //     ])


    //     let previousQueueLength = parseInt(
    //         (await this.redisClient.get(`queue-length-${spaceId}`)) || "1",
    //         10
    //     )

    //     if (previousQueueLength){
    //         await this.redisClient.set(
    //             `queue-length-${spaceId}`, 
    //             previousQueueLength - 1
    //         )
    //     }

    //     await this.publisher.publish(
    //         spaceId,
    //         JSON.stringify({
    //             type : "play-next"
    //         })
    //     )
    // }


    publishNewVote(
        spaceId : string ,
        streamId : string,
        vote : "upvote" | "downvote",
        votedBy : string
    ){
        console.log(process.pid + " publishNewVote");
        const spaces = this.spaces.get(spaceId);
        spaces?.users.forEach((user , userId ) => {
            user?.ws.forEach((ws : WebSocket)=> {
                ws.send(
                    JSON.stringify({
                        type : `new-vote/${spaceId}`,
                        data : {
                            vote,
                            streamId,
                            votedBy,
                            spaceId
                        }
                    })
                )
            })
        } )
    }

    async adminCasteVote (
        // creatorId : string ,
        userId : string,
        streamId : string,
        vote : string,
        spaceId : string
    ) {


        console.log(process.pid + "adminCaste");

        console.log("Inside the admin caste vote 🥶")
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
      userId: string,
      streamId: string,
      vote: "upvote" | "downvote",
      spaceId: string
  ) {
      console.log(process.pid + "casteVote")
      console.log("Inside the casting vote function 🥳")
      
      const space = this.spaces.get(spaceId)
      const currentUser = this.users.get(userId)
      const creatorId = this.spaces.get(spaceId)?.creatorId;
      const isCreator = currentUser?.userId === creatorId;
  
      console.log(userId)
      console.log(streamId)
      console.log(vote)
      console.log(spaceId)
    
      // Make sure space and currentUser exist
      // if(!space || !currentUser){
      //     return;
      // }

      console.log("Calling the admin caste vote function")
          // Fix: Match the parameters with the adminCasteVote function
          await this.adminCasteVote(
              userId,
              streamId,
              vote,
              spaceId
          );
  
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
          
          console.log("Calling the admin caste vote function")
          // Fix: Match the parameters with the adminCasteVote function
          await this.adminCasteVote(
              userId,
              streamId,
              vote,
              spaceId
          );
      }
  }

    publishNewStream(spaceId: string, data: any) {
        console.log(process.pid + ": PublishNewStream");
        console.log("Publish New Stream", spaceId);
        const space = this.spaces.get(spaceId);
    
        if (space) {
            space.users.forEach((user, userId) => {
                user?.ws?.forEach((ws: WebSocket) => { 
                    ws.send(
                        JSON.stringify({
                            type: `new-stream/${spaceId}`,
                            data: data
                        })
                    );
                });
            });
        } else {
            console.error(`Space with ID ${spaceId} not found.`);
        }
    }
    

    async adminStreamHandler(
        spaceId : string,
        userId : string,
        url : string,
        existingActiveStream? : any
        ){
            console.log(process.pid+"adminAddStreamHandler")
            console.log("adminAddStreamHandler" , spaceId)
            const room = this.spaces.get(spaceId)
            const currentUser = this.users.get(userId)

             if (!this.musicSourceManager.validateUrl(url)) {
            currentUser?.ws.forEach((ws: WebSocket) => {
                ws.send(
                    JSON.stringify({
                        type: "error",
                        data: {
                            message: "Invalid music URL. Supported: YouTube, Spotify"
                        }
                    })
                );
            });
            return;
        }
            // if(!room || typeof existingActiveStream !== "number"){
            //     return
            // }
        await this.redisClient.set(
            `queue-length-${spaceId}`,
            existingActiveStream + 1
        );

        // Get track details using the unified interface
        const trackDetails = await this.musicSourceManager.getTrackDetails(url);

        if (!trackDetails) {
            currentUser?.ws.forEach((ws: WebSocket) => {
                ws.send(
                    JSON.stringify({
                        type: "error",
                        data: {
                            message: "Could not fetch track details"
                        }
                    })
                );
            });
            return;
        }
         const stream = await this.prisma.stream.create({
            data: {
                id: crypto.randomUUID(),
                userId: userId,
                url: url,
                type: trackDetails.source,

                extractedId: trackDetails.extractedId,
                title: trackDetails.title,
                artist: trackDetails.artist,
                album: trackDetails.album,
                duration: trackDetails.duration,
                smallImg: trackDetails.smallImg,
                bigImg: trackDetails.bigImg,
                privousURL: trackDetails.previewUrl,
                addedBy: userId,
                spaceId: spaceId
            }
        });

        await this.redisClient.set(`${spaceId}-${url}`, new Date().getTime(), {
            EX: TIME_SPAN_FOR_REPEAT / 1000,
        });

        await this.redisClient.set(
            `lastAdded-${spaceId}-${userId}`,
            new Date().getTime(),
            {
                EX: TIME_SPAN_FOR_REPEAT / 1000
            }
        );

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
    }

            // const extractedId = getVideoId(url)


            // if(!extractedId){
            //     currentUser?.ws.forEach((ws : WebSocket ) => {
            //         ws.send(
            //             JSON.stringify({
            //                 type : "error",
            //                 data : {
            //                     message : "Invalid Youtube URL"
            //                 }
            //             })
            //         )
                    
            //     });
            //     return
            // }

            // await this.redisClient.set(
            //     `queue-length-${spaceId}`,
            //     existingActiveStream + 1
            // )

            // const res = await  youtubesearchapi.GetVideoDetails(extractedId)


            // if (res.thumbnail){
            //     const stream = await this.prisma.stream.create({
            //         data : {
            //             id : crypto.randomUUID(),
            //             userId : userId ,
            //             url : url,
            //             extractedId,
            //             type : "Youtube",
            //             addedBy : userId,
            //             title : res.title ?? "Cant Find the video",
            //             smallImg : res.thumbnail.thumbnails[0].url,
            //             bigImg : res.thumbnail.thumbnails.at(-1).url,
            //             spaceId : spaceId

            //         }
            //     })

            //     await this.redisClient.set(`${spaceId}-${url}`, new Date().getTime(), {
            //         EX : TIME_SPAN_FOR_REPEAT / 1000,
            //     }  )

            //     await this.redisClient.set(
            //         `lastAdded-${spaceId}-${userId}`,
            //         new Date().getTime(),
            //         {
            //             EX : TIME_SPAN_FOR_REPEAT / 1000
            //         }

            //     )

            //     await this.publisher.publish(
            //         spaceId,
            //         JSON.stringify({
            //           type: "new-stream",
            //           data: {
            //             ...stream,
            //             hasUpvoted: false,
            //             upvotes: 0,
            //           },
            //         })
            //       );

            // } else {
            //     currentUser?.ws.forEach((ws : WebSocket) => {
            //         ws.send(
            //             JSON.stringify({
            //                 type : "error",
            //                 data : {
            //                     message : "Video Not Found"
            //                 }
            //             })
            //         )
                    
            //     });
            // }

        // }

        disconnect(ws : WebSocket){
            console.log(process.pid + ": disconnect");
            let userId: string | null = null;
            const spaceId = this.wsToSpace.get(ws);
            this.users.forEach((user , id)=>{
                const wsIndex = user.ws.indexOf(ws);

                if(wsIndex !== -1 ){
                    userId = id;
                    user.ws.splice(wsIndex, 1);
                }

                if (user.ws.length === 0){
                    this.users.delete(id);
                }
            })

            if (userId && spaceId){
                const space = this.spaces.get(spaceId);
                if(space){
                    const updatedUsers = new Map(
                        Array.from(space.users).filter(([userId]) => userId !== userId )
                    );

                    this.spaces.set(spaceId , {
                        ...space,
                        users : updatedUsers
                    } );
                }
            }

        }

        
        async addToQueue(spaceId: string, currentUserId: string, url: string) {
           console.log(process.pid + ": addToQueue");

        const space = this.spaces.get(spaceId);
        const currentUser = this.users.get(currentUserId);
        const creatorId = this.spaces.get(spaceId)?.creatorId;
        const isCreator = currentUserId === creatorId;

        if (!space || !currentUser) {
            console.log("Room or User not defined");
            return;
        }

        // Updated validation using music source manager
        if (!this.musicSourceManager.validateUrl(url)) {
            currentUser?.ws.forEach((ws) => {
                ws.send(
                    JSON.stringify({
                        type: "error",
                        data: { message: "Invalid music URL. Supported: YouTube, Spotify" },
                    })
                );
            });
            return;
        }

        // Rest of the method remains the same...
        let previousQueueLength = parseInt(
            (await this.redisClient.get(`queue-length-${spaceId}`)) || "0",
            10
        );

        if (!previousQueueLength) {
            previousQueueLength = await this.prisma.stream.count({
                where: {
                    spaceId: spaceId,
                    played: false,
                },
            });
        }

        const isFirstSong = previousQueueLength === 0;

        if (!isCreator) {
            let lastAdded = await this.redisClient.get(
                `lastAdded-${spaceId}-${currentUserId}`
            );

            if (lastAdded) {
                currentUser.ws.forEach((ws) => {
                    ws.send(
                        JSON.stringify({
                            type: "error",
                            data: {
                                message: "You can add again after 20 min.",
                            },
                        })
                    );
                });
                return;
            }

            let alreadyAdded = await this.redisClient.get(`${spaceId}-${url}`);

            if (alreadyAdded) {
                currentUser.ws.forEach((ws) => {
                    ws.send(
                        JSON.stringify({
                            type: "error",
                            data: {
                                message: "This song is blocked for 1 hour",
                            },
                        })
                    );
                });
                return;
            }

            if (previousQueueLength >= MAX_QUEUE_LENGTH) {
                currentUser.ws.forEach((ws) => {
                    ws.send(
                        JSON.stringify({
                            type: "error",
                            data: {
                                message: "Queue limit reached",
                            },
                        })
                    );
                });
                return;
            }
        }

        await this.adminStreamHandler(
            spaceId,
            currentUserId,
            url,
            previousQueueLength,
        );

        if (isFirstSong) {
            setTimeout(async () => {
                await this.adminPlayNext(spaceId, currentUserId , url);
            }, 1000);
        }
    }
  }
            // console.log(process.pid + ": addToQueue");
        
            // const space = this.spaces.get(spaceId);
            // const currentUser = this.users.get(currentUserId);
            // const creatorId = this.spaces.get(spaceId)?.creatorId;
            // const isCreator = currentUserId === creatorId;
        
            // if (!space || !currentUser) {
            //   console.log("433: Room or User not defined");
            //   return;
            // }
        
            // if (!isValidYoutubeURL(url)) {
            //   currentUser?.ws.forEach((ws) => {
            //     ws.send(
            //       JSON.stringify({
            //         type: "error",
            //         data: { message: "Invalid YouTube URL" },
            //       })
            //     );
            //   });
            //   return;
            // }
        
            // let previousQueueLength = parseInt(
            //   (await this.redisClient.get(`queue-length-${spaceId}`)) || "0",
            //   10
            // );
        
            // Checking if its zero that means there was no record in
          //   if (!previousQueueLength) {
          //     previousQueueLength = await this.prisma.stream.count({
          //       where: {
          //         spaceId: spaceId,
          //         played: false,
          //       },
          //     });
          //   }

          //   const isFirstSong = previousQueueLength === 0;

          //   console.log("PREVIOUS QUEUE LENGTH" , previousQueueLength)
          //   if (!isCreator) {
          //     let lastAdded = await this.redisClient.get(
          //       `lastAdded-${spaceId}-${currentUserId}`
          //     );
        
          //     if (lastAdded) {
          //       currentUser.ws.forEach((ws) => {
          //         ws.send(
          //           JSON.stringify({
          //             type: "error",
          //             data: {
          //               message: "You can add again after 20 min.",
          //             },
          //           })
          //         );
          //       });
          //       return;
          //     }
          //     let alreadyAdded = await this.redisClient.get(`${spaceId}-${url}`);
        
          //     if (alreadyAdded) {
          //       currentUser.ws.forEach((ws) => {
          //         ws.send(
          //           JSON.stringify({
          //             type: "error",
          //             data: {
          //               message: "This song is blocked for 1 hour",
          //             },
          //           })
          //         );
          //       });
          //       return;
          //     }
        
          //     if (previousQueueLength >= MAX_QUEUE_LENGTH) {
          //       currentUser.ws.forEach((ws) => {
          //         ws.send(
          //           JSON.stringify({
          //             type: "error",
          //             data: {
          //               message: "Qu      console.log("Inside the casting vote function 🥳")eue limit reached",
          //             },
          //           })
          //         );
          //       });
          //       return;
          //     }
          //   }
          //   console.log("GOING TO ADD THE QUEUE")
        
          //   await this.adminStreamHandler(
          //     spaceId,
          //     currentUserId, 
          //     url,
          //     previousQueueLength,
          // );

            // await this.queue.add("add-to-queue", {
            //   spaceId,
            //   userId: currentUser.userId,
            //   url,
            //   existingActiveStream: previousQueueLength,
            // });


          //   if (isFirstSong) {
          //     console.log("🎗️First song in queue, playing immediately");

          //     setTimeout(async () => {
          //         await this.adminPlayNext(spaceId, currentUserId , url);
          //     }, 1000);
          // }

          // }




type User = {
    userId: string;
    ws: WebSocket[];
    token: string;
  };
  
  type Space = {
    creatorId: string;
    users: Map<String, User>;
  };