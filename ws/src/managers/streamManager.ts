import WebSocket from "ws";
import { createClient, RedisClientType } from "redis";
//@ts-ignore
import youtubesearchapi from "youtube-search-api";
import { Job, Queue, tryCatch, Worker } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { getVideoId, isValidYoutubeURL } from "../utils/utils";
import { MusicSourceManager } from "../handlers";
import crypto from "crypto";

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
    startedAt: number; // Unix timestamp when song started
    pausedAt: number | null; // Unix timestamp when paused, null if playing
    isPlaying: boolean;
    lastUpdated: number; // Unix timestamp of last update
};

type TimestampBroadcast = {
    currentTime: number; // Current position in seconds
    isPlaying: boolean;
    timestamp: number; // Server timestamp when this was sent
    songId?: string;
    totalDuration?: number;
};

// Redis Queue Types
type QueueSong = {
    id: string;
    title: string;
    artist?: string;
    album?: string;
    url: string;
    extractedId: string;
    source: 'Youtube' | 'Spotify';
    smallImg: string;
    bigImg: string;
    userId: string; // Who added the song
    addedAt: number; // Timestamp when added
    duration?: number;
    voteCount: number;
    spotifyId?: string;
    youtubeId?: string;
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
    private timestampIntervals: Map<string, NodeJS.Timeout> = new Map();
    private readonly TIMESTAMP_BROADCAST_INTERVAL = 5000; // Broadcast every 5 seconds (reduced frequency)

    
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
          
          // Sync the newly joined user to current playback state
          await this.syncNewUserToPlayback(spaceId, userId);
          
          // Send current playing song to the newly joined user
          await this.sendCurrentPlayingSongToUser(spaceId, userId);
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

        // First, mark the currently playing song as played (if any)
        const currentStream = await this.prisma.currentStream.findUnique({
            where: { spaceId },
            include: { stream: true }
        });
        
        if (currentStream && currentStream.stream && !currentStream.stream.played) {
            console.log("🎵 Marking current song as played:", currentStream.stream.title);
            await this.prisma.stream.update({
                where: { id: currentStream.stream.id },
                data: { played: true, playedTs: new Date() }
            });
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

        // Set the next song as current stream (but DON'T mark it as played yet)
        await this.prisma.currentStream.upsert({
            where: { spaceId },
            update: { spaceId, userId: creatorId, streamId: nextStream.id },
            create: { id: crypto.randomUUID(), spaceId, userId: creatorId, streamId: nextStream.id },
        });

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
                voteCount: nextStream.upvotes.length,
                addedByUser: nextStream.addedByUser || {
                    id: nextStream.userId,
                    username: 'Unknown User'
                }
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

            // Start timestamp broadcasting for synchronized playback
            this.startTimestampBroadcast(spaceId);
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
            // Get user data from database to include proper username
            const addedByUser = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, username: true }
            });

            const songData = {
                ...stream,
                voteCount: 0,
                addedByUser: addedByUser || {
                    id: userId,
                    username: 'Unknown User'
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
        // await this.broadcastQueueUpdate(spaceId); // TODO: Implement this method if needed

        // Auto-play logic: If this is the first song in an empty queue, start playing it
        const currentQueueLength = await this.prisma.stream.count({
            where: {
                spaceId: spaceId,
                played: false,
            },
        });

        // Check if there's currently a playing song
        const currentPlaying = await this.prisma.currentStream.findFirst({
            where: { spaceId: spaceId },
            include: { stream: true }
        });

        console.log("🎵 Auto-play check:", { 
            queueLength: currentQueueLength, 
            hasCurrentlyPlaying: !!currentPlaying,
            autoPlay: autoPlay 
        });

        // If this is the first song or auto-play is explicitly requested, and nothing is currently playing
        if ((currentQueueLength === 1 || autoPlay) && !currentPlaying) {
            console.log("🎵 Auto-starting playback for first song");
            
            // Get the stream we just created to play it
            const streamToPlay = await this.prisma.stream.findFirst({
                where: {
                    spaceId: spaceId,
                    played: false
                },
                orderBy: {
                    id: 'asc' // Get the oldest unplayed song
                }
            });

            if (streamToPlay) {
                // Set this song as currently playing
                await this.prisma.currentStream.upsert({
                    where: { spaceId: spaceId },
                    update: {
                        streamId: streamToPlay.id,
                        userId: streamToPlay.userId
                    },
                    create: {
                        spaceId: spaceId,
                        streamId: streamToPlay.id,
                        userId: streamToPlay.userId
                    }
                });

                // Get stream with upvotes for frontend
                const streamWithVotes = await this.prisma.stream.findUnique({
                    where: { id: streamToPlay.id },
                    include: {
                        upvotes: {
                            select: {
                                userId: true
                            }
                        }
                    }
                });

                if (streamWithVotes && space) {
                    // Get user data from database
                    const addedByUser = await this.prisma.user.findUnique({
                        where: { id: streamWithVotes.userId },
                        select: { id: true, username: true }
                    });

                    const songData = {
                        ...streamWithVotes,
                        voteCount: streamWithVotes.upvotes?.length || 0,
                        addedByUser: addedByUser || {
                            id: streamWithVotes.userId,
                            username: 'Unknown User'
                        }
                    };

                    // Update playback state for the new song
                    const now = Date.now();
                    space.playbackState = {
                        currentSong: {
                            id: songData.id,
                            title: songData.title,
                            artist: songData.artist || undefined,
                            url: songData.url,
                            duration: songData.duration || undefined,
                            extractedId: songData.extractedId
                        },
                        startedAt: now,
                        pausedAt: null,
                        isPlaying: true,
                        lastUpdated: now
                    };

                    // Broadcast current-song-update to start playback
                    if (space) {
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

                        // Start timestamp broadcasting for synchronized playback
                        this.startTimestampBroadcast(spaceId);
                    }

                    console.log("✅ Auto-started playback for song:", streamWithVotes.title);
                }
            }
        }
    }

    // Start timestamp broadcasting for a space
    private startTimestampBroadcast(spaceId: string) {
        // Clear existing interval if any
        this.stopTimestampBroadcast(spaceId);
        
        const interval = setInterval(async () => {
            await this.broadcastCurrentTimestamp(spaceId);
        }, this.TIMESTAMP_BROADCAST_INTERVAL);
        
        this.timestampIntervals.set(spaceId, interval);
        console.log(`🕐 Started timestamp broadcasting for space ${spaceId}`);
    }

    // Stop timestamp broadcasting for a space
    private stopTimestampBroadcast(spaceId: string) {
        const interval = this.timestampIntervals.get(spaceId);
        if (interval) {
            clearInterval(interval);
            this.timestampIntervals.delete(spaceId);
            console.log(`🕐 Stopped timestamp broadcasting for space ${spaceId}`);
        }
    }

    // Broadcast current timestamp to all users in a space
    private async broadcastCurrentTimestamp(spaceId: string) {
        const space = this.spaces.get(spaceId);
        if (!space || !space.playbackState.currentSong) {
            return;
        }

        const now = Date.now();
        const { playbackState } = space;
        
        // Calculate current position based on playback state
        let currentTime = 0;
        
        if (playbackState.startedAt > 0) {
            if (playbackState.isPlaying) {
                // If playing, calculate current position from start time
                if (playbackState.pausedAt) {
                    // If we previously paused, calculate from resume point
                    const pausedDuration = (playbackState.pausedAt - playbackState.startedAt) / 1000;
                    currentTime = pausedDuration + ((now - playbackState.lastUpdated) / 1000);
                } else {
                    // Calculate from original start time
                    currentTime = (now - playbackState.startedAt) / 1000;
                }
            } else {
                // If paused, use the time when we paused
                if (playbackState.pausedAt) {
                    currentTime = (playbackState.pausedAt - playbackState.startedAt) / 1000;
                } else {
                    // Fallback to 0 if no pause time is set
                    currentTime = 0;
                }
            }
        }

        const timestampData: TimestampBroadcast = {
            currentTime: Math.max(0, currentTime),
            isPlaying: playbackState.isPlaying,
            timestamp: now,
            songId: playbackState.currentSong?.id,
            totalDuration: playbackState.currentSong?.duration
        };

        console.log(`📡 Broadcasting timestamp for space ${spaceId}:`, {
            currentTime: timestampData.currentTime,
            isPlaying: timestampData.isPlaying,
            songId: timestampData.songId
        });

        // Broadcast to all users in the space
        space.users.forEach((user) => {
            user.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "timestamp-sync",
                        data: timestampData
                    }));
                }
            });
        });

        // Also store in Redis for new users joining
        await this.redisClient.set(
            `timestamp-${spaceId}`,
            JSON.stringify(timestampData),
            { EX: 10 } // Expire after 10 seconds
        );
    }

    // Send current timestamp to a specific user (for new joiners)
    async sendCurrentTimestampToUser(spaceId: string, userId: string) {
        const user = this.users.get(userId);
        const space = this.spaces.get(spaceId);
        
        if (!user || !space) return;

        // Try to get latest timestamp from Redis first
        const storedTimestamp = await this.redisClient.get(`timestamp-${spaceId}`);
        let timestampData: TimestampBroadcast;

        if (storedTimestamp) {
            timestampData = JSON.parse(storedTimestamp);
        } else {
            // Calculate fresh timestamp if not in Redis
            const now = Date.now();
            const { playbackState } = space;
            
            let currentTime = 0;
            if (playbackState.isPlaying && playbackState.startedAt > 0 && playbackState.currentSong) {
                if (playbackState.pausedAt) {
                    currentTime = (playbackState.pausedAt - playbackState.startedAt) / 1000;
                } else {
                    currentTime = (now - playbackState.startedAt) / 1000;
                }
            }

            timestampData = {
                currentTime: Math.max(0, currentTime),
                isPlaying: playbackState.isPlaying,
                timestamp: now,
                songId: playbackState.currentSong?.id,
                totalDuration: playbackState.currentSong?.duration
            };
        }

        user.ws.forEach((ws: WebSocket) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: "timestamp-sync",
                    data: {
                        ...timestampData,
                        isInitialSync: true // Flag for new joiners
                    }
                }));
            }
        });
    }

    // Handle playback control events and sync timestamps
    async handlePlaybackPlay(spaceId: string, userId: string) {
        const space = this.spaces.get(spaceId);
        if (!space) return;

        const now = Date.now();
        
        // Update playback state
        space.playbackState.isPlaying = true;
        space.playbackState.pausedAt = null;
        
        // If resuming from pause, adjust startedAt to account for pause duration
        if (space.playbackState.pausedAt) {
            const pauseDuration = now - space.playbackState.pausedAt;
            space.playbackState.startedAt += pauseDuration;
        } else if (!space.playbackState.startedAt) {
            space.playbackState.startedAt = now;
        }
        
        space.playbackState.lastUpdated = now;

        // Send immediate play command to all users
        space.users.forEach((user) => {
            user.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "play",
                        data: { spaceId, userId }
                    }));
                }
            });
        });

        // Start broadcasting timestamps
        this.startTimestampBroadcast(spaceId);

        // Immediately broadcast current state
        await this.broadcastCurrentTimestamp(spaceId);
        
        console.log(`▶️ Playback started for space ${spaceId}`);
    }

    async handlePlaybackPause(spaceId: string, userId: string) {
        const space = this.spaces.get(spaceId);
        if (!space) return;

        const now = Date.now();
        
        // Update playback state
        space.playbackState.isPlaying = false;
        space.playbackState.pausedAt = now;
        space.playbackState.lastUpdated = now;

        // Send immediate pause command to all users
        space.users.forEach((user) => {
            user.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "pause",
                        data: { spaceId, userId }
                    }));
                }
            });
        });

        // Stop broadcasting timestamps
        this.stopTimestampBroadcast(spaceId);

        // Send final timestamp before pausing
        await this.broadcastCurrentTimestamp(spaceId);
        
        console.log(`⏸️ Playback paused for space ${spaceId}`);
    }

    async handlePlaybackSeek(spaceId: string, userId: string, seekTime: number) {
        const space = this.spaces.get(spaceId);
        if (!space) return;

        const now = Date.now();
        
        // Update startedAt to reflect the new seek position
        space.playbackState.startedAt = now - (seekTime * 1000);
        space.playbackState.pausedAt = null;
        space.playbackState.lastUpdated = now;

        // Immediately broadcast the new timestamp
        await this.broadcastCurrentTimestamp(spaceId);
        
        console.log(`⏩ Playback seeked to ${seekTime}s for space ${spaceId}`);
    }

    // Sync new user to current playback state including timestamp
    async syncNewUserToPlayback(spaceId: string, userId: string) {
        try {
            // Small delay to ensure current song is sent first
            setTimeout(async () => {
                await this.sendCurrentTimestampToUser(spaceId, userId);
            }, 100);
            console.log(`🔄 Synced user ${userId} to playback state in space ${spaceId}`);
        } catch (error) {
            console.error(`Error syncing user ${userId} to playback:`, error);
        }
    }

    // Clean up space and stop timestamp broadcasting
    destroySpace(spaceId: string) {
        try {
            // Stop timestamp broadcasting
            this.stopTimestampBroadcast(spaceId);
            
            // Remove space
            this.spaces.delete(spaceId);
            
            console.log(`🗑️ Destroyed space ${spaceId} and stopped timestamp broadcasting`);
            return true;
        } catch (error) {
            console.error(`Error destroying space ${spaceId}:`, error);
            return false;
        }
    }

    // Leave room and clean up if needed
    async leaveRoom(spaceId: string, userId: string) {
        try {
            const space = this.spaces.get(spaceId);
            const user = this.users.get(userId);

            if (!space || !user) {
                console.log(`Space or user not found for leave room: ${spaceId}, ${userId}`);
                return false;
            }

            // Remove user from space
            space.users.delete(userId);
            
            console.log(`User ${userId} left space ${spaceId}. Remaining users: ${space.users.size}`);

            // If no users left, stop timestamp broadcasting and clean up
            if (space.users.size === 0) {
                this.stopTimestampBroadcast(spaceId);
                this.destroySpace(spaceId);
                console.log(`🛑 Last user left space ${spaceId}, stopped timestamp broadcasting`);
            } else {
                // Broadcast user update to remaining users
                this.broadcastUserUpdate(spaceId);
            }

            return true;
        } catch (error) {
            console.error(`Error in leaveRoom:`, error);
            return false;
        }
    }

    // Method to handle user disconnection
    disconnect(ws: WebSocket) {
        console.log("Handling user disconnect");
        
        // Find the space this WebSocket belongs to
        const spaceId = this.wsToSpace.get(ws);
        
        // Remove the WebSocket from wsToSpace mapping
        this.wsToSpace.delete(ws);
        
        // Find and remove the WebSocket from users
        let disconnectedUserId: string | null = null;
        this.users.forEach((user, userId) => {
            const wsIndex = user.ws.indexOf(ws);
            if (wsIndex !== -1) {
                disconnectedUserId = userId;
                user.ws.splice(wsIndex, 1);
                
                // If user has no more WebSocket connections, remove them
                if (user.ws.length === 0) {
                    this.users.delete(userId);
                }
            }
        });
        
        // Remove user from space if found
        if (spaceId && disconnectedUserId) {
            const space = this.spaces.get(spaceId);
            if (space) {
                space.users.delete(disconnectedUserId);
                
                // If space is empty, stop timestamp broadcasting and clean up
                if (space.users.size === 0) {
                    this.stopTimestampBroadcast(spaceId);
                    console.log(`🛑 Last user left space ${spaceId}, stopped timestamp broadcasting`);
                    // Optionally clean up the space
                    // this.spaces.delete(spaceId);
                } else {
                    // Broadcast user update to remaining users
                    this.broadcastUserUpdate(spaceId);
                }
            }
        }
        
        console.log(`User ${disconnectedUserId} disconnected from space ${spaceId}`);
    }

    // Helper methods for user management and communication
    async sendRoomInfoToUser(spaceId: string, userId: string) {
        const user = this.users.get(userId);
        const space = this.spaces.get(spaceId);
        
        if (!user || !space) return;
        
        const roomInfo = {
            spaceId,
            creatorId: space.creatorId,
            userCount: space.users.size,
            isCreator: userId === space.creatorId
        };
        
        user.ws.forEach((ws: WebSocket) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: "room-info",
                    data: roomInfo
                }));
            }
        });
    }

    broadcastUserUpdate(spaceId: string) {
        const space = this.spaces.get(spaceId);
        if (!space) return;
        
        const userList = Array.from(space.users.keys());
        
        space.users.forEach((user, userId) => {
            user.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "user-update",
                        data: {
                            users: userList,
                            userCount: space.users.size
                        }
                    }));
                }
            });
        });
    }

    async sendCurrentQueueToUser(spaceId: string, userId: string) {
        const user = this.users.get(userId);
        if (!user) return;
        
        try {
            // Get queue from Redis
            const queue = await this.getRedisQueue(spaceId);
            
            // Add vote counts to each song
            const queueWithVotes = await Promise.all(
                queue.map(async (song) => ({
                    ...song,
                    voteCount: await this.getSongVoteCount(spaceId, song.id)
                }))
            );
            
            user.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "current-queue",
                        data: { queue: queueWithVotes }
                    }));
                }
            });
        } catch (error) {
            console.error("Error sending current Redis queue to user:", error);
        }
    }

    async sendCurrentPlayingSongToUser(spaceId: string, userId: string) {
        const user = this.users.get(userId);
        if (!user) return;
        
        try {
            // Get current playing song from Redis
            const currentSong = await this.getCurrentPlayingSong(spaceId);
            
            if (currentSong) {
                const songData = {
                    ...currentSong,
                    voteCount: await this.getSongVoteCount(spaceId, currentSong.id),
                    addedByUser: {
                        id: currentSong.userId,
                        username: 'User' // We might need to get this from database or Redis
                    }
                };
                
                user.ws.forEach((ws: WebSocket) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: "current-song-update",
                            data: { song: songData }
                        }));
                    }
                });
            }
        } catch (error) {
            console.error("Error sending current playing song to user:", error);
        }
    }

    async broadcastQueueUpdate(spaceId: string) {
        const space = this.spaces.get(spaceId);
        if (!space) return;
        
        try {
            const queue = await this.getQueueWithVotes(spaceId);
            
            space.users.forEach((user, userId) => {
                user.ws.forEach((ws: WebSocket) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: "queue-update",
                            data: { queue }
                        }));
                    }
                });
            });
        } catch (error) {
            console.error("Error broadcasting queue update:", error);
        }
    }

    // Method to get queue with vote information
    async getQueueWithVotes(spaceId: string) {
        try {
            const streams = await this.prisma.stream.findMany({
                where: {
                    spaceId: spaceId,
                    played: false
                },
                include: {
                    upvotes: {
                        select: {
                            userId: true
                        }
                    },
                    addedByUser: {
                        select: {
                            id: true,
                            username: true
                        }
                    }
                },
                orderBy: {
                    createAt: 'asc'
                }
            });
            
            return streams.map(stream => ({
                ...stream,
                upvoteCount: stream.upvotes.length,
                upvotedBy: stream.upvotes.map(vote => vote.userId)
            }));
        } catch (error) {
            console.error("Error getting queue with votes:", error);
            return [];
        }
    }

    // ========================================
    // REDIS QUEUE MANAGEMENT SYSTEM
    // ========================================

    // Add song to Redis queue
    async addSongToRedisQueue(spaceId: string, song: QueueSong): Promise<void> {
        try {
            // Add song to the end of the queue list
            const queueKey = `queue:${spaceId}`;
            const songData = JSON.stringify(song);
            
            // Add to queue list
            await this.redisClient.rPush(queueKey, songData);
            
            // Also store song details in a hash for easy access
            const songKey = `song:${song.id}`;
            await this.redisClient.hSet(songKey, {
                id: song.id,
                title: song.title,
                artist: song.artist || '',
                url: song.url,
                extractedId: song.extractedId,
                source: song.source,
                smallImg: song.smallImg,
                bigImg: song.bigImg,
                userId: song.userId,
                addedAt: song.addedAt.toString(),
                voteCount: song.voteCount.toString(),
                duration: song.duration?.toString() || '0'
            });

            // Set expiration for song data (24 hours)
            await this.redisClient.expire(songKey, 86400);
            
            console.log(`🎵 Added song to Redis queue: ${song.title} in space ${spaceId}`);
        } catch (error) {
            console.error('Error adding song to Redis queue:', error);
            throw error;
        }
    }

    // Get all songs in queue
    async getRedisQueue(spaceId: string): Promise<QueueSong[]> {
        try {
            const queueKey = `queue:${spaceId}`;
            const songDataList = await this.redisClient.lRange(queueKey, 0, -1);
            
            const songs: QueueSong[] = [];
            for (const songData of songDataList) {
                try {
                    const song = JSON.parse(songData) as QueueSong;
                    songs.push(song);
                } catch (parseError) {
                    console.error('Error parsing song data from Redis:', parseError);
                }
            }
            
            return songs;
        } catch (error) {
            console.error('Error getting Redis queue:', error);
            return [];
        }
    }

    // Get next song from queue (FIFO)
    async getNextSongFromRedisQueue(spaceId: string): Promise<QueueSong | null> {
        try {
            const queueKey = `queue:${spaceId}`;
            const songDataList = await this.redisClient.lRange(queueKey, 0, -1);
            
            const songs: QueueSong[] = [];
            for (const songData of songDataList) {
                try {
                    const song = JSON.parse(songData) as QueueSong;
                    songs.push(song);
                } catch (parseError) {
                    console.error('Error parsing song data from Redis:', parseError);
                }
            }


            console.log("Current Redis queue songs:", songs);
            const songData = await this.redisClient.lPop(queueKey);
            
            if (!songData) {
                return null;
            }
            
            const song = JSON.parse(songData) as QueueSong;
            console.log(`🎵 Got next song from Redis queue: ${song.title}`);
            return song;
        } catch (error) {
            console.error('Error getting next song from Redis queue:', error);
            return null;
        }
    }

    // Remove specific song from queue
    async removeSongFromRedisQueue(spaceId: string, songId: string): Promise<boolean> {
        try {
            const queueKey = `queue:${spaceId}`;
            const songDataList = await this.redisClient.lRange(queueKey, 0, -1);
            
            for (let i = 0; i < songDataList.length; i++) {
                try {
                    const song = JSON.parse(songDataList[i]) as QueueSong;
                    if (song.id === songId) {
                        // Remove this specific element
                        const tempKey = `temp:${Date.now()}`;
                        await this.redisClient.lSet(queueKey, i, tempKey);
                        await this.redisClient.lRem(queueKey, 1, tempKey);
                        
                        // Also remove song details
                        await this.redisClient.del(`song:${songId}`);
                        
                        console.log(`🗑️ Removed song from Redis queue: ${song.title}`);
                        return true;
                    }
                } catch (parseError) {
                    console.error('Error parsing song for removal:', parseError);
                }
            }
            
            return false;
        } catch (error) {
            console.error('Error removing song from Redis queue:', error);
            return false;
        }
    }

    // Clear entire queue
    async clearRedisQueue(spaceId: string): Promise<void> {
        try {
            const queueKey = `queue:${spaceId}`;
            
            // Get all songs to clean up their individual keys
            const songs = await this.getRedisQueue(spaceId);
            for (const song of songs) {
                await this.redisClient.del(`song:${song.id}`);
            }
            
            // Clear the queue
            await this.redisClient.del(queueKey);
            
            console.log(`🗑️ Cleared Redis queue for space: ${spaceId}`);
        } catch (error) {
            console.error('Error clearing Redis queue:', error);
        }
    }

    // Get queue length
    async getRedisQueueLength(spaceId: string): Promise<number> {
        try {
            const queueKey = `queue:${spaceId}`;
            return await this.redisClient.lLen(queueKey);
        } catch (error) {
            console.error('Error getting Redis queue length:', error);
            return 0;
        }
    }

    // Set/Get current playing song
    async setCurrentPlayingSong(spaceId: string, song: QueueSong): Promise<void> {
        try {
            const currentKey = `current:${spaceId}`;
            await this.redisClient.set(currentKey, JSON.stringify(song), { EX: 86400 }); // 24 hour expiry
            console.log(`🎵 Set current playing song: ${song.title} in space ${spaceId}`);
        } catch (error) {
            console.error('Error setting current playing song:', error);
        }
    }

    async getCurrentPlayingSong(spaceId: string): Promise<QueueSong | null> {
        try {
            const currentKey = `current:${spaceId}`;
            const songData = await this.redisClient.get(currentKey);
            
            if (!songData) {
                return null;
            }
            
            return JSON.parse(songData) as QueueSong;
        } catch (error) {
            console.error('Error getting current playing song:', error);
            return null;
        }
    }

    // Vote management for songs (using Redis sorted sets)
    async voteOnSongRedis(spaceId: string, songId: string, userId: string, voteType: 'upvote' | 'downvote'): Promise<number> {
        try {
            const votesKey = `votes:${spaceId}:${songId}`;
            const userVoteKey = `uservote:${spaceId}:${userId}`;
            
            // Check if user already voted
            const existingVote = await this.redisClient.get(userVoteKey);
            
            if (existingVote === songId) {
                // User already voted on this song, remove vote
                await this.redisClient.zRem(votesKey, userId);
                await this.redisClient.del(userVoteKey);
                console.log(`🗳️ Removed vote from user ${userId} for song ${songId}`);
            } else {
                // Add new vote
                const score = voteType === 'upvote' ? 1 : -1;
                await this.redisClient.zAdd(votesKey, { score, value: userId });
                await this.redisClient.set(userVoteKey, songId, { EX: 86400 });
                console.log(`🗳️ Added ${voteType} from user ${userId} for song ${songId}`);
            }
            
            // Get current vote count
            const voteCount = await this.redisClient.zCard(votesKey);
            return voteCount;
        } catch (error) {
            console.error('Error voting on song:', error);
            return 0;
        }
    }

    // Get vote count for a song
    async getSongVoteCount(spaceId: string, songId: string): Promise<number> {
        try {
            const votesKey = `votes:${spaceId}:${songId}`;
            return await this.redisClient.zCard(votesKey);
        } catch (error) {
            console.error('Error getting song vote count:', error);
            return 0;
        }
    }

    // ========================================
    // UPDATED QUEUE METHODS USING REDIS
    // ========================================

    // Updated addToQueue method using Redis
    async addToQueueRedis(spaceId: string, userId: string, url: string, trackData?: any, autoPlay?: boolean): Promise<void> {
        console.log("🎵 addToQueueRedis called", { spaceId, userId, url, trackData, autoPlay });
        
        const space = this.spaces.get(spaceId);
        const currentUser = this.users.get(userId);
        
        if (!space || !currentUser) {
            console.log("❌ Room or User not defined");
            return;
        }

        // Validate URL using music source manager
        if (!this.musicSourceManager.validateUrl(url)) {
            currentUser?.ws.forEach((ws) => {
                ws.send(JSON.stringify({
                    type: "error",
                    data: { message: "Invalid music URL. Supported: YouTube, Spotify" }
                }));
            });
            return;
        }

        // Check queue length
        const queueLength = await this.getRedisQueueLength(spaceId);
        if (queueLength >= MAX_QUEUE_LENGTH) {
            currentUser?.ws.forEach((ws) => {
                ws.send(JSON.stringify({
                    type: "error",
                    data: { message: `Queue is full. Maximum ${MAX_QUEUE_LENGTH} songs allowed.` }
                }));
            });
            return;
        }

        // Get track details using the unified interface
        const trackDetails = await this.musicSourceManager.getTrackDetails(url);
        if (!trackDetails) {
            currentUser?.ws.forEach((ws) => {
                ws.send(JSON.stringify({
                    type: "error",
                    data: { message: "Could not fetch track details" }
                }));
            });
            return;
        }

        // Create queue song object
        const queueSong: QueueSong = {
            id: crypto.randomUUID(),
            title: trackDetails.title,
            artist: trackDetails.artist,
            album: trackDetails.album,
            url: trackDetails.url,
            extractedId: trackDetails.extractedId,
            source: trackDetails.source as 'Youtube' | 'Spotify',
            smallImg: trackDetails.smallImg,
            bigImg: trackDetails.bigImg,
            userId: userId,
            addedAt: Date.now(),
            duration: trackDetails.duration,
            voteCount: 0,
            spotifyId: trackDetails.source === 'Spotify' ? trackDetails.extractedId : undefined,
            youtubeId: trackDetails.source === 'Youtube' ? trackDetails.extractedId : undefined
        };

        // Add to Redis queue
        await this.addSongToRedisQueue(spaceId, queueSong);

        // Broadcast song-added event to all users in the space
        if (space) {
            const songData = {
                ...queueSong,
                voteCount: 0,
                addedByUser: {
                    id: userId,
                    username: currentUser.userId // We might need to get this from database
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

        // Auto-play logic: If this is the first song in an empty queue and no song is currently playing
        const currentPlaying = await this.getCurrentPlayingSong(spaceId);
        
        if ((queueLength === 0 || autoPlay) && !currentPlaying) {
            console.log("🎵 Auto-starting playback for first song");
            await this.playNextFromRedisQueue(spaceId, userId);
        }
    }

    // Updated adminPlayNext method using Redis
    async playNextFromRedisQueue(spaceId: string, userId: string): Promise<void> {
        console.log("🎵 [StreamManager] playNextFromRedisQueue called");
        console.log("🎵 [StreamManager] Input params:", { spaceId, userId });
        
        const space = this.spaces.get(spaceId);
        console.log("🎵 [StreamManager] Space found:", !!space);
        
        if (!space) {
            console.log("❌ [StreamManager] Space not found, exiting");
            return;
        }

        console.log("🎵 [StreamManager] Space users count:", space.users.size);
        console.log("🎵 [StreamManager] Getting next song from Redis queue...");

        // Get the next song from Redis queue
        const nextSong = await this.getNextSongFromRedisQueue(spaceId);
        console.log("🎵 [StreamManager] Next song from Redis:", nextSong ? nextSong.title : 'null');
        
        if (!nextSong) {
            console.log("❌ [StreamManager] No songs in Redis queue to play");
            
            // Clear current playing song
            console.log("🎵 [StreamManager] Clearing current playing song from Redis");
            await this.redisClient.del(`current:${spaceId}`);
            
            // Update in-memory playback state
            console.log("🎵 [StreamManager] Updating in-memory playback state to empty");
            space.playbackState = {
                currentSong: null,
                startedAt: 0,
                pausedAt: null,
                isPlaying: false,
                lastUpdated: Date.now()
            };
            
            // Notify users that queue is empty
            console.log("🎵 [StreamManager] Notifying users that queue is empty");
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

        console.log("🎵 [StreamManager] Playing next song from Redis queue:", nextSong.title);
        console.log("🎵 [StreamManager] Song details:", {
            id: nextSong.id,
            title: nextSong.title,
            artist: nextSong.artist,
            extractedId: nextSong.extractedId,
            source: nextSong.source
        });

        // Set this song as currently playing in Redis
        console.log("🎵 [StreamManager] Setting song as currently playing in Redis");
        await this.setCurrentPlayingSong(spaceId, nextSong);

        // Update in-memory playback state
        console.log("🎵 [StreamManager] Updating in-memory playback state");
        const now = Date.now();
        space.playbackState = {
            currentSong: {
                id: nextSong.id,
                title: nextSong.title,
                artist: nextSong.artist,
                url: nextSong.url,
                duration: nextSong.duration,
                extractedId: nextSong.extractedId
            },
            startedAt: now,
            pausedAt: null,
            isPlaying: true,
            lastUpdated: now
        };

        console.log("🎵 [StreamManager] Getting vote count for song...");
        const voteCount = await this.getSongVoteCount(spaceId, nextSong.id);
        console.log("🎵 [StreamManager] Vote count:", voteCount);

        // Broadcast the new current song to all users
        const songData = {
            ...nextSong,
            voteCount: voteCount,
            addedByUser: {
                id: nextSong.userId,
                username: 'User' // We might need to get this from database or Redis
            }
        };

        console.log("🎵 [StreamManager] Broadcasting current-song-update to", space.users.size, "users");
        console.log("🎵 [StreamManager] Song data being broadcast:", {
            id: songData.id,
            title: songData.title,
            extractedId: songData.extractedId,
            voteCount: songData.voteCount
        });

        let messagesSent = 0;
        space.users.forEach((user) => {
            user.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "current-song-update",
                        data: { song: songData }
                    }));
                    messagesSent++;
                }
            });
        });

        console.log("🎵 [StreamManager] Sent current-song-update to", messagesSent, "WebSocket connections");

        // Start timestamp broadcasting for synchronized playback
        console.log("🎵 [StreamManager] Starting timestamp broadcasting");
        this.startTimestampBroadcast(spaceId);

        console.log("✅ [StreamManager] Successfully completed playNextFromRedisQueue");
    }

    // Updated broadcast queue method for Redis
    async broadcastRedisQueueUpdate(spaceId: string): Promise<void> {
        const space = this.spaces.get(spaceId);
        if (!space) return;
        
        try {
            const queue = await this.getRedisQueue(spaceId);
            
            // Add vote counts to each song
            const queueWithVotes = await Promise.all(
                queue.map(async (song) => ({
                    ...song,
                    voteCount: await this.getSongVoteCount(spaceId, song.id)
                }))
            );
            
            space.users.forEach((user, userId) => {
                user.ws.forEach((ws: WebSocket) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: "queue-update",
                            data: { queue: queueWithVotes }
                        }));
                    }
                });
            });
        } catch (error) {
            console.error("Error broadcasting Redis queue update:", error);
        }
    }

    // Method to migrate existing database queue to Redis (optional, for transition)
    async migrateDbQueueToRedis(spaceId: string): Promise<void> {
        try {
            console.log(`🔄 Migrating database queue to Redis for space ${spaceId}`);
            
            // Get existing queue from database
            const dbQueue = await this.prisma.stream.findMany({
                where: {
                    spaceId: spaceId,
                    played: false
                },
                orderBy: {
                    createAt: 'asc'
                }
            });

            // Clear existing Redis queue
            await this.clearRedisQueue(spaceId);

            // Add each song to Redis queue
            for (const dbSong of dbQueue) {
                const queueSong: QueueSong = {
                    id: dbSong.id,
                    title: dbSong.title,
                    artist: dbSong.artist || undefined,
                    url: dbSong.url,
                    extractedId: dbSong.extractedId,
                    source: dbSong.type as 'Youtube' | 'Spotify',
                    smallImg: dbSong.smallImg,
                    bigImg: dbSong.bigImg,
                    userId: dbSong.userId,
                    addedAt: dbSong.createAt.getTime(),
                    duration: dbSong.duration || undefined,
                    voteCount: 0 // Will be updated with actual votes
                };

                await this.addSongToRedisQueue(spaceId, queueSong);
            }

            console.log(`✅ Successfully migrated ${dbQueue.length} songs to Redis queue`);
        } catch (error) {
            console.error('Error migrating database queue to Redis:', error);
        }
    }
}

