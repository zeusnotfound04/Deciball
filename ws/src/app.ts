import {  WebSocket , WebSocketServer } from "ws";
import cluster from "cluster";
import dotenv from "dotenv"
import { RoomManager } from "./managers/streamManager";
import jwt  from "jsonwebtoken";
import { sendError } from "./utils/utils";



dotenv.config()


const cores = 1 ;


if ( cluster.isPrimary) {
    for ( let i = 0 ; i < cores ; i++){
        cluster.fork()
    }

    cluster.on("disconnect", () => {
        process.exit();
    })
} else {
    main()
}
type Data = {
    songId? : string
    userId : string ;
    spaceId : string ;
    spaceName? : string ;
    token : string;
    url : string;
    vote : "upvote" | "downvote";
    streamId : string;
    trackUri? : string;
    position? : number;
    timestamp? : number;
    isPlaying? : boolean;
    slang? : string;
    requestId? : string;
    // Chat fields
    message? : string;
    username? : string;
    userImage? : string;
    // General fields
    title? : string;
    artist? : string;
    image? : string;
    source? : string;
    userData ? : any;
    trackData? : any;
    autoPlay? : boolean;
    seekTime? : number;
    currentTime? : number;
    latency? : number;
    // Batch processing fields - updated for simplified track metadata format
    songs? : Array<{ 
        title: string; 
        artist: string; 
        album?: string; 
        spotifyId?: string; 
        spotifyUrl?: string; 
        smallImg?: string; 
        bigImg?: string; 
        duration?: number; 
        source: string;
        // Legacy support
        url?: string; 
        extractedId?: string; 
        trackData?: any;
    }>;
}


async function handleJoinRoom(ws: WebSocket , data : Data){
    console.log("Joining the room")
    console.log("Join room data:", data);
    
    if (!data.token) {
        console.error("No token provided in join room request");
        sendError(ws, "Authentication token is required");
        return;
    }
    
    jwt.verify(
        data.token,
        process.env.JWT_SECRET as string,
        async (err : any , decoded : any) => {
            if(err){
                console.log("JWT verification error:", err.message || err)
                sendError(ws , "Token verification failed")
                return; // Add return to prevent further execution
            } else {
                
                const creatorId = decoded.creatorId || decoded.userId;
                const userId = decoded.userId;
                
                console.log("JWT verified successfully for user:", userId);
                
                try {
                    await RoomManager.getInstance().joinRoom(
                        data.spaceId,
                        creatorId,
                        userId,
                        ws,
                        
                        data.token,
                        // data.userData,
                        data.spaceName
                    );
                    console.log(`User ${userId} successfully joined room ${data.spaceId}${data.spaceName ? ` (${data.spaceName})` : ''}`);
                    
                    ws.send(JSON.stringify({
                        type: "room-joined",
                        data: {
                            spaceId: data.spaceId,
                            userId: userId,
                            message: "Successfully joined room"
                        }
                    }));
                } catch (error) {
                    console.error("Error joining room:", error);
                    sendError(ws, "Failed to join room");
                }
            }
        }
    )
}


