// // lib/redis.ts
// import Redis from 'ioredis';

// // Redis configuration
// const redisConfig = {
//   url: process.env.REDIS_URL,
//   host: process.env.REDIS_HOST || 'localhost',
//   port: parseInt(process.env.REDIS_PORT || '6379', 10),
//   password: process.env.REDIS_PASSWORD,
//   db: parseInt(process.env.REDIS_DB || '0', 10),
// };

// // Singleton Redis client
// let redisClient: Redis | null = null;
// let connectionAttempts = 0;
// const MAX_CONNECTION_ATTEMPTS = 5;

// export async function getRedisClient(): Promise<Redis> {
//   // Return existing client if available and connected
//   if (redisClient && redisClient.status === 'ready') {
//     return redisClient;
//   }

//   // Check if Redis configuration is available
//   if (!redisConfig.url && !redisConfig.host) {
//     throw new Error('Redis configuration not provided');
//   }

//   // Try to connect up to 5 times
//   while (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
//     connectionAttempts++;
    
//     try {
//       console.log(`Attempting to connect to Redis (attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})...`);
      
//       // Create Redis client
//       const clientOptions = {
//         connectTimeout: 10000,
//         commandTimeout: 5000,
//         lazyConnect: true,
//         maxRetriesPerRequest: 1,
//         retryDelayOnFailover: 100,
//       };

//       if (redisConfig.url) {
//         redisClient = new Redis(redisConfig.url, clientOptions);
//       } else {
//         redisClient = new Redis({
//           host: redisConfig.host,
//           port: redisConfig.port,
//           password: redisConfig.password,
//           db: redisConfig.db,
//           ...clientOptions,
//         });
//       }

//       // Set up basic event handlers
//       redisClient.on('error', (error) => {
//         console.error('Redis error:', error.message);
//       });

//       // Attempt to connect and test
//       await redisClient.connect();
//       await redisClient.ping();
      
//       console.log('✅ Redis connected successfully');
//       connectionAttempts = 0; // Reset on success
//       return redisClient;

//     } catch (error) {
//       console.error(`❌ Redis connection attempt ${connectionAttempts} failed:`, error);
      
//       // Clean up failed client
//       if (redisClient) {
//         try {
//           redisClient.disconnect();
//         } catch {}
//         redisClient = null;
//       }
      
//       // If this was the last attempt, throw error
//       if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
//         throw new Error(`Failed to connect to Redis after ${MAX_CONNECTION_ATTEMPTS} attempts. Last error: ${error}`);
//       }
      
//       // Wait before next attempt
//       await new Promise(resolve => setTimeout(resolve, 1000));
//     }
//   }

//   throw new Error(`Failed to connect to Redis after ${MAX_CONNECTION_ATTEMPTS} attempts`);
// }

// // Graceful shutdown
// export async function disconnectRedis(): Promise<void> {
//   if (redisClient) {
//     try {
//       await redisClient.quit();
//       console.log('Redis client disconnected gracefully');
//     } catch (error) {
//       console.error('Error disconnecting Redis client:', error);
//       redisClient.disconnect();
//     } finally {
//       redisClient = null;
//       connectionAttempts = 0;
//     }
//   }
// }