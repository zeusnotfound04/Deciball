import { WebSocket , WebSocketServer } from "ws";
import cluster from "cluster";
import http from "http"
import dotenv from "dotenv"
import { RoomManager } from "./streamManager";



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


async function handleConnection(ws:WebSocket) {
    ws.on("message" , async (raw : {toString : ()=> string}) => {
        const {type , data} = JSON.parse(raw.toString()) || {};

        switch (type){
            case "join-room":
                await handleJoinRoom(ws , data);
                break;
            default:
                await handleUserAction(ws , type , data)
        }
    } )


    ws.on("close" , () => {
        RoomManager.getInstance().disconnect(ws)
    })
}


async function main() {
    const server = createHttpServer();
    const wss = new WebSocketServer({server})
    await RoomManager.getInstance().initRedisClient();

    // wss.on("connection", (ws)=> handleConnection(ws))

    const PORT = process.env.PORT ?? 8080;
    server.listen(PORT , ()=> {
        console.log(`${process.pid} : Websocket server is running on ${PORT} `)
    })

}