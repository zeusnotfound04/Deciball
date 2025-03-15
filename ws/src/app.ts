import { CONNECTING, WebSocket , WebSocketServer } from "ws";
import cluster from "cluster";
import http from "http"
import dotenv from "dotenv"
import { RoomManager } from "./streamManager";
import jwt  from "jsonwebtoken";
import { sendError } from "./utils";



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
    jwt.verify(
        data.token,
        process.env.JWT_SECRET as string,
        (err : any , decoded : any) => {
            if(err){
                console.log(err)
                sendError(ws , "Token verification failed")
            } else {
                RoomManager.getInstance().joinRoom(
                    data.spaceId,
                    decoded.creatorId,
                    decoded.userId,
                    ws,
                    data.token
                )
            }
        }
    )
}


async function  processUserAction(type: string , data : Data ) {
    switch (type) {
        case "cast-vote":
            await RoomManager.getInstance().casteVote(
                data.userId,
                data.streamId,
                data.vote,
                data.spaceId
            )
            break;
        
        case "add-to-queue":
            console.log("ADD TO QUEUE FUNCTION IS GOING TO TRIGGER")
            await RoomManager.getInstance().addToQueue(
                  data.spaceId,
                  data.userId,
                  data.url
            );
            break;

        case "play-next":
            console.log("PLAY NEXT FUNCTION IS GOING TO TRIGGER")
            await RoomManager.getInstance().adminPlayNext(data.spaceId, data.userId);
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