async function  processUserAction(type: string , data : Data ) {
    console.log("Data in the user action" , data)
    switch (type) {
        case "cast-vote":
            const voteCount = await RoomManager.getInstance().voteOnSongRedis(
                data.spaceId,
                data.streamId,
                data.userId,
                data.vote
            );
            await RoomManager.getInstance().broadcastRedisQueueUpdate(data.spaceId);
            break;
        
        case "add-to-queue":
            // Use the new optimized processing system
            await RoomManager.getInstance().processNewStream(
                data.spaceId,
                data.url,
                data.userId,
                data.trackData,
                data.autoPlay || false
            );
            break;

        case "add-batch-to-queue":
            // Handle both old and new batch processing formats
            if (data.songs && Array.isArray(data.songs)) {
                // Check if this is the new simplified format (has title/artist fields)
                const isSimplifiedFormat = data.songs.length > 0 && 
                    data.songs[0].title && data.songs[0].artist && !data.songs[0].url;

                if (isSimplifiedFormat) {
                    // New simplified format - search YouTube using worker pool
                    console.log(`[App] Processing ${data.songs.length} simplified tracks for YouTube search`);
                    const result = await RoomManager.getInstance().processSimplifiedBatch(
                        data.spaceId,
                        data.songs as Array<{ 
                            title: string; 
                            artist: string; 
                            album?: string; 
                            spotifyId?: string; 
                            spotifyUrl?: string; 
                            smallImg?: string; 
                            bigImg?: string; 
                            duration?: number; 
                            source: string;
                        }>,
                        data.userId,
                        data.autoPlay || false
                    );
                    
                    // Send batch result back to user
                    const user = RoomManager.getInstance().users.get(data.userId);
                    if (user) {
                        user.ws.forEach((ws: WebSocket) => {
                            if (ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({
                                    type: "batch-processing-result",
                                    data: result
                                }));
                            }
                        });
                    }
                } else {
                    // Legacy format - use existing method
                    console.log(`[App] Processing ${data.songs.length} legacy format tracks`);
                    const result = await RoomManager.getInstance().processBatchStreams(
                        data.spaceId,
                        data.songs as Array<{ 
                            url: string; 
                            source?: string; 
                            extractedId?: string; 
                            trackData?: any;
                        }>,
                        data.userId,
                        data.autoPlay || false
                    );
                    
                    // Send batch result back to user
                    const user = RoomManager.getInstance().users.get(data.userId);
                    if (user) {
                        user.ws.forEach((ws: WebSocket) => {
                            if (ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({
                                    type: "batch-processing-result",
                                    data: result
                                }));
                            }
                        });
                    }
                }
            }
            break;

        case "play-next":
            try {
                await RoomManager.getInstance().playNextFromRedisQueue(data.spaceId, data.userId);
            } catch (error) {
                console.error("Error in playNextFromRedisQueue:", error);
            }
            break;

        case "play-instant" :
            try {
                await RoomManager.getInstance().playSong(data.spaceId , data.songId!)
            } catch (err) {
                console.error("Error while playing websocket server::",  err)
            }
            break;
        case "remove-song":
            const removed = await RoomManager.getInstance().removeSongFromRedisQueue(data.spaceId, data.streamId);
            if (removed) {
                // Broadcast updated queue
                await RoomManager.getInstance().broadcastRedisQueueUpdate(data.spaceId);
            }
            break;
        
        case "empty-queue":
            await RoomManager.getInstance().clearRedisQueue(data.spaceId);
            await RoomManager.getInstance().broadcastRedisQueueUpdate(data.spaceId);
            break;        case "next-play":
            try {
                await RoomManager.getInstance().playNextFromRedisQueue(data.spaceId, data.userId);
            } catch (error) {
                console.error("Error in playNextFromRedisQueue:", error);
            }
            break;

      

        case "get-queue":
            const queue = await RoomManager.getInstance().getRedisQueue(data.spaceId);
            // Send back to requesting user
            const requestingUser = RoomManager.getInstance().users.get(data.userId);
            if (requestingUser) {
                requestingUser.ws.forEach((ws: WebSocket) => {
                    ws.send(JSON.stringify({
                        type: "queue-update",
                        data: { queue }
                    }));
                });
            }
            break;
        case "seek-playback":
            if (typeof data.seekTime === 'number' && data.spaceId) {
                await RoomManager.getInstance().handlePlaybackSeek(
                    data.spaceId,
                    data.userId,
                    data.seekTime
                );
            } else {
                console.error(" [Backend] Invalid seek data:", { 
                    seekTime: data.seekTime, 
                    spaceId: data.spaceId,
                    hasSeekTime: typeof data.seekTime === 'number',
                    hasSpaceId: !!data.spaceId
                });
            }
            break;

        

        case "play":
            await RoomManager.getInstance().handlePlaybackPlay(
                data.spaceId,
                data.userId
            );
            break;

        case "pause":
            await RoomManager.getInstance().handlePlaybackPause(
                data.spaceId,
                data.userId
            );
            break;

        case "seek":
            if (typeof data.currentTime === 'number') {
                await RoomManager.getInstance().handlePlaybackSeek(
                    data.spaceId,
                    data.userId,
                    data.currentTime
                );
            }
            break;

        // Get current timestamp for sync
        case "get-timestamp":
            const user = RoomManager.getInstance().users.get(data.userId);
            if (user) {
                const space = RoomManager.getInstance().spaces.get(data.spaceId);
                if (space?.playbackState.currentSong) {
                    await RoomManager.getInstance().sendCurrentTimestampToUser(data.spaceId, data.userId);
                }
            }
            break;
        case "get-current-song":
            const currentSongUser = RoomManager.getInstance().users.get(data.userId);
            if (currentSongUser) {
                await RoomManager.getInstance().sendCurrentPlayingSongToUser(data.spaceId, data.userId);
            }
            break;
        
        case "get-space-image":
            const requestingImageUser = RoomManager.getInstance().users.get(data.userId);
            if (requestingImageUser) {
                const imageUrl = await RoomManager.getInstance().getCurrentSpaceImage(data.spaceId);
                requestingImageUser.ws.forEach((ws: WebSocket) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: "space-image-response",
                            data: { 
                                spaceId: data.spaceId,
                                imageUrl: imageUrl
                            }
                        }));
                    }
                });
            } else {
                console.error(`❌ User not found when requesting space image. UserId: ${data.userId}, SpaceId: ${data.spaceId}`);

            }
            break;

        case "song-ended":
            console.log("[Backend] Song ended, playing next from queue");
            try {
                await RoomManager.getInstance().playNextFromRedisQueue(data.spaceId, data.userId);
            } catch (error) {
                console.error("Error playing next song after current ended:", error);
            }
            break;
            
        case "latency-report":
            console.log(`[Latency] Received latency report from user ${data.userId}:`, data.latency, "ms");
            try {
                if (typeof data.latency === 'number') {
                    await RoomManager.getInstance().reportLatency(data.spaceId, data.userId, data.latency);
                } else {
                    console.error("Invalid latency value:", data.latency);
                }
            } catch (error) {
                console.error("Error processing latency report:", error);
            }
            break;

        case "admin-timestamp-response":
            // Handle admin's response with their current timestamp for new joiner sync
            console.log(`[AdminSync] Received timestamp response from admin ${data.userId}`);
            try {
                if (typeof data.currentTime === 'number' && data.requestId) {
                    await RoomManager.getInstance().handleAdminTimestampResponse(
                        data.requestId,
                        data.currentTime,
                        data.isPlaying || false,
                        data.userId
                    );
                } else {
                    console.error("Invalid admin timestamp response data:", { 
                        currentTime: data.currentTime, 
                        requestId: data.requestId,
                        userId: data.userId
                    });
                }
            } catch (error) {
                console.error("Error processing admin timestamp response:", error);
            }
            break;

        case "send-chat-message":
            // Handle chat message broadcasting
            console.log(`[Chat] Received chat message from user ${data.userId}`);
            try {
                if (data.message && data.spaceId && data.userId) {
                    await RoomManager.getInstance().broadcastChatMessage(
                        data.spaceId,
                        data.userId,
                        data.message,
                        data.username || 'Unknown User',
                        data.userImage,
                        data.timestamp || Date.now()
                    );
                } else {
                    console.error("Invalid chat message data:", { 
                        message: data.message?.substring(0, 50) + '...', 
                        spaceId: data.spaceId,
                        userId: data.userId
                    });
                }
            } catch (error) {
                console.error("Error processing chat message:", error);
            }
            break;

        // case "get-system-stats":
        //     // New system statistics endpoint
        //     try {
        //         const stats = await RoomManager.getInstance().getSystemStats();
        //         const user = RoomManager.getInstance().users.get(data.userId);
        //         if (user) {
        //             user.ws.forEach((ws: WebSocket) => {
        //                 if (ws.readyState === WebSocket.OPEN) {
        //                     ws.send(JSON.stringify({
        //                         type: "system-stats-response",
        //                         data: stats
        //                     }));
        //                 }
        //             });
        //         }
        //     } catch (error) {
        //         console.error("Error getting system stats:", error);
        //     }
        //     break;
    
        default:
            console.warn("Unknown message type:" , type);
    }    
}

