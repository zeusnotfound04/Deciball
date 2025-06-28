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

// Type definitions
type PlaybackState = {
    currentSong: {
        id: string;
        title: string;
        artist?: string;
        url: string;
        duration?: number;
        extractedId: string;
    } | null;
    startedAt: number; // Unix timestamp when current song started
    pausedAt: number | null; // Unix timestamp when paused, null if playing
    isPlaying: boolean;
    lastUpdated: number; // Unix timestamp of last update
};

type User = {
    userId: string;
    ws: WebSocket[];
    token: string;
};

type Space = {
    creatorId: string;
    users: Map<string, User>;
    playbackState: PlaybackState;
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
          console.log("🎵 Processing add-to-queue job:", data);
          await RoomManager.getInstance().adminStreamHandler(
            data.spaceId,
            data.userId,
            data.url,
            data.existingActiveStream,
            data.trackData,
            data.autoPlay
          );
          console.log("✅ Finished processing add-to-queue job");
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
            playbackState: {
              currentSong: null,
              startedAt: 0,
              pausedAt: null,
              isPlaying: false,
              lastUpdated: Date.now()
            }
          });
        
          await this.subscriber.subscribe(spaceId, this.onSubscribeRoom);
        }
      }
    


    async addUser(userId: string, ws: WebSocket, token: string) {
        console.log(`[addUser] Adding user ${userId} to users Map`);
        let user = this.users.get(userId);
        if (!user) {
          console.log(`[addUser] Creating new user entry for ${userId}`);
          this.users.set(userId, {
            userId,
            ws: [ws],
            token,
          });
          console.log(`[addUser] User ${userId} added to users Map. Total users: ${this.users.size}`);
          
          // Log all users for debugging
          console.log("All users:", Array.from(this.users.keys()));
        } else {
          console.log(`[addUser] User ${userId} already exists, checking WebSocket connections`);
          if (!user.ws.some((existingWs : any ) => existingWs === ws)) {
            user.ws.push(ws);
            console.log(`[addUser] Added new WebSocket connection for user ${userId}. Total connections: ${user.ws.length}`);
          } else {
            console.log(`[addUser] WebSocket connection already exists for user ${userId}`);
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
        console.log(`[joinRoom] User ${userId} attempting to join space ${spaceId}`);
        console.log(`[joinRoom] CreatorId from token: ${creatorId}`);
    
        let space = this.spaces.get(spaceId);
        let user = this.users.get(userId);
        
        console.log(`[joinRoom] Space exists: ${!!space}, User exists: ${!!user}`);
    
        if (!space) {
          console.log(`[joinRoom] Creating new space: ${spaceId}`);
          await this.createRoom(spaceId);
          space = this.spaces.get(spaceId);
        }
    
        if (!user) {
          console.log(`[joinRoom] Adding new user: ${userId}`);
          await this.addUser(userId, ws, token);
          user = this.users.get(userId);
          console.log(`[joinRoom] User added to users Map: ${!!user}`);
        } else {
          console.log(`[joinRoom] User exists, checking WebSocket connections`);
          if (!user.ws.some((existingWs : any) => existingWs === ws)) {
            user.ws.push(ws);
            console.log(`[joinRoom] Added new WebSocket connection for user ${userId}`);
          }
        }
    
        this.wsToSpace.set(ws, spaceId);
        console.log(`[joinRoom] Set wsToSpace mapping for WebSocket`);
    
        if (space && user) {
          // If space has no creator, set this user as creator
          if (!space.creatorId || space.creatorId === "") {
            space.creatorId = creatorId;
            console.log(`[joinRoom] Set ${creatorId} as room creator`);
          }
          
          space.users.set(userId, user);
          this.spaces.set(spaceId, {
            ...space,
            users: new Map(space.users),
            creatorId: space.creatorId,
            playbackState: space.playbackState || {
              currentSong: null,
              startedAt: 0,
              pausedAt: null,
              isPlaying: false,
              lastUpdated: Date.now()
            }
          });
          
          console.log(`[joinRoom] User ${userId} added to space ${spaceId}. Total users in space: ${space.users.size}`);
          console.log(`[joinRoom] Room creator: ${space.creatorId}, Is this user the creator: ${userId === space.creatorId}`);
          
          // Send room info to the joining user first
          await this.sendRoomInfoToUser(spaceId, userId);
          
          // Then broadcast user update to all users in the room
          this.broadcastUserUpdate(spaceId);
          
          // Send current queue to the newly joined user
          await this.sendCurrentQueueToUser(spaceId, userId);
        } else {
          console.error(`[joinRoom] Failed to add user to space. Space: ${!!space}, User: ${!!user}`);
          throw new Error("Failed to add user to space");
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
        const space = this.spaces.get(spaceId);
        const creatorId = space?.creatorId;
        console.log("PlayNext", creatorId, userId);
    
        const targetUser = this.users.get(userId);
        if (!targetUser || !creatorId || !space) return;
    
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

        // Update in-memory playback state - THIS WAS MISSING!
        const now = Date.now();
        space.playbackState = {
            currentSong: {
                id: stream.id,
                title: stream.title,
                artist: stream.artist || undefined,
                url: stream.url,
                duration: stream.duration || undefined,
                extractedId: stream.extractedId
            },
            startedAt: now,
            pausedAt: null,
            isPlaying: true,
            lastUpdated: now
        };
        console.log("🎵 Updated playback state for space", spaceId, "with song:", stream.title);

        // Broadcast the new current song to all users
        const songData = {
            ...stream,
            voteCount: 0 // New song has no votes yet
        };

        space.users.forEach((user) => {
            user.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "current-song-update",
                        data: { song: songData }
                    }));
                }
            });
        });
    
        try {
            await this.publisher.publish(spaceId, JSON.stringify({ 
                type: "play-next",
                data: { 
                    song: songData
                }
            }));
        } catch (error) {
            console.error("Publish error:", error);
        }
    }
    

    async adminPlayNext(spaceId: string, userId: string, URL?: string) {
        console.log("🎵 adminPlayNext called", { spaceId, userId, URL });
        
        const space = this.spaces.get(spaceId);
        const creatorId = space?.creatorId;
        const targetUser = this.users.get(userId);
        
        if (!targetUser || !creatorId || !space) {
            console.log("❌ User, creator, or space not found", { targetUser: !!targetUser, creatorId, space: !!space });
            return;
        }

        // Get the next song from the queue (highest voted, then oldest)
        const nextStream = await this.prisma.stream.findFirst({
            where: {
                spaceId: spaceId,
                played: false
            },
            include: {
                upvotes: true,
                addedByUser: {
                    select: {
                        id: true,
                        username: true
                    }
                }
            },
            orderBy: [
                {
                    upvotes: {
                        _count: "desc"
                    }
                },
                {
                    createAt: "asc"
                }
            ]
        });

        if (!nextStream) {
            console.log("❌ No songs in queue to play");
            // Notify users that queue is empty and clear playback state
            space.playbackState = {
                currentSong: null,
                startedAt: 0,
                pausedAt: null,
                isPlaying: false,
                lastUpdated: Date.now()
            };
            
            space.users.forEach((user) => {
                user.ws.forEach((ws: WebSocket) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: "queue-empty",
                            data: { message: "No more songs in queue" }
                        }));
                    }
                });
            });
            return;
        }

        console.log("🎵 Playing next song:", nextStream.title);

        // Mark the stream as played and set current stream
        await Promise.all([
            this.prisma.currentStream.upsert({
                where: { spaceId },
                update: { spaceId, userId: creatorId, streamId: nextStream.id },
                create: { id: crypto.randomUUID(), spaceId, userId: creatorId, streamId: nextStream.id },
            }),
            this.prisma.stream.update({
                where: { id: nextStream.id },
                data: { played: true, playedTs: new Date() },
            }),
        ]);

        // Update in-memory playback state
        if (space) {
            const now = Date.now();
            space.playbackState = {
                currentSong: {
                    id: nextStream.id,
                    title: nextStream.title,
                    artist: nextStream.artist || undefined,
                    url: nextStream.url,
                    duration: nextStream.duration || undefined,
                    extractedId: nextStream.extractedId
                },
                startedAt: now,
                pausedAt: null,
                isPlaying: true,
                lastUpdated: now
            };
            console.log("🎵 Updated playback state for space", spaceId, "with song:", nextStream.title);
        }

        // Broadcast the new current song to all users
        if (space) {
            const songData = {
                ...nextStream,
                voteCount: nextStream.upvotes.length
            };

            space.users.forEach((user) => {
                user.ws.forEach((ws: WebSocket) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: "current-song-update",
                            data: { song: songData }
                        }));
                    }
                });
            });
        }

        // Broadcast updated queue (without the now-playing song)
        await this.broadcastQueueUpdate(spaceId);

        try {
            await this.publisher.publish(spaceId, JSON.stringify({ 
                type: "play-next",
                data: { 
                    song: {
                        ...nextStream,
                        voteCount: nextStream.upvotes.length
                    }
                }
            }));
        } catch (error) {
            console.error("Publish error:", error);
        }
    }

    publishNewVote(
        spaceId: string,
        streamId: string,
        vote: "upvote" | "downvote",
        votedBy: string
    ) {
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
        );

        // Broadcast updated queue with new vote counts
        await this.broadcastQueueUpdate(spaceId);
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
        existingActiveStream? : any,
        trackData? : any,
        autoPlay? : boolean
        ){
            console.log(process.pid+"adminAddStreamHandler")
            console.log("🎵 adminAddStreamHandler - spaceId:", spaceId)
            console.log("🎵 adminAddStreamHandler - trackData:", trackData)
            console.log("🎵 adminAddStreamHandler - autoPlay:", autoPlay)
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

        // Broadcast song-added event to all users in the space
        const space = this.spaces.get(spaceId);
        if (space) {
            const songData = {
                ...stream,
                voteCount: 0,
                addedByUser: {
                    id: userId,
                    username: currentUser?.token ? 'User' : 'Unknown' // You might want to get actual username from token
                }
            };

            space.users.forEach((user) => {
                user.ws.forEach((ws: WebSocket) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: "song-added",
                            data: { 
                                song: songData,
                                autoPlay: autoPlay || false
                            }
                        }));
                    }
                });
            });
        }

        // Broadcast updated queue to all users
        await this.broadcastQueueUpdate(spaceId);
    }

    async addToQueue(spaceId: string, currentUserId: string, url: string, trackData?: any, autoPlay?: boolean) {
           console.log(process.pid + ": addToQueue");
           console.log("🎵 Track data received:", trackData);
           console.log("🎵 Auto-play flag:", autoPlay);

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
            trackData,  // Pass additional track data
            autoPlay   // Pass auto-play flag
        );

        // If auto-play is requested and this was the first song, trigger play-next
        if (autoPlay && isFirstSong) {
            console.log("🎵 Auto-play requested for first song, triggering play-next in 1 second...");
            setTimeout(async () => {
                await this.adminPlayNext(spaceId, currentUserId);
            }, 1000);
        }
    }

    // ============= PLAYBACK SYNCHRONIZATION METHODS =============

    /**
     * Update playback state when song is paused
     */
    async pausePlayback(spaceId: string, userId: string) {
        const space = this.spaces.get(spaceId);
        if (!space || !space.playbackState.isPlaying) {
            return;
        }

        const now = Date.now();
        space.playbackState.pausedAt = now;
        space.playbackState.isPlaying = false;
        space.playbackState.lastUpdated = now;

        console.log("⏸️ Paused playback for space", spaceId);

        // Broadcast pause event to all users
        space.users.forEach((user) => {
            user.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "playback-paused",
                        data: { 
                            pausedAt: now,
                            currentTime: this.getCurrentPlaybackTime(spaceId)
                        }
                    }));
                }
            });
        });
    }

    /**
     * Update playback state when song is resumed
     */
    async resumePlayback(spaceId: string, userId: string) {
        const space = this.spaces.get(spaceId);
        if (!space || space.playbackState.isPlaying) {
            return;
        }

        const now = Date.now();
        const pauseDuration = space.playbackState.pausedAt ? now - space.playbackState.pausedAt : 0;
        
        // Adjust start time to account for pause duration
        space.playbackState.startedAt = space.playbackState.startedAt + pauseDuration;
        space.playbackState.pausedAt = null;
        space.playbackState.isPlaying = true;
        space.playbackState.lastUpdated = now;

        console.log("▶️ Resumed playback for space", spaceId);

        // Broadcast resume event to all users
        space.users.forEach((user) => {
            user.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "playback-resumed",
                        data: { 
                            resumedAt: now,
                            currentTime: this.getCurrentPlaybackTime(spaceId)
                        }
                    }));
                }
            });
        });
    }

    /**
     * Update playback state when user seeks to a specific time
     */
    async seekPlayback(spaceId: string, userId: string, seekTime: number) {
        const space = this.spaces.get(spaceId);
        if (!space || !space.playbackState.currentSong) {
            return;
        }

        const now = Date.now();
        // Update the start time to reflect the new position
        space.playbackState.startedAt = now - (seekTime * 1000);
        space.playbackState.lastUpdated = now;

        console.log("⏩ Seeked playback for space", spaceId, "to", seekTime, "seconds");

        // Broadcast seek event to all users
        space.users.forEach((user) => {
            user.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "playback-seeked",
                        data: { 
                            seekTime,
                            currentTime: seekTime
                        }
                    }));
                }
            });
        });
    }

    /**
     * Get current playback time in seconds
     */
    getCurrentPlaybackTime(spaceId: string): number {
        const space = this.spaces.get(spaceId);
        if (!space || !space.playbackState.currentSong || !space.playbackState.isPlaying) {
            return 0;
        }

        const now = Date.now();
        const elapsed = now - space.playbackState.startedAt;
        return Math.floor(elapsed / 1000); // Convert to seconds
    }

    /**
     * Get complete playback state for new users joining
     */
    getPlaybackState(spaceId: string) {
        const space = this.spaces.get(spaceId);
        if (!space) {
            return null;
        }

        const currentTime = space.playbackState.isPlaying ? this.getCurrentPlaybackTime(spaceId) : 0;
        
        return {
            currentSong: space.playbackState.currentSong,
            isPlaying: space.playbackState.isPlaying,
            currentTime,
            startedAt: space.playbackState.startedAt,
            pausedAt: space.playbackState.pausedAt
        };
    }

    /**
     * Send complete room information to a user when they join
     */
    async sendRoomInfoToUser(spaceId: string, userId: string) {
        const space = this.spaces.get(spaceId);
        const user = this.users.get(userId);
        
        if (!space || !user) {
            console.error("❌ Space or user not found for sendRoomInfoToUser");
            return;
        }

        // Get current playback state
        const playbackState = this.getPlaybackState(spaceId);
        
        // Get current song from database if exists
        let currentSong = null;
        try {
            const currentStream = await this.prisma.currentStream.findUnique({
                where: { spaceId },
                include: {
                    stream: {
                        include: {
                            upvotes: true,
                            addedByUser: {
                                select: {
                                    id: true,
                                    username: true
                                }
                            }
                        }
                    }
                }
            });

            if (currentStream?.stream) {
                currentSong = {
                    ...currentStream.stream,
                    voteCount: currentStream.stream.upvotes.length
                };
            }
        } catch (error) {
            console.error("Error fetching current song:", error);
        }

        // Send room info with playback state
        user.ws.forEach((ws: WebSocket) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: "room-joined",
                    data: {
                        spaceId,
                        isCreator: userId === space.creatorId,
                        userCount: space.users.size,
                        currentSong,
                        playbackState: playbackState ? {
                            currentTime: playbackState.currentTime,
                            isPlaying: playbackState.isPlaying,
                            shouldStartAt: playbackState.isPlaying ? playbackState.currentTime : 0,
                            currentSong: currentSong // Include the current song in playback state
                        } : currentSong ? {
                            // If no playback state but there's a current song, include it
                            currentTime: 0,
                            isPlaying: false,
                            shouldStartAt: 0,
                            currentSong: currentSong
                        } : null
                    }
                }));
            }
        });

        console.log(`📡 Sent room info to user ${userId} in space ${spaceId}`, {
            currentSong: currentSong?.title || 'None',
            playbackState: playbackState?.isPlaying ? `Playing at ${playbackState.currentTime}s` : 'Not playing'
        });
    }

    /**
     * Send current queue to a specific user
     */
    async sendCurrentQueueToUser(spaceId: string, userId: string) {
        const user = this.users.get(userId);
        
        if (!user) {
            console.error("❌ User not found for sendCurrentQueueToUser");
            return;
        }

        try {
            const queue = await this.prisma.stream.findMany({
                where: {
                    spaceId: spaceId,
                    played: false
                },
                include: {
                    upvotes: true,
                    addedByUser: {
                        select: {
                            id: true,
                            username: true
                        }
                    }
                },
                orderBy: [
                    {
                        upvotes: {
                            _count: "desc"
                        }
                    },
                    {
                        createAt: "asc"
                    }
                ]
            });

            const queueWithVotes = queue.map(stream => ({
                ...stream,
                voteCount: stream.upvotes.length
            }));

            user.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "queue-update",
                        data: { queue: queueWithVotes }
                    }));
                }
            });

            console.log(`📋 Sent queue (${queue.length} songs) to user ${userId} in space ${spaceId}`);
        } catch (error) {
            console.error("Error sending queue to user:", error);
        }
    }

    // ============= MISSING METHODS =============

    /**
     * Get queue with vote counts
     */
    async getQueueWithVotes(spaceId: string) {
        try {
            const queue = await this.prisma.stream.findMany({
                where: {
                    spaceId: spaceId,
                    played: false
                },
                include: {
                    upvotes: true,
                    addedByUser: {
                        select: {
                            id: true,
                            username: true
                        }
                    }
                },
                orderBy: [
                    {
                        upvotes: {
                            _count: "desc"
                        }
                    },
                    {
                        createAt: "asc"
                    }
                ]
            });

            return queue.map(stream => ({
                ...stream,
                voteCount: stream.upvotes.length
            }));
        } catch (error) {
            console.error("Error getting queue with votes:", error);
            return [];
        }
    }

    /**
     * Handle WebSocket disconnection
     */
    disconnect(ws: WebSocket) {
        console.log("🔌 Handling WebSocket disconnection");
        
        // Find and remove the user associated with this WebSocket
        for (const [userId, user] of this.users.entries()) {
            const wsIndex = user.ws.indexOf(ws);
            if (wsIndex !== -1) {
                user.ws.splice(wsIndex, 1);
                console.log(`📡 Removed WebSocket for user ${userId}`);
                
                // If user has no more WebSocket connections, remove them from all spaces
                if (user.ws.length === 0) {
                    console.log(`👋 User ${userId} has no more connections, removing from spaces`);
                    
                    // Remove user from all spaces
                    for (const [spaceId, space] of this.spaces.entries()) {
                        if (space.users.has(userId)) {
                            space.users.delete(userId);
                            console.log(`📤 Removed user ${userId} from space ${spaceId}`);
                            
                            // Broadcast user update to remaining users in the space
                            this.broadcastUserUpdate(spaceId);
                        }
                    }
                    
                    // Remove user from users map
                    this.users.delete(userId);
                }
                break;
            }
        }

        // Remove WebSocket from space mapping
        this.wsToSpace.delete(ws);
    }

    /**
     * Handle Spotify play events (placeholder)
     */
    async handleSpotifyPlay(spaceId: string, userId: string, data: any) {
        console.log("🎵 Handling Spotify play event:", { spaceId, userId, data });
        // Implementation for Spotify-specific play handling
        // For now, we'll just use the general playback resume
        await this.resumePlayback(spaceId, userId);
    }

    /**
     * Handle Spotify pause events (placeholder)
     */
    async handleSpotifyPause(spaceId: string, userId: string, data: any) {
        console.log("⏸️ Handling Spotify pause event:", { spaceId, userId, data });
        // Implementation for Spotify-specific pause handling
        // For now, we'll just use the general playback pause
        await this.pausePlayback(spaceId, userId);
    }

    /**
     * Handle Spotify state change events (placeholder)
     */
    async handleSpotifyStateChange(spaceId: string, userId: string, data: any) {
        console.log("🔄 Handling Spotify state change event:", { spaceId, userId, data });
        // Implementation for Spotify-specific state changes
        if (data.isPlaying !== undefined) {
            if (data.isPlaying) {
                await this.resumePlayback(spaceId, userId);
            } else {
                await this.pausePlayback(spaceId, userId);
            }
        }
        
        if (data.position !== undefined) {
            await this.seekPlayback(spaceId, userId, data.position / 1000); // Convert ms to seconds
        }
    }

    /**
     * Handle YouTube state change events (placeholder)
     */
    async handleYouTubeStateChange(spaceId: string, userId: string, data: any) {
        console.log("📺 Handling YouTube state change event:", { spaceId, userId, data });
        // Implementation for YouTube-specific state changes
        if (data.isPlaying !== undefined) {
            if (data.isPlaying) {
                await this.resumePlayback(spaceId, userId);
            } else {
                await this.pausePlayback(spaceId, userId);
            }
        }
        
        if (data.currentTime !== undefined) {
            await this.seekPlayback(spaceId, userId, data.currentTime);
        }
    }

    /**
     * Broadcast user list update to all users in a space
     */
    broadcastUserUpdate(spaceId: string) {
        const space = this.spaces.get(spaceId);
        if (!space) return;

        const userList = Array.from(space.users.values()).map(user => ({
            id: user.userId,
            // Add other user info if needed
        }));

        space.users.forEach((user) => {
            user.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "user-update",
                        data: { users: userList }
                    }));
                }
            });
        });

        console.log(`📡 Broadcasted user update to space ${spaceId}, ${userList.length} users`);
    }

    /**
     * Broadcast queue update to all users in a space
     */
    async broadcastQueueUpdate(spaceId: string) {
        try {
            const queue = await this.getQueueWithVotes(spaceId);
            const space = this.spaces.get(spaceId);
            
            if (!space) return;

            space.users.forEach((user) => {
                user.ws.forEach((ws: WebSocket) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: "queue-update",
                            data: { queue }
                        }));
                    }
                });
            });

            console.log(`📋 Broadcasted queue update to space ${spaceId}, ${queue.length} songs`);
        } catch (error) {
            console.error("Error broadcasting queue update:", error);
        }
    }
}