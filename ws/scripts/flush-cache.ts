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
        console.log('🔌 Connecting to Redis...');
        await this.redisClient.connect();
        console.log('✅ Connected to Redis successfully');
    }

    async disconnect(): Promise<void> {
        console.log('🔌 Disconnecting from Redis...');
        await this.redisClient.disconnect();
        console.log('✅ Disconnected from Redis');
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

        console.log('🧹 Starting selective cache flush...\n');

        for (const pattern of this.PATTERNS_TO_FLUSH) {
            try {
                console.log(`🔍 Scanning for pattern: ${pattern}`);
                const keys = await this.redisClient.keys(pattern);
                
                if (keys.length > 0) {
                    console.log(`  📦 Found ${keys.length} keys matching ${pattern}`);
                    
                    // Delete in batches to avoid overwhelming Redis
                    const batchSize = 100;
                    let deletedCount = 0;
                    
                    for (let i = 0; i < keys.length; i += batchSize) {
                        const batch = keys.slice(i, i + batchSize);
                        await this.redisClient.del(batch);
                        deletedCount += batch.length;
                        
                        if (keys.length > batchSize) {
                            console.log(`    🗑️ Deleted ${deletedCount}/${keys.length} keys...`);
                        }
                    }
                    
                    console.log(`  ✅ Deleted ${deletedCount} keys for pattern ${pattern}`);
                    stats.keysByPattern[pattern] = deletedCount;
                    stats.deletedKeys += deletedCount;
                } else {
                    console.log(`  ✅ No keys found for pattern ${pattern}`);
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
        console.log('🚨 NUCLEAR OPTION: Flushing entire Redis database...');
        console.log('⚠️ This will delete ALL data in the current Redis database!');
        
        await this.redisClient.flushDb();
        console.log('✅ Entire Redis database has been flushed');
    }

    async displaySummary(stats: FlushStats): Promise<void> {
        console.log('\n' + '='.repeat(60));
        console.log('📊 CACHE FLUSH SUMMARY');
        console.log('='.repeat(60));
        
        console.log(`🕒 Time taken: ${stats.timeTaken}ms`);
        console.log(`🔢 Total keys processed: ${stats.totalKeys}`);
        console.log(`🗑️ Total keys deleted: ${stats.deletedKeys}`);
        
        if (stats.deletedKeys > 0) {
            console.log('\n📋 Breakdown by pattern:');
            for (const [pattern, count] of Object.entries(stats.keysByPattern)) {
                if (count > 0) {
                    console.log(`  ${pattern}: ${count} keys deleted`);
                } else if (count === 0) {
                    console.log(`  ${pattern}: No keys found`);
                } else {
                    console.log(`  ${pattern}: ❌ Error occurred`);
                }
            }
        }
        
        console.log('\n✨ Cache flush completed successfully!');
        console.log('🚀 Your application will now start with a clean cache.');
    }

    async getRedisInfo(): Promise<void> {
        try {
            console.log('\n📋 Redis Server Information:');
            const info = await this.redisClient.info('memory');
            const lines = info.split('\r\n');
            
            for (const line of lines) {
                if (line.includes('used_memory_human') || 
                    line.includes('used_memory_peak_human') ||
                    line.includes('total_system_memory_human')) {
                    console.log(`  ${line}`);
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
            console.log('🧹 Redis Cache Flush Script');
            console.log('\nUsage:');
            console.log('  npm run flush-cache              # Interactive flush (asks for confirmation)');
            console.log('  npm run flush-cache -- --force   # Force flush without confirmation');
            console.log('  npm run flush-cache -- --all     # Flush entire Redis database');
            console.log('  npm run flush-cache -- --help    # Show this help message');
            console.log('\nPatterns that will be deleted:');
            console.log('  • music:* (All music cache entries)');
            console.log('  • music-stats:* (All music statistics)');
            console.log('  • vote:* (All vote data)');
            console.log('  • queue:* (All queue data)');
            console.log('  • And more...');
            return;
        }

        console.log('🧹 Redis Cache Flush Tool');
        console.log('='.repeat(40));

        await flushManager.connect();
        await flushManager.getRedisInfo();

        // Get current cache statistics
        console.log('\n🔍 Scanning current cache...');
        const currentStats = await flushManager.getKeyStats();
        const totalCurrentKeys = Object.values(currentStats).reduce((sum, count) => sum + count, 0);

        if (totalCurrentKeys === 0) {
            console.log('✨ Cache is already empty! Nothing to flush.');
            return;
        }

        console.log(`\n📊 Found ${totalCurrentKeys} keys to delete:`);
        for (const [pattern, count] of Object.entries(currentStats)) {
            if (count > 0) {
                console.log(`  ${pattern}: ${count} keys`);
            }
        }

        // Confirm flush unless forced
        if (!forceFlush) {
            const confirmed = await confirmFlush();
            if (!confirmed) {
                console.log('❌ Flush cancelled by user');
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
    console.log('\n🛑 Flush interrupted by user');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Flush terminated');
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
