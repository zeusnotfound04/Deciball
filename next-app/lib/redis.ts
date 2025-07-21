import Redis from 'ioredis';

const redisConfig = {
  url: process.env.REDIS_URL,
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
};

let redisClient: Redis | null = null;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 5;

export async function getRedisClient(): Promise<Redis> {
  if (redisClient && redisClient.status === 'ready') {
    return redisClient;
  }

  if (!redisConfig.url && !redisConfig.host) {
    throw new Error('Redis configuration not provided');
  }

  while (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
    connectionAttempts++;
    
    try {
      console.log(`Attempting to connect to Redis (attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})...`);
      
      const clientOptions = {
        connectTimeout: 10000,
        commandTimeout: 5000,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryDelayOnFailover: 100,
      };

      if (redisConfig.url) {
        redisClient = new Redis(redisConfig.url, clientOptions);
      } else {
        redisClient = new Redis({
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.password,
          db: redisConfig.db,
          ...clientOptions,
        });
      }

      redisClient.on('error', (error) => {
        console.error('Redis error:', error.message);
      });

      await redisClient.connect();
      await redisClient.ping();
      
      console.log('Redis connected successfully');
      connectionAttempts = 0;
      return redisClient;

    } catch (error) {
      console.error(`Redis connection attempt ${connectionAttempts} failed:`, error);
      
      if (redisClient) {
        try {
          redisClient.disconnect();
        } catch {}
        redisClient = null;
      }
      
      if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
        throw new Error(`Failed to connect to Redis after ${MAX_CONNECTION_ATTEMPTS} attempts. Last error: ${error}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  throw new Error(`Failed to connect to Redis after ${MAX_CONNECTION_ATTEMPTS} attempts`);
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('Redis client disconnected gracefully');
    } catch (error) {
      console.error('Error disconnecting Redis client:', error);
      redisClient.disconnect();
    } finally {
      redisClient = null;
      connectionAttempts = 0;
    }
  }
}