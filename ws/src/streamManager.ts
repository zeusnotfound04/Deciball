import { createClient , RedisClientType } from "redis";


const redisUrl = process.env.REDIS_URL


export class RoomManager {

    private static instance : RoomManager;
    public redisClient : RedisClientType;
    public publisher : RedisClientType;
    public subscriber : RedisClientType;
    
    
    private constructor() {
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
        console.log("✅ Connected to Upstash Redis");
    }
}