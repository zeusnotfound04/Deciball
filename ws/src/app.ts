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
    userId : string ;
    spaceId : string ;
    token : string;
    url : string;
    vote : "upvote" | "downvote";
    streamId : string;
    // Spotify-specific fields
    trackUri? : string;
    position? : number;
    timestamp? : number;
    isPlaying? : boolean;
    // General fields
    title? : string;
    artist? : string;
    image? : string;
    source? : string;
    // New fields for enhanced queue functionality
    trackData? : any;
    autoPlay? : boolean;
    // Playback control fields
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
                console.log("JWT decoded successfully:", { userId: decoded.userId, creatorId: decoded.creatorId });
                
                // Use userId as creatorId if creatorId is not present (for backward compatibility)
                const creatorId = decoded.creatorId || decoded.userId;
                const userId = decoded.userId;
                
                try {
                    await RoomManager.getInstance().joinRoom(
                        data.spaceId,
                        creatorId,
                        userId,
                        ws,
                        data.token
                    );
                    console.log(`User ${userId} successfully joined room ${data.spaceId}`);
                    
                    // Send success response to the user
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
            console.log("🐉 Going to caste the vote (btw em minor)")
            await RoomManager.getInstance().casteVote(
                data.userId,
                data.streamId,
                data.vote,
                data.spaceId
            )
            break;
        
        case "add-to-queue":
            console.log("🎵 ADD TO QUEUE FUNCTION IS GOING TO TRIGGER");
            console.log("🎵 Received data:", JSON.stringify(data, null, 2));
            await RoomManager.getInstance().addToQueue(
                  data.spaceId,
                  data.userId,
                  data.url,
                  data.trackData, // Pass additional track data
                  data.autoPlay  // Pass auto-play flag
            );
            break;

        case "play-next":
            console.log("PLAY NEXT FUNCTION IS GOING TO TRIGGER")
            await RoomManager.getInstance().adminPlayNext(data.spaceId, data.userId , data.url);
            // await RoomManager.getInstance().queue.add("play-next",{
            //         spaceId: data.spaceId,
            //         userId : data.userId
            //     } )
            break;

        case "remove-song":
            await RoomManager.getInstance().queue.add("remove-song" , {
                    ...data,
                    spaceId : data.spaceId,
                    userId : data.userId
            })
            break;
        
        case "empty-queue":
            await RoomManager.getInstance().queue.add("empty-queue", {
            ...data,
            spaceId: data.spaceId,
            userId: data.userId,
            });
            break;
    
        case "next-play":
            await RoomManager.getInstance().PlayNext(
            data.spaceId,
            data.userId,
            data.url
            );
            break;

        // Song ended - automatically play next song
        case "songEnded":
            console.log("🎵 Song ended, playing next song automatically");
            await RoomManager.getInstance().adminPlayNext(data.spaceId, data.userId);
            break;

        // Spotify synchronization cases
        case "spotify-play":
            await RoomManager.getInstance().handleSpotifyPlay(
                data.spaceId,
                data.userId,
                data
            );
            break;

        case "spotify-pause":
            await RoomManager.getInstance().handleSpotifyPause(
                data.spaceId,
                data.userId,
                data
            );
            break;

        case "spotify-resume":
            await RoomManager.getInstance().handleSpotifyPlay(
                data.spaceId,
                data.userId,
                { ...data, isPlaying: true }
            );
            break;

        case "spotify-state-change":
            await RoomManager.getInstance().handleSpotifyStateChange(
                data.spaceId,
                data.userId,
                data
            );
            break;

        // YouTube synchronization cases
        case "youtube-state-change":
            await RoomManager.getInstance().handleYouTubeStateChange(
                data.spaceId,
                data.userId,
                data
            );
            break;

        // Queue management cases
        case "get-queue":
            const queue = await RoomManager.getInstance().getQueueWithVotes(data.spaceId);
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

        // Playback control cases
        case "pause-playback":
            await RoomManager.getInstance().pausePlayback(
                data.spaceId,
                data.userId
            );
            break;

        case "resume-playback":
            await RoomManager.getInstance().resumePlayback(
                data.spaceId,
                data.userId
            );
            break;

        case "seek-playback":
            if (typeof data.seekTime === 'number') {
                await RoomManager.getInstance().seekPlayback(
                    data.spaceId,
                    data.userId,
                    data.seekTime
                );
            }
            break;

        case "get-playback-state":
            const playbackState = RoomManager.getInstance().getPlaybackState(data.spaceId);
            const stateRequestingUser = RoomManager.getInstance().users.get(data.userId);
            if (stateRequestingUser && playbackState) {
                stateRequestingUser.ws.forEach((ws: WebSocket) => {
                    ws.send(JSON.stringify({
                        type: "playback-state-update",
                        data: playbackState
                    }));
                });
            }
            break;

        // Playback control cases - handle play/pause/seek from frontend
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

        // Get current playing song
        case "get-current-song":
            const currentSongUser = RoomManager.getInstance().users.get(data.userId);
            if (currentSongUser) {
                await RoomManager.getInstance().sendCurrentPlayingSongToUser(data.spaceId, data.userId);
            }
            break;
  
    
        default:
            console.warn("Unknown message type:" , type);
    }    
}

async function handleUserAction(ws:WebSocket , type : string , data : Data) {
    const user = RoomManager.getInstance().users.get(data.userId);
    console.log("Checking user in RoomManager:", data.userId);
    console.log("All users:", RoomManager.getInstance().users);


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
            default:
                await handleUserAction(ws , type , data)
        }
    } )


    ws.on("error", (err : any) => {
        if (err.code === "ECONNRESET") {
            console.warn("⚠️ Client disconnected unexpectedly.");
        } else {
            console.error("WebSocket error:", err);
        }
    });


    ws.on("close" , () => {
        console.log("❌ WebSocket connection disconnected.");
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
        console.log("✅ New WebSocket connection established.");
        handleConnection(ws)
    }
    );
    // wss.on("connection", (ws)=> handleConnection(ws))

    const PORT = process.env.PORT ?? 8080;
    server.listen(PORT , ()=> {
        console.log(`${process.pid} : Websocket server is running on ${PORT} `)
    })

}