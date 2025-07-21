import {  WebSocket , WebSocketServer } from "ws";
import cluster from "cluster";
import http from "http"
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
}


function createHttpServer() {
    return http.createServer((req , res)=> {
        res.statusCode = 200;
        res.setHeader("Content-Type" , "text/plain")
        res.end("Hello From the websocket server mkc tera bhai seedhe maut ")
    })
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
                console.log("JWT verification error:", err)
                sendError(ws , "Token verification failed")
            } else {
                
                const creatorId = decoded.creatorId || decoded.userId;
                const userId = decoded.userId;
                
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
            await RoomManager.getInstance().addToQueueRedis(
                  data.spaceId,
                  data.userId,
                  data.url,
                  data.trackData, // Pass additional track data
                  data.autoPlay  // Pass auto-play flag
            );
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
    ws.on("message" , async (raw : {toString : ()=> string}) => {
        console.log(`Received: ${raw}`);
        const {type , data} = JSON.parse(raw.toString()) || {};

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
    } )


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
    const server = createHttpServer();
    const wss = new WebSocketServer({server})
    console.log("heii")
    await RoomManager.getInstance().initRedisClient();
    console.log("byeee")
    wss.on("connection", (ws) => {
        console.log(" New WebSocket connection established.");
        handleConnection(ws)
    }
    );
    // wss.on("connection", (ws)=> handleConnection(ws))

    const PORT = process.env.PORT ?? 8080;
    server.listen(PORT , ()=> {
        console.log(`${process.pid} : Websocket server is running on ${PORT} `)
    })

}