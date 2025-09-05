#!/usr/bin/env ts-node

/**
 * Redis Cache Management Interface
 * 
 * This script provides an interactive interface to manage your Redis cache
 * including viewing statistics, selective deletion, and full flush operations.
 */

import { createClient, RedisClientType } from 'redis';
import * as dotenv from 'dotenv';
import { MusicCache } from '../src/cache/MusicCache';

dotenv.config();

class CacheManager {
    private redisClient: RedisClientType;
    private musicCache: MusicCache;

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

        this.musicCache = new MusicCache(this.redisClient);
    }

    async connect(): Promise<void> {
        await this.redisClient.connect();
        
    }

    async disconnect(): Promise<void> {
        await this.redisClient.disconnect();
    }

    async flushAllCache(): Promise<void> {
        await this.musicCache.clearAllCache();
    }

    async showCacheStats(): Promise<void> {
        
        console.log('='.repeat(50));
        
        try {
            const stats = await this.musicCache.getStats();
            
            
            
            
            
            
        } catch (error) {
            console.error('❌ Error fetching cache stats:', error);
        }
    }

    async showDetailedBreakdown(): Promise<void> {
        
        console.log('='.repeat(50));

        const patterns = [
            { name: 'Music Cache Entries', pattern: 'music:*:search:*' },
            { name: 'Music URL Cache', pattern: 'music:*:url:*' },
            { name: 'Music ID Cache', pattern: 'music:id:*' },
            { name: 'Search Indexes', pattern: 'music:search-index:*' },
            { name: 'Music Statistics', pattern: 'music-stats:*' },
            { name: 'Vote Data', pattern: 'vote:*' },
            { name: 'Queue Data', pattern: 'queue:*' },
            { name: 'User Info', pattern: 'user-info:*' },
            { name: 'Space Data', pattern: 'space:*' },
        ];

        for (const { name, pattern } of patterns) {
            try {
                const keys = await this.redisClient.keys(pattern);
                
            } catch (error) {
                
            }
        }
    }

    async showRecentCacheEntries(limit: number = 10): Promise<void> {
        console.log(`\n🕒 RECENT CACHE ENTRIES (Last ${limit})`);
        console.log('='.repeat(50));

        try {
            // Get recent entries from search indexes
            const youtubeIndex = await this.redisClient.zRange('music:search-index:youtube', -limit, -1, { REV: true });
            const spotifyIndex = await this.redisClient.zRange('music:search-index:spotify', -limit, -1, { REV: true });

            
            for (const entry of youtubeIndex.slice(0, 5)) {
                try {
                    const data = JSON.parse(entry);
                    
                } catch (e) {
                    
                }
            }

            
            for (const entry of spotifyIndex.slice(0, 5)) {
                try {
                    const data = JSON.parse(entry);
                    
                } catch (e) {
                    
                }
            }
        } catch (error) {
            console.error('❌ Error fetching recent entries:', error);
        }
    }

    async clearSpecificPattern(pattern: string): Promise<void> {
        
        
        try {
            const keys = await this.redisClient.keys(pattern);
            if (keys.length > 0) {
                await this.redisClient.del(keys);
                
            } else {
                
            }
        } catch (error) {
            console.error(`❌ Error clearing pattern ${pattern}:`, error);
        }
    }

    async testCacheSearch(query: string, spotifyId?: string): Promise<void> {
        
        if (spotifyId) {
            
        }
        
        try {
            const result = await this.musicCache.searchCache(query, undefined, spotifyId);
            if (result) {
                
                console.log(`   Source: ${result.source}, Cached: ${new Date(result.cachedAt).toLocaleString()}`);
            } else {
                
            }
        } catch (error) {
            console.error('❌ Error during cache search:', error);
        }
    }
}

function showMainMenu(): void {
    
    console.log('='.repeat(40));
    
    
    
    
    
    
    
    
    
    console.log('='.repeat(40));
}

async function getUserInput(question: string): Promise<string> {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(question, (answer: string) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function main() {
    const cacheManager = new CacheManager();
    
    try {
        await cacheManager.connect();
        
        
        

        while (true) {
            showMainMenu();
            const choice = await getUserInput('\nEnter your choice (1-9): ');

            switch (choice) {
                case '1':
                    await cacheManager.showCacheStats();
                    break;
                
                case '2':
                    await cacheManager.showDetailedBreakdown();
                    break;
                
                case '3':
                    await cacheManager.showRecentCacheEntries();
                    break;
                
                case '4':
                    const query = await getUserInput('Enter search query: ');
                    const spotifyId = await getUserInput('Enter Spotify ID (optional): ');
                    await cacheManager.testCacheSearch(query, spotifyId || undefined);
                    break;
                
                case '5':
                    const confirmMusic = await getUserInput('Clear all music cache? (y/N): ');
                    if (confirmMusic.toLowerCase() === 'y') {
                        await cacheManager.clearSpecificPattern('music:*');
                    }
                    break;
                
                case '6':
                    const confirmStats = await getUserInput('Clear all statistics? (y/N): ');
                    if (confirmStats.toLowerCase() === 'y') {
                        await cacheManager.clearSpecificPattern('music-stats:*');
                    }
                    break;
                
                case '7':
                    const confirmVotes = await getUserInput('Clear all vote data? (y/N): ');
                    if (confirmVotes.toLowerCase() === 'y') {
                        await cacheManager.clearSpecificPattern('vote:*');
                        await cacheManager.clearSpecificPattern('lastVoted-*');
                    }
                    break;
                
                case '8':
                    const confirmFlush = await getUserInput('⚠️ FLUSH ALL CACHE? This cannot be undone! (y/N): ');
                    if (confirmFlush.toLowerCase() === 'y') {
                        await cacheManager.flushAllCache();
                        
                    }
                    break;
                
                case '9':
                    
                    return;
                
                default:
                    
            }

            if (choice !== '9') {
                await getUserInput('\nPress Enter to continue...');
            }
        }
    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    } finally {
        await cacheManager.disconnect();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

export { CacheManager };
