#!/usr/bin/env ts-node

/**
 * Redis Cache Flush Script
 * 
 * This script completely clears all cached data from the Redis server.
 * Use with caution as this will delete all music cache, statistics, and other stored data.
 * 
 * Usage:
 * npm run flush-cache
 * or
 * npx ts-node scripts/flush-cache.ts
 */

import { createClient, RedisClientType } from 'redis';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface FlushStats {
    totalKeys: number;
    deletedKeys: number;
    keysByPattern: Record<string, number>;
    timeTaken: number;
}

class CacheFlushManager {
    private redisClient: RedisClientType;
    private readonly PATTERNS_TO_FLUSH = [
        'music:*',           // All music cache entries
        'music-stats:*',     // All music statistics
        'vote:*',           // All vote data
        'lastVoted-*',      // All vote timing data
        'queue:*',          // All queue data
        'current-song:*',   // Current playing songs
        'space-image:*',    // Space images
        'space-name:*',     // Space names
        'user-info:*',      // User information
        'space:*',          // Any space-related data
        'room:*',           // Any room-related data
        'playback:*',       // Playback state data
        'timestamp:*',      // Timestamp broadcast data
        'latency:*',        // Latency tracking data
    ];

    constructor() {
        const redisUrl = process.env.REDIS_URL;
        if (!redisUrl) {
            throw new Error('REDIS_URL environment variable is required');
        }

        this.redisClient = createClient({
            url: redisUrl,
            socket: {
                tls: true,
                reconnectStrategy: () => 1000,
            }
        });
    }

    async connect(): Promise<void> {
        
        await this.redisClient.connect();
        
    }

    async disconnect(): Promise<void> {
        
        await this.redisClient.disconnect();
        
    }

    async getKeyStats(): Promise<Record<string, number>> {
        const stats: Record<string, number> = {};
        
        for (const pattern of this.PATTERNS_TO_FLUSH) {
            try {
                const keys = await this.redisClient.keys(pattern);
                stats[pattern] = keys.length;
            } catch (error) {
                console.warn(`⚠️ Warning: Failed to get keys for pattern ${pattern}:`, error);
                stats[pattern] = 0;
            }
        }
        
        return stats;
    }

    async flushSpecificPatterns(): Promise<FlushStats> {
        const startTime = Date.now();
        const stats: FlushStats = {
            totalKeys: 0,
            deletedKeys: 0,
            keysByPattern: {},
            timeTaken: 0
        };

        

        for (const pattern of this.PATTERNS_TO_FLUSH) {
            try {
                
                const keys = await this.redisClient.keys(pattern);
                
                if (keys.length > 0) {
                    
                    
                    // Delete in batches to avoid overwhelming Redis
                    const batchSize = 100;
                    let deletedCount = 0;
                    
                    for (let i = 0; i < keys.length; i += batchSize) {
                        const batch = keys.slice(i, i + batchSize);
                        await this.redisClient.del(batch);
                        deletedCount += batch.length;
                        
                        if (keys.length > batchSize) {
                            
                        }
                    }
                    
                    
                    stats.keysByPattern[pattern] = deletedCount;
                    stats.deletedKeys += deletedCount;
                } else {
                    
                    stats.keysByPattern[pattern] = 0;
                }
                
                stats.totalKeys += keys.length;
            } catch (error) {
                console.error(`❌ Error processing pattern ${pattern}:`, error);
                stats.keysByPattern[pattern] = -1; // Indicate error
            }
        }

        stats.timeTaken = Date.now() - startTime;
        return stats;
    }

    async flushAllDatabase(): Promise<void> {
        
        
        
        await this.redisClient.flushDb();
        
    }

    async displaySummary(stats: FlushStats): Promise<void> {
        console.log('\n' + '='.repeat(60));
        
        console.log('='.repeat(60));
        
        
        
        
        
        if (stats.deletedKeys > 0) {
            
            for (const [pattern, count] of Object.entries(stats.keysByPattern)) {
                if (count > 0) {
                    
                } else if (count === 0) {
                    
                } else {
                    
                }
            }
        }
        
        
        
    }

    async getRedisInfo(): Promise<void> {
        try {
            
            const info = await this.redisClient.info('memory');
            const lines = info.split('\r\n');
            
            for (const line of lines) {
                if (line.includes('used_memory_human') || 
                    line.includes('used_memory_peak_human') ||
                    line.includes('total_system_memory_human')) {
                    
                }
            }
        } catch (error) {
            console.warn('⚠️ Could not retrieve Redis info:', error);
        }
    }
}

async function confirmFlush(): Promise<boolean> {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question('⚠️ Are you sure you want to flush the cache? This action cannot be undone. (y/N): ', (answer: string) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
    });
}

async function main() {
    const flushManager = new CacheFlushManager();
    
    try {
        // Parse command line arguments
        const args = process.argv.slice(2);
        const forceFlush = args.includes('--force') || args.includes('-f');
        const flushAll = args.includes('--all') || args.includes('-a');
        const showHelp = args.includes('--help') || args.includes('-h');

        if (showHelp) {
            
            
            console.log('  npm run flush-cache              # Interactive flush (asks for confirmation)');
            
            
            
            
            console.log('  • music:* (All music cache entries)');
            console.log('  • music-stats:* (All music statistics)');
            console.log('  • vote:* (All vote data)');
            console.log('  • queue:* (All queue data)');
            
            return;
        }

        
        console.log('='.repeat(40));

        await flushManager.connect();
        await flushManager.getRedisInfo();

        // Get current cache statistics
        
        const currentStats = await flushManager.getKeyStats();
        const totalCurrentKeys = Object.values(currentStats).reduce((sum, count) => sum + count, 0);

        if (totalCurrentKeys === 0) {
            
            return;
        }

        
        for (const [pattern, count] of Object.entries(currentStats)) {
            if (count > 0) {
                
            }
        }

        // Confirm flush unless forced
        if (!forceFlush) {
            const confirmed = await confirmFlush();
            if (!confirmed) {
                
                return;
            }
        }

        // Perform the flush
        let stats: FlushStats;
        if (flushAll) {
            await flushManager.flushAllDatabase();
            stats = {
                totalKeys: totalCurrentKeys,
                deletedKeys: totalCurrentKeys,
                keysByPattern: currentStats,
                timeTaken: 0
            };
        } else {
            stats = await flushManager.flushSpecificPatterns();
        }

        await flushManager.displaySummary(stats);
        await flushManager.getRedisInfo();

    } catch (error) {
        console.error('❌ Fatal error during cache flush:', error);
        process.exit(1);
    } finally {
        await flushManager.disconnect();
    }
}

// Handle script termination gracefully
process.on('SIGINT', async () => {
    
    process.exit(0);
});

process.on('SIGTERM', async () => {
    
    process.exit(0);
});

// Run the script
if (require.main === module) {
    main().catch((error) => {
        console.error('💥 Unhandled error:', error);
        process.exit(1);
    });
}

export { CacheFlushManager };