async function handleUserAction(ws:WebSocket , type : string , data : Data) {
    const user = RoomManager.getInstance().users.get(data.userId);


    if (user){
        data.userId = user.userId;
        await processUserAction(type , data)
    } else{
        sendError(ws, "You are unauthorized to perform this action");
    }
}

async function handleConnection(ws:WebSocket) {
    console.log("WebSocket connection established, waiting for messages...");
    
    ws.on("message" , async (raw : {toString : ()=> string}) => {
        try {
            console.log(`Received: ${raw}`);
            const {type , data} = JSON.parse(raw.toString()) || {};
            console.log("Parsed message type:", type, "data keys:", Object.keys(data || {}));

            switch (type){
                case "join-room":
                    await handleJoinRoom(ws , data);
                    break;
                case "discord-activity-update":
                    await RoomManager.getInstance().broadcastDiscordActivity(data.spaceId, data);
                    break;
                default:
                    await handleUserAction(ws , type , data)
            }
        } catch (error) {
            console.error("Error processing message:", error);
            sendError(ws, "Failed to process message");
        }
    });


    ws.on("error", (err : any) => {
        if (err.code === "ECONNRESET") {
        } else {
            console.error("WebSocket error:", err);
        }
    });


    ws.on("close" , () => {
        console.log(" WebSocket connection disconnected.");
        RoomManager.getInstance().disconnect(ws)
    })
}


async function main() {
    // Create standalone WebSocket server
    const wss = new WebSocketServer({ port: parseInt(process.env.PORT || '8080', 10) });
    
    console.log("Initializing WebSocket server...")
    await RoomManager.getInstance().initRedisClient();
    console.log("Redis client initialized successfully")
    
    wss.on("connection", (ws, req) => {
        const clientIp = req.socket.remoteAddress;
        console.log(`New WebSocket connection established from ${clientIp}`);
        
        // Send a ping every 30 seconds to keep connection alive
        const pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.ping();
            } else {
                clearInterval(pingInterval);
            }
        }, 30000);
        
        ws.on('close', () => {
            clearInterval(pingInterval);
        });
        
        handleConnection(ws);
    });

    const PORT = process.env.PORT ?? 8080;
    console.log(`${process.pid} : WebSocket server is running on port ${PORT}`)

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
        console.log(`\n[${signal}] Received shutdown signal, starting graceful shutdown...`);
        
        try {
            // Close WebSocket server
            wss.close(() => {
                console.log('✅ WebSocket server closed');
            });
            
            // Shutdown RoomManager (includes worker pool and Redis)
            await RoomManager.getInstance().shutdown();
            
            console.log('✅ Graceful shutdown completed');
            process.exit(0);
        } catch (error) {
            console.error('❌ Error during graceful shutdown:', error);
            process.exit(1);
        }
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        console.error('❌ Uncaught Exception:', error);
        gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
        gracefulShutdown('UNHANDLED_REJECTION');
    });

}