import jwt from 'jsonwebtoken';
import { createClient, RedisClientType } from "redis";
import { WebSocket } from "ws";
import crypto from "crypto";
import { MusicSourceManager } from "../handlers/index";
import { QueueBase } from 'bullmq';

const redisUrl = process.env.REDIS_URL

const TIME_SPAN_FOR_VOTE = 1200000; // 20min
const TIME_SPAN_FOR_QUEUE = 1200000; // 20min 
const TIME_SPAN_FOR_REPEAT = 3600000;
const MAX_QUEUE_LENGTH = 20;
const EXPIRY_SECONDS = 4 * 24 * 60 * 60; // 4 days
const connection = {
    username: process.env.REDIS_USERNAME || "",
    password: process.env.REDIS_PASSWORD || "",
    host: process.env.REDIS_HOST || "",
    port: parseInt(process.env.REDIS_PORT || "") || 6379,
};

interface UserTokenInfo {
    username?: string;
    email?: string;
    name?: string;
}
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
    addedByUser: string;
    // artists?: string[];
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
    username?: string;
    email?: string;
    name ?: string; 
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
    public wsToSpace : Map<WebSocket, string>
    private timestampIntervals: Map<string, NodeJS.Timeout> = new Map();
    private readonly TIMESTAMP_BROADCAST_INTERVAL = 5000; // Broadcast every 5 seconds

    
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
        
        this.musicSourceManager = new MusicSourceManager();
        this.wsToSpace = new Map();
    }

    static getInstance() {
        if (!RoomManager.instance) {
            RoomManager.instance = new RoomManager();
        }
        return RoomManager.instance;
    }
    


    async initRedisClient () {
        await this.redisClient.connect();
        await this.publisher.connect();
        await this.subscriber.connect();
    }
    onSubscribeRoom(message: string, spaceId: string) {
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


    async createRoom(spaceId: string, spaceName?: string) {
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

          // Cache space name in Redis if provided
          if (spaceName) {
            await this.redisClient.set(
              `space-details-${spaceId}`,
              JSON.stringify({ name: spaceName }),
              { EX: EXPIRY_SECONDS } // Cache for 24 hours
            );
          }
          await this.subscriber.subscribe(spaceId, this.onSubscribeRoom);
        }
      }
    
    async addUser(userId: string, ws: WebSocket, token: string) {
        let user = this.users.get(userId);
        
        console.log("Adding user to room 🐉🐉🐉", token);
        const userTokenInfo : UserTokenInfo | null = this.decodeUserToken(token);
       
        if (!user) {
          
          if (userTokenInfo) {
             console.log("User Token Info 🥶🥶🥶", userTokenInfo);
            await this.storeUserInfo(userId, {
              username: userTokenInfo.username,
              email: userTokenInfo.email,
              name : userTokenInfo.name
        
            });
          }
          
          this.users.set(userId, {
            userId,
            ws: [ws],
            token,
            username: userTokenInfo?.username,
            email: userTokenInfo?.email,
            name: userTokenInfo?.name
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
        token: string,
        spaceName?: string
      ) {
        let space = this.spaces.get(spaceId);
        let user = this.users.get(userId);
    
        if (!space) {
          await this.createRoom(spaceId, spaceName);
          space = this.spaces.get(spaceId);
        } else if (spaceName) {
          
          await this.redisClient.set(
            `space-details-${spaceId}`,
            JSON.stringify({ name: spaceName }),
            { EX: EXPIRY_SECONDS } 
          );
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
          // If space has no creator, set this user as creator
          if (!space.creatorId || space.creatorId === "") {
            space.creatorId = creatorId;
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
          
          // Send room info to the joining user first
          await this.sendRoomInfoToUser(spaceId, userId);
          
          // Then broadcast user update to all users in the room
          await this.broadcastUserUpdate(spaceId);
          
          // Send current queue to the newly joined user
          await this.sendCurrentQueueToUser(spaceId, userId);
          
          // Sync the newly joined user to current playback state
          await this.syncNewUserToPlayback(spaceId, userId);
          
          // Send current playing song to the newly joined user
          await this.sendCurrentPlayingSongToUser(spaceId, userId);
        } else {
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
        const space = this.spaces.get(spaceId);
        if (space) {
          // Clear Redis queue
          await this.clearRedisQueue(spaceId);
          
          // Broadcast empty queue to all users
          await this.publisher.publish(
            spaceId,
            JSON.stringify({
              type: "empty-queue",
            })
          );
        }
      }

    publishRemoveSong(spaceId: string, streamId: string) {
        const space = this.spaces.get(spaceId);
        space?.users.forEach((user, userId) => {
            user?.ws.forEach((ws: WebSocket) => {
                ws.send(
                    JSON.stringify({
                        type: `remove-song/${spaceId}`,
                        data: {
                          streamId,
                          spaceId,
                        }
                    })
                );
            });
        });
    }


    
    async adminRemoveSong(spaceId: string, userId: string, streamId: string) {
        const user = this.users.get(userId);
        const creatorId = this.spaces.get(spaceId)?.creatorId;

        if (user && userId == creatorId) {
            // Remove from Redis queue
            const removed = await this.removeSongFromRedisQueue(spaceId, streamId);
            
            if (removed) {
                await this.publisher.publish(
                    spaceId,
                    JSON.stringify({
                        type: "remove-song",
                        data: {
                            streamId,
                            spaceId
                        }
                    })
                );
            }
        } else {
            user?.ws.forEach((ws: WebSocket) => {
                ws.send(
                    JSON.stringify({
                        type: "error",
                        data: {
                            message: "You cant remove the song. You are not the host"
                        }
                    })
                );
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


    async adminPlayNext(spaceId: string, userId: string) {
        const space = this.spaces.get(spaceId);
        const creatorId = space?.creatorId;
        const targetUser = this.users.get(userId);
        
        if (!targetUser || !creatorId || !space) {
            return;
        }

        // Get the next song from Redis queue
        const nextSong = await this.getNextSongFromRedisQueue(spaceId);

        if (!nextSong) {
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

        // Remove the song from the queue (it's now being played)
        await this.removeSongFromRedisQueue(spaceId, nextSong.id);

        // Update in-memory playback state
        const now = Date.now();
        space.playbackState = {
            currentSong: {
                id: nextSong.id,
                title: nextSong.title,
                artist: nextSong.artist || undefined,
                url: nextSong.url,
                duration: nextSong.duration || undefined,
                extractedId: nextSong.extractedId
            },
            startedAt: 0, // Will be set when admin starts playback
            pausedAt: null,
            isPlaying: false, // Always start paused
            lastUpdated: now
        };

        // Broadcast the new current song to all users
        const songData = {
            ...nextSong,
            voteCount: nextSong.voteCount || 0
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

        // Broadcast image update for the space when song changes
        await this.broadcastImageUpdate(spaceId);

        // Start timestamp broadcasting for synchronized playback
        this.startTimestampBroadcast(spaceId);

        // Broadcast updated queue
        await this.broadcastRedisQueueUpdate(spaceId);

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

    publishNewVote(
        spaceId: string,
        streamId: string,
        vote: "upvote" | "downvote",
        votedBy: string
    ) {
        const spaces = this.spaces.get(spaceId);
        spaces?.users.forEach((user, userId) => {
            user?.ws.forEach((ws: WebSocket) => {
                ws.send(
                    JSON.stringify({
                        type: `new-vote/${spaceId}`,
                        data: {
                            vote,
                            streamId,
                            votedBy,
                            spaceId
                        }
                    })
                );
            });
        });
    }

    async adminCasteVote(
        userId: string,
        streamId: string,
        vote: string,
        spaceId: string
    ) {
        // Store vote in Redis (temporary storage for the session)
        const voteKey = `vote:${spaceId}:${streamId}:${userId}`;
        
        if (vote === "upvote") {
            await this.redisClient.set(voteKey, "upvote", { EX: 86400 }); // Expire after 24 hour
        } else {
            await this.redisClient.del(voteKey);
        }

        await this.redisClient.set(
            `lastVoted-${spaceId}-${userId}`,
            new Date().getTime(),
            {
                EX: TIME_SPAN_FOR_VOTE / 1000,
            }
        );

        await this.publisher.publish(
            spaceId,
            JSON.stringify({
                type: "new-vote",
                data: {
                    streamId,
                    vote,
                    votedBy: userId
                }
            })
        );

        // Broadcast updated queue with new vote counts
        await this.broadcastRedisQueueUpdate(spaceId);
    }


    async casteVote(
      userId: string,
      streamId: string,
      vote: "upvote" | "downvote",
      spaceId: string
  ) {
      const space = this.spaces.get(spaceId);
      const currentUser = this.users.get(userId);
      const creatorId = this.spaces.get(spaceId)?.creatorId;
      const isCreator = currentUser?.userId === creatorId;

      if (!isCreator) {
          const lastVoted = await this.redisClient.get(
              `lastVoted-${spaceId}-${userId}`
          );
          if (lastVoted) {
              currentUser?.ws.forEach((ws: WebSocket) => {
                  ws.send(
                      JSON.stringify({
                          type: "error",
                          data: {
                              message: "You can vote after 20 mins"
                          }
                      })
                  );
              });
              return;
          }
      }
      
      await this.adminCasteVote(
          userId,
          streamId,
          vote,
          spaceId
      );
  }

    publishNewStream(spaceId: string, data: any) {
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
    private startTimestampBroadcast(spaceId: string) {
        // Clear existing interval if any
        this.stopTimestampBroadcast(spaceId);
        
        const interval = setInterval(async () => {
            await this.broadcastCurrentTimestamp(spaceId);
        }, this.TIMESTAMP_BROADCAST_INTERVAL);
        
        this.timestampIntervals.set(spaceId, interval);
    }

    // Stop timestamp broadcasting for a space
    private stopTimestampBroadcast(spaceId: string) {
        const interval = this.timestampIntervals.get(spaceId);
        if (interval) {
            clearInterval(interval);
            this.timestampIntervals.delete(spaceId);
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
                currentTime = (now - playbackState.startedAt) / 1000;
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
        
        // If resuming from pause, adjust startedAt to account for pause duration
        if (space.playbackState.pausedAt && space.playbackState.startedAt) {
            const pauseDuration = now - space.playbackState.pausedAt;
            space.playbackState.startedAt += pauseDuration;
        } else if (!space.playbackState.startedAt) {
            space.playbackState.startedAt = now;
        }
        
        // Update playback state AFTER calculating pause adjustment
        space.playbackState.isPlaying = true;
        space.playbackState.pausedAt = null;
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

        // Send immediately broadcast current state
        await this.broadcastCurrentTimestamp(spaceId);
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
    }

    async handlePlaybackSeek(spaceId: string, userId: string, seekTime: number) {        
        const space = this.spaces.get(spaceId);
        if (!space) {
            return;
        }

        const now = Date.now();
        
        // IMPORTANT: Stop timestamp broadcasting during seek to prevent conflicts
        this.stopTimestampBroadcast(spaceId);
        
        // Update playback state to the new seek position
        space.playbackState.startedAt = now - (seekTime * 1000);
        space.playbackState.pausedAt = null;
        space.playbackState.isPlaying = true; // Ensure playing state
        space.playbackState.lastUpdated = now;

        // Broadcast seek command to all users in the space
        space.users.forEach((user, userIdInSpace) => {
            user.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "seek",
                        data: { 
                            currentTime: seekTime,
                            spaceId: spaceId,
                            triggeredBy: userId,
                            forceSync: true // Flag to indicate this is a forced sync
                        }
                    }));
                }
            });
        });

        // Wait a moment for seek to settle, then restart timestamp broadcasting
        setTimeout(async () => {
            this.startTimestampBroadcast(spaceId);
            
            // Send one immediate timestamp to confirm the new position
            await this.broadcastCurrentTimestamp(spaceId);
        }, 2000); // Wait 2 seconds before resuming broadcasts - longer than frontend seeking duration
    }

    // Sync new user to current playback state including timestamp
    async syncNewUserToPlayback(spaceId: string, userId: string) {
        try {
            // Small delay to ensure current song is sent first
            setTimeout(async () => {
                await this.sendCurrentTimestampToUser(spaceId, userId);
            }, 100);
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
                return false;
            }

            // Remove user from space
            space.users.delete(userId);

            // If no users left, stop timestamp broadcasting and clean up
            if (space.users.size === 0) {
                this.stopTimestampBroadcast(spaceId);
                this.destroySpace(spaceId);
            } else {
                // Broadcast user update to remaining users
                await this.broadcastUserUpdate(spaceId);
            }

            return true;
        } catch (error) {
            console.error(`Error in leaveRoom:`, error);
            return false;
        }
    }

    // Method to handle user disconnection
    async disconnect(ws: WebSocket) {
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
                    // Optionally clean up the space
                    // this.spaces.delete(spaceId);
                } else {
                    // Broadcast user update to remaining users
                    await this.broadcastUserUpdate(spaceId);
                }
            }
        }
    }

    // Helper methods for user management and communication
    async sendRoomInfoToUser(spaceId: string, userId: string) {
        const user = this.users.get(userId);
        const space = this.spaces.get(spaceId);
        
        if (!user || !space) return;
        
        // Get space name from Redis cache
        const spaceName = await this.getSpaceName(spaceId);
        
        const roomInfo = {
            spaceId,
            spaceName,
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

    async broadcastUserUpdate(spaceId: string) {
        const space = this.spaces.get(spaceId);
        if (!space) return;
        
        const userList = Array.from(space.users.keys());
        
        // Get space name from Redis cache
        const spaceName = await this.getSpaceName(spaceId);
        
        
        // Get user details with real names from Redis cache
        const userDetails = await Promise.all(
            userList.map(async (userId) => {
                const userInfo = await this.getUserInfo(userId);
                console.log("User Infoooo 🥶🥶🥶🥶", userInfo);
                return {
                    userId,
                    name: userInfo?.name || `User ${userId.slice(0, 8)}`,
                    imageUrl: '',
                    isCreator: userId === space.creatorId
                };
            })
        );
        console.log("User Infoooo 🥠🥠🥠", userDetails);
        space.users.forEach((user, userId) => {
            user.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "user-update",
                        data: {
                            spaceName,
                            userCount: space.users.size,
                            userDetails: userDetails,
                            users: userList,
                            connectedUsers: space.users.size
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
                        name: currentSong.addedByUser
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
            console.error("Error broadcasting queue update:", error);
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
            console.log("The Original Song Adding in the QUEUE🐉🐉😘😘", song)
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
            await this.redisClient.expire(songKey, EXPIRY_SECONDS);
        } catch (error) {
            console.error('Error adding song to Redis queue:', error);
            throw error;
        }
    }
     
async getSongById(spaceId: string, songId: string): Promise<QueueSong | null> {
  try {
    const queueKey = `queue:${spaceId}`;
    const songDataList = await this.redisClient.lRange(queueKey, 0, -1);

    let targetSongRaw: string | null = null;
    const songs: QueueSong[] = [];

    for (const songData of songDataList) {
      try {
        const song = JSON.parse(songData) as QueueSong;
        songs.push(song);

        if (song.id === songId) {
          targetSongRaw = songData; // Save raw JSON string for LREM
        }
      } catch (parseError) {
        console.error('Error parsing song data from Redis:', parseError);
      }
    }

    if (!targetSongRaw) {
      return null; // song not found
    }

    // Remove the song from Redis queue using LREM
    await this.redisClient.lRem(queueKey, 1, targetSongRaw);

    const deletedSong = JSON.parse(targetSongRaw) as QueueSong;
    return deletedSong;

  } catch (err: any) {
    console.error("Error getting or deleting the song from Redis:", err);
    return null;
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
            
            // Get vote counts and sort the queue to ensure most upvoted songs are first
            const songsWithVotes = await Promise.all(
                songs.map(async (song) => ({
                    ...song,
                    voteCount: await this.getSongVoteCount(spaceId, song.id)
                }))
            );
            
            // Sort by vote count (descending), then by addedAt timestamp (ascending)
            songsWithVotes.sort((a, b) => {
                if (b.voteCount !== a.voteCount) {
                    return b.voteCount - a.voteCount; // Higher votes first
                }
                return a.addedAt - b.addedAt; // Earlier added songs first if votes are equal
            });
            
            // Return sorted songs with vote counts
            return songsWithVotes;
        } catch (error) {
            console.error('Error getting Redis queue:', error);
            return [];
        }
    }

    // Get next song from queue (highest voted first)
    async getNextSongFromRedisQueue(spaceId: string): Promise<QueueSong | null> {
        try {
            
            // Get the sorted queue (most upvoted songs first)
            const sortedQueue = await this.getRedisQueue(spaceId);
            console.log("Sorted Queue 🐉🐉 :::::", sortedQueue);
            
            if (sortedQueue.length === 0) {
                console.log("📭 Queue is empty, no songs to play");
                return null;
            }
            
            // Get the first song (most upvoted)
            const nextSong = sortedQueue[0];
        
            // Remove this song from the queue
            await this.removeSongFromRedisQueue(spaceId, nextSong.id);
            
            return nextSong;
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
            await this.redisClient.set(currentKey, JSON.stringify(song), { EX: EXPIRY_SECONDS }); // 24 hour expiry
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

    // Get current space image (from current playing song or first in queue)
    async getCurrentSpaceImage(spaceId: string): Promise<string | null> {
        try {
            // First try to get the currently playing song's image
            const currentSong = await this.getCurrentPlayingSong(spaceId);
            
            if (currentSong && (currentSong.bigImg || currentSong.smallImg)) {
                // Return the bigger image if available, otherwise the small one
                return currentSong.bigImg || currentSong.smallImg;
            }
            
            // If no current song or no image, get the first song from queue
            const queue = await this.getRedisQueue(spaceId);
            if (queue.length > 0 && (queue[0].bigImg || queue[0].smallImg)) {
                return queue[0].bigImg || queue[0].smallImg;
            }
            
            // No images found
            return null;
        } catch (error) {
            console.error('Error getting current space image:', error);
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
                await this.redisClient.set(userVoteKey, songId, { EX: EXPIRY_SECONDS });
                console.log(`🗳️ Added ${voteType} from user ${userId} for song ${songId}`);
            }
            
            // Get current vote count
            const voteCount = await this.redisClient.zCard(votesKey);
            
            // Reorder the queue after voting to ensure most upvoted songs are at the top
            console.log(`🗳️ Reordering queue after vote for song ${songId}`);
            await this.reorderQueueByVotes(spaceId);
            
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

    // Reorder queue by vote count (highest votes first, then by creation time)
    async reorderQueueByVotes(spaceId: string): Promise<void> {
        try {
            console.log(`🔄 Reordering queue for space ${spaceId} by vote count`);
            
            const queueKey = `queue:${spaceId}`;
            const songDataList = await this.redisClient.lRange(queueKey, 0, -1);
            
            if (songDataList.length === 0) {
                console.log(`📭 Queue is empty for space ${spaceId}, nothing to reorder`);
                return;
            }
            
            // Parse songs from Redis (without voteCount)
            const songs: Omit<QueueSong, 'voteCount'>[] = [];
            for (const songData of songDataList) {
                try {
                    const song = JSON.parse(songData) as Omit<QueueSong, 'voteCount'>;
                    songs.push(song);
                } catch (parseError) {
                    console.error('Error parsing song data from Redis:', parseError);
                }
            }
            
            // Get vote counts for all songs in parallel
            const songsWithVotes = await Promise.all(
                songs.map(async (song) => ({
                    ...song,
                    voteCount: await this.getSongVoteCount(spaceId, song.id)
                }))
            );
            
            // Sort by vote count (descending), then by addedAt timestamp (ascending) for stable sorting
            songsWithVotes.sort((a, b) => {
                if (b.voteCount !== a.voteCount) {
                    return b.voteCount - a.voteCount; // Higher votes first
                }
                return a.addedAt - b.addedAt; // Earlier added songs first if votes are equal
            });
            
            console.log(`🔄 Reordered queue:`, songsWithVotes.map(s => ({
                title: s.title,
                votes: s.voteCount,
                addedAt: new Date(s.addedAt).toISOString()
            })));
            
            // Clear the current queue
            await this.redisClient.del(queueKey);
            
            // Rebuild the queue in sorted order (store without voteCount as it's computed dynamically)
            for (const song of songsWithVotes) {
                const { voteCount, ...songToStore } = song;
                await this.redisClient.rPush(queueKey, JSON.stringify(songToStore));
            }
            
            console.log(`✅ Successfully reordered queue for space ${spaceId}`);
        } catch (error) {
            console.error(`❌ Error reordering queue for space ${spaceId}:`, error);
        }
    }

    // ========================================
    // UPDATED QUEUE METHODS USING REDIS
    // ========================================

    // Updated addToQueue method using Redis
    async addToQueueRedis(spaceId: string, userId: string, url: string, trackData?: any, autoPlay?: boolean): Promise<void> {
        
        const space = this.spaces.get(spaceId);
        const currentUser = this.users.get(userId);
        
        if (!space || !currentUser) {
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
        // Here we are getting the youtube url
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
       console.log("Track Details 😭😭", trackDetails)
        const primaryImage = trackData?.image || trackDetails.smallImg;
        const secondaryImage = trackData?.image || trackDetails.bigImg;
        console.log("Artists 😎😎" , trackData.artist)
        const queueSong: QueueSong = {
            id: crypto.randomUUID(),
            title: trackData.title,
            artist: trackData.artist,
            album: trackDetails.album,
            url: trackDetails.url,
            extractedId: trackDetails.extractedId,
            source: trackDetails.source as 'Youtube' | 'Spotify',
            smallImg: primaryImage,
            bigImg: secondaryImage,
            addedByUser :  trackData.addedByUser,
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
                    name: currentUser.name 
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
            await this.playNextFromRedisQueue(spaceId, userId);
        }
    }

    async playSong(spaceId : string , songId : string | undefined){

        try{

                   const space = this.spaces.get(spaceId);
                 if (!space || !songId) {
            return;
        }
            const song = await this.getSongById(spaceId , songId)
            if(!song){
                console.log(`No Song Found by this ${songId} `)

                return null
            }
               await this.setCurrentPlayingSong(spaceId, song);

        // Update in-memory playback state
        const now = Date.now();
        space.playbackState = {
            currentSong: {
                id: song.id,
                title: song.title,
                artist: song.artist,
                url: song.url,
                duration: song.duration,
                extractedId: song.extractedId
            },
            startedAt: 0, // Will be set when admin starts playback
            pausedAt: null,
            isPlaying: false, // Always start paused
            lastUpdated: now
        };

        const voteCount = await this.getSongVoteCount(spaceId, song.id);

        const songData = {
            ...song,
            voteCount: voteCount,
            addedByUser: {
                id: song.userId,
                name: song.addedByUser // We might need to get this from database or Redis
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

        // Broadcast image update for the space when song changes
        await this.broadcastImageUpdate(spaceId);

        // Start timestamp broadcasting for synchronized playback
        this.startTimestampBroadcast(spaceId);
        } catch(err ) {
            console.error("Error playing the song",err)
        }
    }
    // Updated adminPlayNext method using Redis
    async playNextFromRedisQueue(spaceId: string, userId: string): Promise<void> {        
        const space = this.spaces.get(spaceId);
        
        if (!space) {
            return;
        }

        // Get the next song from Redis queue
        const nextSong = await this.getNextSongFromRedisQueue(spaceId);

        console.log("playNext Song 🤣🤣🤣", nextSong)        
        if (!nextSong) {
            // Clear current playing song
            await this.redisClient.del(`current:${spaceId}`);
            
            // Update in-memory playback state
            space.playbackState = {
                currentSong: null,
                startedAt: 0,
                pausedAt: null,
                isPlaying: false,
                lastUpdated: Date.now()
            };
            
            // Notify users that queue is empty
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
            
            // Broadcast image update (will be null) when queue becomes empty
            await this.broadcastImageUpdate(spaceId);
            return;
        }

        // Set this song as currently playing in Redis
        await this.setCurrentPlayingSong(spaceId, nextSong);

        // Update in-memory playback state
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
            startedAt: 0, // Will be set when admin starts playback
            pausedAt: null,
            isPlaying: false, // Always start paused
            lastUpdated: now
        };

        const voteCount = await this.getSongVoteCount(spaceId, nextSong.id);

        const songData = {
            ...nextSong,
            voteCount: voteCount,
            addedByUser: {
                id: nextSong.userId,
                name: nextSong.addedByUser // We might need to get this from database or Redis
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

        // Broadcast image update for the space when song changes
        await this.broadcastImageUpdate(spaceId);

        // Start timestamp broadcasting for synchronized playback
        this.startTimestampBroadcast(spaceId);
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

    // Broadcast image update to all users in a space
    async broadcastImageUpdate(spaceId: string): Promise<void> {
        try {
            const imageUrl = await this.getCurrentSpaceImage(spaceId);
            
            // Get all users in the space
            const space = this.spaces.get(spaceId);
            if (!space) {
                return;
            }
            
            // Send update to all users in the space
            space.users.forEach((user, userId) => {
                user.ws.forEach((ws: WebSocket) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: "space-image-update",
                            data: {
                                spaceId,
                                imageUrl
                            }
                        }));
                    }
                });
            });
            
            console.log(`🖼️ Broadcasted image update for space ${spaceId}: ${imageUrl || "No image"}`);
        } catch (error) {
            console.error('Error broadcasting image update:', error);
        }
    }
    
    // ========================================
    // Discord Activity Functions
    // ========================================
  
    async broadcastDiscordActivity(spaceId: string, songData: any) {
      const space = this.spaces.get(spaceId);
      if (!space) {
        console.warn(`Cannot broadcast Discord activity: Space ${spaceId} not found`);
        return;
      }

      // Broadcast to all users in the space
      space.users.forEach((user) => {
        user.ws.forEach((ws) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'discord-activity-update',
              data: {
                title: songData.title,
                artist: songData.artist,
                albumArt: songData.image,
                duration: songData.duration,
                startTime: songData.startTime || Date.now(),
                spaceId: spaceId,
                spaceName: songData.spaceName
              }
            }));
          }
        });
      });
      
      console.log(`Discord activity broadcast for ${songData.title} by ${songData.artist} in space ${spaceId}`);
    }
    
    // Helper method to set space name in Redis cache
    async setSpaceName(spaceId: string, spaceName: string): Promise<void> {
        try {
            await this.redisClient.set(
                `space-details-${spaceId}`,
                JSON.stringify({ name: spaceName }),
                { EX: EXPIRY_SECONDS } // Cache for 24 hours
            );
        } catch (error) {
            console.error(`Error setting space name for ${spaceId}:`, error);
        }
    }

    // Helper method to get space name from Redis cache
    async getSpaceName(spaceId: string): Promise<string> {
        try {
            const cachedSpaceDetails = await this.redisClient.get(`space-details-${spaceId}`);
            
            if (cachedSpaceDetails) {
                const spaceData = JSON.parse(cachedSpaceDetails);
                return spaceData.name || `Room ${spaceId.slice(0, 8)}`;
            }
        } catch (error) {
            console.error(`Error getting space name for ${spaceId}:`, error);
        }
        
        return `Room ${spaceId.slice(0, 8)}`; // Default fallback
    }

    // Helper method to decode JWT token and extract user info
    private decodeUserToken(token: string): { userId: string; username?: string; email?: string; name?: string } | null {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
            return {
                
                userId: decoded.userId,
                username: decoded.username,
                email: decoded.email,
                name: decoded.name
            };
        } catch (error) {
            console.error('Error decoding JWT token:', error);
            return null;
        }
    }

    // Helper method to store user info in Redis
    async storeUserInfo(userId: string, userInfo: { username?: string; email?: string; name?: string }): Promise<void> {
        try {
            console.log("Storing user info in Redis cache...🤣🤣🤣", userInfo);
            await this.redisClient.set(
                `user-info-${userId}`,
                JSON.stringify(userInfo),
                { EX: EXPIRY_SECONDS } // Cache for 24 hours
            );
        } catch (error) {
            console.error(`Error storing user info for ${userId}:`, error);
        }
    }

    // Helper method to get user info from Redis
    async getUserInfo(userId: string): Promise<{ username?: string; email?: string; name?: string } | null> {
        try {
            const userInfo = await this.redisClient.get(`user-info-${userId}`);
            if (userInfo) {
                console.log("Getting user info from Redis cache...🤣🤣🤣", userInfo);
                return JSON.parse(userInfo);
                
            }
            
        } catch (error) {
            console.error(`Error getting user info for ${userId}:`, error);
        }
        return null;
    }

}