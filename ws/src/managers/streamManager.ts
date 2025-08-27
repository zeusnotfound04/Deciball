
import jwt from 'jsonwebtoken';
import { createClient, RedisClientType } from "redis";
import { WebSocket } from "ws";
import crypto from "crypto";
import { MusicSourceManager } from "../handlers/index";
import { MusicCache } from "../cache/MusicCache";
import { MusicWorkerPool } from "../workers/MusicWorkerPool";
import { MusicTrack } from "../types";

const redisUrl = process.env.REDIS_URL

const TIME_SPAN_FOR_VOTE = 1200000; // 20min
const TIME_SPAN_FOR_QUEUE = 1200000; // 20min 
const TIME_SPAN_FOR_REPEAT = 3600000;
const MAX_QUEUE_LENGTH = 20;
const EXPIRY_SECONDS = 4 * 24 * 60 * 60; // 4 days
const connection = {
    username: process.env.REDIS_USERNAME || "",
    password: process.env.REDIS_PASSWORD || "",
    host: process.env.REDIS_HOST || "",
    port: parseInt(process.env.REDIS_PORT || "") || 6379,
};

interface UserTokenInfo {
    username?: string;
    email?: string;
    name?: string;
    pfpUrl?: string;
}
type PlaybackState = {
    currentSong: {
        id: string;
        title: string;
        artist?: string;
        url: string;
        duration?: number;
        extractedId: string;
    } | null;
    startedAt: number; 
    pausedAt: number | null; 
    isPlaying: boolean;
    lastUpdated: number;
};

type TimestampBroadcast = {
    currentTime: number; 
    isPlaying: boolean;
    timestamp: number;
    songId?: string;
    totalDuration?: number;
};

// Redis Queue Types
type QueueSong = {
    id: string;
    title: string;
    artist: string;
    album: string;
    url: string;
    addedByUser: string;
    // artists?: string[];
    extractedId: string;
    source: 'Youtube' | 'Spotify';
    smallImg: string;
    bigImg: string;
    userId: string; 
    addedAt: number; 
    duration: number;
    voteCount: number;
    spotifyId: string;
    youtubeId: string;
};

type User = {
    userId: string;
    ws: WebSocket[];
    token: string;
    username?: string;
    email?: string;
    name ?: string; 
};

type Space = {
    creatorId: string;
    users: Map<string, User>;
    playbackState: PlaybackState;
};

export class RoomManager {
    private musicSourceManager: MusicSourceManager;
    private musicCache!: MusicCache; // Use definite assignment assertion
    private workerPool!: MusicWorkerPool; // Use definite assignment assertion
    private static instance : RoomManager;
    public spaces : Map<string , Space>;
    public users : Map<string , User>
    public redisClient : RedisClientType;
    public publisher : RedisClientType;
    public subscriber : RedisClientType;
    public wsToSpace : Map<WebSocket, string>
    private timestampIntervals: Map<string, NodeJS.Timeout> = new Map();
    private readonly TIMESTAMP_BROADCAST_INTERVAL = 5000; // 5 seconds for smooth sync

    
    private constructor() {
        this.spaces = new Map();
        this.users = new Map();
        
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
        
        this.musicSourceManager = new MusicSourceManager();
        this.wsToSpace = new Map();
        
        // Initialize optimizations after Redis connection
        console.log('[RoomManager] Initializing optimized music processing...');
    }

    static getInstance() {
        if (!RoomManager.instance) {
            RoomManager.instance = new RoomManager();
        }
        return RoomManager.instance;
    }
    


    async initRedisClient () {
        console.log('[RoomManager] Connecting to Redis...');
        await this.redisClient.connect();
        await this.publisher.connect();
        await this.subscriber.connect();
        console.log('[RoomManager] ✅ Redis connections established');
        
        // Initialize cache and worker pool after Redis is connected
        this.musicCache = new MusicCache(this.redisClient);
        
        // Use optimized worker count for production stability
        // For t2.small instances, this will automatically use 1 worker
        // For t2.medium and larger, it will scale appropriately
        this.workerPool = new MusicWorkerPool(); // Auto-detect optimal worker count
        
        console.log('[RoomManager] ✅ Music cache and worker pool initialized');
        
        // Start health monitoring
        this.startHealthMonitoring();
    }

    private startHealthMonitoring(): void {
        // Simple health monitoring without extensive stats
        setInterval(async () => {
            try {
                const workerStats = this.workerPool.getStats();
                
                // Auto-scale workers based on queue size
                if (workerStats.queuedTasks > 10 && workerStats.totalWorkers < 8) {
                    await this.workerPool.scaleWorkers(workerStats.totalWorkers + 2);
                    console.log('[RoomManager] ⬆️ Scaled up workers due to high queue');
                } else if (workerStats.queuedTasks === 0 && workerStats.totalWorkers > 4) {
                    await this.workerPool.scaleWorkers(Math.max(4, workerStats.totalWorkers - 2));
                    console.log('[RoomManager] ⬇️ Scaled down workers due to low queue');
                }
            } catch (error) {
                console.error('[RoomManager] ❌ Health monitoring error:', error);
            }
        }, 5 * 60 * 1000); // 5 minutes
    }

    // Get worker pool statistics for monitoring
    getWorkerPoolStats() {
        return this.workerPool?.getStats() || {
            totalWorkers: 0,
            availableWorkers: 0,
            activeWorkers: 0,
            queuedTasks: 0,
            totalTasksProcessed: 0,
            averageTaskTime: 0,
            errorRate: 0
        };
    }

    // Enhanced song processing with cache + workers
    async processNewStream(
        spaceId: string,
        url: string,
        userId: string,
        trackData?: any,
        autoPlay: boolean = false
    ): Promise<any> {
        const processingStart = Date.now();
        console.log(`[RoomManager] 🎵 Processing new stream: ${url}`);
        
        try {
            // 1. Extract source information
            const { source, extractedId } = await this.extractSourceInfo(url);
            const normalizedQuery = this.normalizeQuery(url, trackData);
            
            // 2. Check cache first (fastest path) - include Spotify ID if available
            const spotifyId = trackData?.spotifyId;
            console.log(`[RoomManager] 🔍 Checking cache for: ${normalizedQuery} ${spotifyId ? `(Spotify ID: ${spotifyId})` : ''}`);
            const cachedSong = await this.musicCache.searchCache(normalizedQuery, source, spotifyId);
            
            if (cachedSong && !(cachedSong as any).failed) {
                console.log(`[RoomManager] ⚡ Cache HIT: "${cachedSong.title}" (${Date.now() - processingStart}ms)`);
                return await this.addSongToQueue(spaceId, cachedSong, userId, autoPlay, true);
            }
            
            // 3. Use worker to fetch details (parallel processing)
            console.log(`[RoomManager] 🚀 Cache MISS - Using worker to fetch: ${source} - ${extractedId || url}`);
            const songData = {
                source,
                query: normalizedQuery,
                extractedId,
                url,
                trackData
            };
            
            const songDetails = await this.workerPool.processSong(songData, 'high'); // High priority for real-time requests
            
            if (songDetails && !(songDetails as any).failed) {
                // 4. Cache the result for future requests with Spotify ID
                await this.musicCache.cacheSong(songDetails, normalizedQuery, spotifyId);
                console.log(`[RoomManager] ✅ Song processed and cached: "${songDetails.title}" (${Date.now() - processingStart}ms)`);
                
                // 5. Add to queue
                return await this.addSongToQueue(spaceId, songDetails, userId, autoPlay, false);
            } else {
                throw new Error((songDetails as any)?.error || 'Failed to fetch song details');
            }
            
        } catch (error: any) {
            console.error(`[RoomManager] ❌ Error processing stream: ${error.message} (${Date.now() - processingStart}ms)`);
            throw error;
        }
    }

    // New method for processing simplified track metadata (playlist batch processing)
    async processSimplifiedBatch(
        spaceId: string,
        tracks: Array<{ 
            title: string; 
            artist: string; 
            album?: string; 
            spotifyId?: string; 
            spotifyUrl?: string; 
            smallImg?: string; 
            bigImg?: string; 
            duration?: number; 
            source: string;
        }>,
        userId: string,
        autoPlay: boolean = false
    ): Promise<{successful: number, failed: number}> {
        const batchStart = Date.now();
        console.log(`[RoomManager] 🎵 Processing simplified batch of ${tracks.length} tracks for YouTube search`);

        let successful = 0;
        let failed = 0;

        try {
            // Process tracks in batches using worker pool
            const batchSize = 6; // Match worker pool size
            const batches = [];
            
            for (let i = 0; i < tracks.length; i += batchSize) {
                batches.push(tracks.slice(i, i + batchSize));
            }

            for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                const batch = batches[batchIndex];
                console.log(`[RoomManager] 📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} tracks)`);

                // Process all tracks in this batch in parallel
                const promises = batch.map(async (track, index) => {
                    const overallIndex = batchIndex * batchSize + index;
                    
                    // Send progress update
                    this.broadcastProgressUpdate(spaceId, userId, {
                        current: overallIndex + 1,
                        total: tracks.length,
                        percentage: Math.round(((overallIndex + 1) / tracks.length) * 100),
                        currentTrack: `${track.title} - ${track.artist}`,
                        status: `Searching YouTube for track ${overallIndex + 1}/${tracks.length}...`
                    });

                    try {
                        // Create search query for YouTube
                        const searchQuery = `${track.title} ${track.artist}`.trim();
                        console.log(`[RoomManager] 🔍 Searching YouTube for: "${searchQuery}"`);

                        // Check cache first with Spotify ID priority
                        const cachedSong = await this.musicCache.searchCache(searchQuery, 'Youtube', track.spotifyId);
                        
                        let processedSong;
                        if (cachedSong && !(cachedSong as any).failed) {
                            console.log(`[RoomManager] ⚡ Cache HIT for: ${track.title}`);
                            // Even with cache hits, ensure we preserve original Spotify metadata
                            processedSong = {
                                ...cachedSong,
                                title: track.title, // Always use original Spotify title
                                artist: track.artist, // Always use original Spotify artist
                                album: track.album || cachedSong.album, // Prefer Spotify album
                                smallImg: track.smallImg || cachedSong.smallImg, // Prefer Spotify image
                                bigImg: track.bigImg || cachedSong.bigImg, // Prefer Spotify image
                                duration: track.duration || cachedSong.duration, // Prefer Spotify duration
                                spotifyId: track.spotifyId,
                                spotifyUrl: track.spotifyUrl
                            };
                            console.log(`[RoomManager] ✅ Cache hit with preserved Spotify metadata: "${processedSong.title}" (was: "${cachedSong.title}")`);
                        } else {
                            console.log(`[RoomManager] 🚀 Cache MISS - Searching YouTube with worker`);
                            
                            // Use worker pool to search YouTube
                            const songData = {
                                source: 'Youtube',
                                query: searchQuery,
                                extractedId: '', // Will be found by YouTube search
                                url: '', // Will be generated from search result
                                // Keep original Spotify data as completeTrackData to preserve metadata
                                completeTrackData: {
                                    id: track.spotifyId || crypto.randomUUID(),
                                    source: 'Youtube', // Use YouTube for playback but preserve Spotify metadata
                                    extractedId: '', // Will be populated by YouTube search
                                    url: '', // Will be populated by YouTube search
                                    title: track.title, // Keep original Spotify title
                                    artist: track.artist, // Keep original Spotify artist
                                    album: track.album || '', // Keep original Spotify album
                                    smallImg: track.smallImg || '', // Keep original Spotify small image
                                    bigImg: track.bigImg || '', // Keep original Spotify big image
                                    duration: track.duration || 0 // Keep original Spotify duration
                                }
                            };

                            processedSong = await this.workerPool.processSong(songData, 'normal');
                            
                            if (processedSong && !(processedSong as any).failed) {
                                // Ensure we preserve the original Spotify metadata in the processed song
                                processedSong = {
                                    ...processedSong,
                                    title: track.title, // Override with original Spotify title
                                    artist: track.artist, // Override with original Spotify artist
                                    album: track.album || processedSong.album, // Prefer Spotify album
                                    smallImg: track.smallImg || processedSong.smallImg, // Prefer Spotify image
                                    bigImg: track.bigImg || processedSong.bigImg, // Prefer Spotify image
                                    duration: track.duration || processedSong.duration, // Prefer Spotify duration
                                    spotifyId: track.spotifyId,
                                    spotifyUrl: track.spotifyUrl
                                };
                                
                                // Cache the successful result with Spotify ID
                                await this.musicCache.cacheSong(processedSong, searchQuery, track.spotifyId);
                                console.log(`[RoomManager] ✅ YouTube search successful with preserved Spotify metadata: ${processedSong.title}`);
                            }
                        }

                        if (processedSong && !(processedSong as any).failed) {
                            // Add song to queue
                            await this.addSongToQueue(spaceId, processedSong, userId, autoPlay && successful === 0, !!cachedSong);
                            successful++;
                            console.log(`[RoomManager] ✅ Added to queue: ${track.title} (${successful}/${tracks.length})`);
                        } else {
                            failed++;
                            console.warn(`[RoomManager] ❌ Failed to process: ${track.title}`);
                        }

                    } catch (error: any) {
                        failed++;
                        console.error(`[RoomManager] ❌ Error processing track "${track.title}":`, error.message);
                    }
                });

                // Wait for current batch to complete before starting next
                await Promise.all(promises);
            }

            const processingTime = Date.now() - batchStart;
            console.log(`[RoomManager] ✅ Simplified batch completed: ${successful} successful, ${failed} failed (${processingTime}ms)`);

            // Send final progress update
            this.broadcastProgressUpdate(spaceId, userId, {
                current: tracks.length,
                total: tracks.length,
                percentage: 100,
                currentTrack: '',
                status: `Completed! ${successful} tracks added successfully.`
            });

            return { successful, failed };

        } catch (error) {
            console.error(`[RoomManager] ❌ Simplified batch processing error:`, error);
            throw error;
        }
    }

    // Helper method to broadcast progress updates
    private broadcastProgressUpdate(spaceId: string, userId: string, progress: {
        current: number;
        total: number;
        percentage: number;
        currentTrack: string;
        status: string;
    }) {
        try {
            const user = this.users.get(userId);
            if (user) {
                user.ws.forEach((ws: WebSocket) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: "processing-progress",
                            data: progress
                        }));
                    }
                });
            }
        } catch (error) {
            console.error('[RoomManager] Error broadcasting progress update:', error);
        }
    }

    // Batch processing for multiple songs with fallback logic (super fast with workers)
    async processBatchStreams(
        spaceId: string,
        songs: Array<{ 
            url: string; 
            source?: string; 
            extractedId?: string; 
            trackData?: any;
            completeTrackData?: {
                id: string;
                source: string;
                extractedId: string;
                url: string;
                title: string;
                artist?: string;
                album?: string;
                smallImg?: string;
                bigImg?: string;
                duration?: number;
            };
            fallbackData?: any;
        }>,
        userId: string,
        autoPlay: boolean = false
    ): Promise<{processed: number, cached: number, fetched: number, failed: number}> {
        const batchStart = Date.now();
        console.log(`[RoomManager] 📦 Processing batch of ${songs.length} songs with fallback logic`);

        try {
            // Filter out invalid songs and validate required fields
            const validSongs = songs.filter(song => {
                if (!song.source || !song.extractedId) {
                    console.warn(`[RoomManager] Filtering out invalid song:`, song);
                    return false;
                }
                return true;
            });

            if (validSongs.length === 0) {
                console.warn(`[RoomManager] No valid songs found in batch`);
                return { processed: 0, cached: 0, fetched: 0, failed: songs.length };
            }

            console.log(`[RoomManager] Processing ${validSongs.length} valid songs out of ${songs.length} total`);

            // 1. Group songs by their Spotify ID (original track) to handle fallbacks
            const songGroups = new Map<string, Array<any>>();
            
            for (const song of validSongs) {
                const spotifyId = song.trackData?.id || song.fallbackData?.originalTrack?.id;
                if (spotifyId) {
                    if (!songGroups.has(spotifyId)) {
                        songGroups.set(spotifyId, []);
                    }
                    songGroups.get(spotifyId)!.push(song);
                } else {
                    // Handle songs without Spotify ID separately
                    const uniqueKey = `${song.extractedId}-${song.source}`;
                    if (!songGroups.has(uniqueKey)) {
                        songGroups.set(uniqueKey, []);
                    }
                    songGroups.get(uniqueKey)!.push(song);
                }
            }

            console.log(`[RoomManager] 📊 Grouped ${validSongs.length} songs into ${songGroups.size} track groups`);

            // 2. Process each group with fallback logic
            const processedSongs = [];
            const failedTracks = [];
            let cachedCount = 0;
            let fetchedCount = 0;

            for (const [trackId, variations] of songGroups) {
                console.log(`[RoomManager] 🎵 Processing track group ${trackId} with ${variations.length} variations`);
                
                // Sort variations by preference (primary variation first, then fallbacks)
                const sortedVariations = variations.sort((a, b) => {
                    // If both have fallback data, sort by variation index (0 = primary, 1+ = fallbacks)
                    if (a.fallbackData && b.fallbackData) {
                        const aIndex = a.fallbackData.variationIndex || 0;
                        const bIndex = b.fallbackData.variationIndex || 0;
                        return aIndex - bIndex;
                    }
                    // If only one has fallback data, prioritize the one without (legacy support)
                    if (a.fallbackData && !b.fallbackData) return 1;
                    if (!a.fallbackData && b.fallbackData) return -1;
                    return 0;
                });

                let successfulSong = null;
                let fromCache = false;

                // Try each variation until one succeeds
                for (let i = 0; i < sortedVariations.length; i++) {
                    const song = sortedVariations[i];
                    const isLastVariation = i === sortedVariations.length - 1;
                    const variationIndex = song.fallbackData?.variationIndex || 0;
                    const isSecondary = song.fallbackData?.isSecondaryVariation || false;
                    
                    console.log(`[RoomManager] 🔍 Trying ${isSecondary ? 'FALLBACK' : 'PRIMARY'} variation ${i + 1}/${sortedVariations.length} (index ${variationIndex}) for track ${trackId}: ${song.extractedId}`);

                    try {
                        // Create synthetic URL for normalization
                        const syntheticUrl = song.extractedId ? 
                            (song.source?.toLowerCase() === 'youtube' ? 
                                `https://youtube.com/watch?v=${song.extractedId}` : 
                                `https://open.spotify.com/track/${song.extractedId}`) : 
                            '';
                        
                        const normalizedQuery = this.normalizeQuery(syntheticUrl, song.trackData);
                        
                        // Check cache first with Spotify ID if available
                        const spotifyId = song.trackData?.spotifyId || song.completeTrackData?.spotifyId;
                        const cachedSong = await this.musicCache.searchCache(normalizedQuery, song.source, spotifyId);
                        
                        if (cachedSong && !(cachedSong as any).failed) {
                            console.log(`[RoomManager] ⚡ Cache HIT for ${isSecondary ? 'FALLBACK' : 'PRIMARY'} variation ${i + 1}: ${cachedSong.title}`);
                            successfulSong = cachedSong;
                            fromCache = true;
                            cachedCount++;
                            break;
                        }

                        // If not in cache, try to fetch
                        console.log(`[RoomManager] 🚀 Cache MISS - Fetching ${isSecondary ? 'FALLBACK' : 'PRIMARY'} variation ${i + 1} with worker`);
                        
                        const songData = {
                            source: song.source,
                            query: normalizedQuery,
                            extractedId: song.extractedId,
                            url: syntheticUrl,
                            trackData: song.trackData,
                            completeTrackData: song.completeTrackData
                        };

                        const fetchedSong = await this.workerPool.processSong(songData, 'normal');
                        
                        if (fetchedSong && !(fetchedSong as any).failed) {
                            console.log(`[RoomManager] ✅ Successfully fetched ${isSecondary ? 'FALLBACK' : 'PRIMARY'} variation ${i + 1}: ${fetchedSong.title}`);
                            
                            // Cache the successful result with Spotify ID
                            await this.musicCache.cacheSong(fetchedSong, normalizedQuery, spotifyId);
                            
                            successfulSong = fetchedSong;
                            fetchedCount++;
                            break;
                        } else {
                            console.warn(`[RoomManager] ❌ Variation ${i + 1} failed: ${(fetchedSong as any)?.error || 'Unknown error'}`);
                            
                            // If this is the last variation, we've exhausted all options
                            if (isLastVariation) {
                                console.error(`[RoomManager] � All variations failed for track ${trackId}`);
                            }
                        }
                        
                    } catch (error: any) {
                        console.error(`[RoomManager] ❌ Error processing variation ${i + 1} for track ${trackId}:`, error.message);
                        
                        // If this is the last variation and it failed, mark the track as failed
                        if (isLastVariation) {
                            console.error(`[RoomManager] 💀 All variations exhausted for track ${trackId}`);
                        }
                    }
                }

                // Add successful song to queue or track failure
                if (successfulSong) {
                    processedSongs.push({ song: successfulSong, fromCache });
                    console.log(`[RoomManager] ✅ Track ${trackId} processed successfully${fromCache ? ' (from cache)' : ''}`);
                } else {
                    failedTracks.push(trackId);
                    console.error(`[RoomManager] ❌ Track ${trackId} completely failed - no valid variations found`);
                }
            }

            // 3. Add all successful songs to queue
            let addedCount = 0;
            
            for (const { song, fromCache } of processedSongs) {
                try {
                    // const finalSong = { ...song, 
                    //     duration: 
                    //  };
                    await this.addSongToQueue(spaceId, song, userId, autoPlay && addedCount === 0, fromCache);
                    addedCount++;
                } catch (error: any) {
                    console.error(`[RoomManager] ❌ Error adding song "${song.title}" to queue:`, error.message);
                }
            }

            const processingTime = Date.now() - batchStart;
            const stats = {
                processed: addedCount,
                cached: cachedCount,
                fetched: fetchedCount,
                failed: failedTracks.length
            };

            console.log(`[RoomManager] ✅ Fallback batch completed: ${JSON.stringify(stats)} (${processingTime}ms)`);
            console.log(`[RoomManager] 🎯 Successfully processed ${addedCount}/${songGroups.size} unique tracks`);
            
            if (failedTracks.length > 0) {
                console.warn(`[RoomManager] ⚠️ Failed tracks: ${failedTracks.join(', ')}`);
            }
            
            return stats;
            
        } catch (error) {
            console.error(`[RoomManager] ❌ Batch processing error:`, error);
            throw error;
        }
    }

    // Helper methods for the enhanced processing
    private async extractSourceInfo(url: string): Promise<{source: string, extractedId?: string}> {
        // Add null/undefined check
        if (!url || typeof url !== 'string') {
            console.warn(`[StreamManager] Invalid URL provided: ${url}`);
            return { source: 'Youtube', extractedId: undefined };
        }

        // Determine source from URL
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const handler = this.musicSourceManager.getHandler('Youtube');
            return {
                source: 'Youtube',
                extractedId: handler?.extractId(url) || undefined
            };
        } else if (url.includes('spotify.com')) {
            const handler = this.musicSourceManager.getHandler('Spotify');
            return {
                source: 'Spotify',
                extractedId: handler?.extractId ? (handler.extractId(url) || undefined) : undefined
            };
        } else {
            // Default to YouTube for unknown URLs
            console.warn(`[StreamManager] Unknown URL format, defaulting to YouTube: ${url}`);
            return { source: 'Youtube', extractedId: url };
        }
    }

    private normalizeQuery(url: string, trackData?: any): string {
        if (trackData?.title && trackData?.artist) {
            const names = trackData.artistes.all.map((obj: any) => obj.name).join(" , ")
            return `${trackData.title} by ${names}`.toLowerCase().trim();
        }
        return url.trim();
    }

    private async addSongToQueue(   
        spaceId: string, 
        song: any, 
        userId: string, 
        autoPlay: boolean, 
        fromCache: boolean
    ): Promise<any> {
        try {
            console.log(`[RoomManager] 🔧 Debug addSongToQueue received data:`, {
                title: song.title,
                duration: song.duration,
                completeTrackDataDuration: song.completeTrackData?.duration,
                hasCompleteTrackData: !!song.completeTrackData
            });

            // Handle duration - it might come from different sources
            let duration = 0;
            if (song.duration !== undefined && song.duration !== null) {
                duration = parseInt(song.duration);
                // If duration is in milliseconds (> 1000 seconds = ~16 minutes), convert to seconds
                if (duration > 1000) {
                    duration = Math.floor(duration / 1000);
                }
            } else if (song.completeTrackData?.duration !== undefined) {
                duration = parseInt(song.completeTrackData.duration);
                // If duration is in milliseconds, convert to seconds
                if (duration > 1000) {
                    duration = Math.floor(duration / 1000);
                }
            }

            console.log(`[RoomManager] 🔧 Processing duration for "${song.title}": original=${song.duration}, final=${duration} seconds`);

            // Convert to the QueueSong format expected by Redis queue system
            const queueItem: QueueSong = {
                id: song.id || crypto.randomUUID(),
                title: song.title || 'Unknown Title',
                artist: song.artist || 'Unknown Artist',
                album: song.album || '',
                smallImg: song.smallImg || '',
                bigImg: song.bigImg || '',
                url: song.originalUrl || song.url || '',
                source: (song.source as 'Youtube' | 'Spotify') || 'Youtube',
                voteCount: 0,
                addedByUser: await this.getUsernameById(userId) || 'Unknown',
                extractedId: song.extractedId || '',
                duration: duration, // Use the processed duration
                userId: userId,
                addedAt: Date.now(),
                spotifyId: song.source === 'Spotify' ? (song.extractedId || '') : '',
                youtubeId: song.source === 'Youtube' ? (song.extractedId || '') : ''
            };

            // Add to Redis queue using your existing method
            await this.addSongToRedisQueue(spaceId, queueItem);

            // Broadcast to room
            await this.broadcastRedisQueueUpdate(spaceId);

            // Auto-play if requested and no song is currently playing
            if (autoPlay) {
                const space = this.spaces.get(spaceId);
                if (space && !space.playbackState.currentSong) {
                    await this.playNextFromRedisQueue(spaceId, userId);
                }
            }

            console.log(`[RoomManager] ✅ Added "${song.title}" to queue${fromCache ? ' (from cache)' : ''}`);
            
            // Return frontend-compatible format for broadcasting
            return {
                id: queueItem.id,
                title: queueItem.title,
                artist: queueItem.artist,
                album: queueItem.album,
                smallImg: queueItem.smallImg,
                bigImg: queueItem.bigImg,
                url: queueItem.url,
                type: queueItem.source,  // Frontend expects 'type'
                voteCount: queueItem.voteCount,
                createAt: new Date(queueItem.addedAt).toISOString(),
                addedByUser: {
                    id: userId,
                    username: queueItem.addedByUser
                },
                upvotes: [],
                extractedId: queueItem.extractedId,
                duration: queueItem.duration,
                spotifyId: queueItem.spotifyId,
                youtubeId: queueItem.youtubeId
            };
            
        } catch (error) {
            console.error('[RoomManager] ❌ Error adding song to queue:', error);
            throw error;
        }
    }

    private async getUsernameById(userId: string): Promise<string | null> {
        try {
            const user = this.users.get(userId);
            if (user?.username) {
                return user.username;
            }
            
            // Fallback: check Redis for user info
            const userInfo = await this.redisClient.get(`user-info:${userId}`);
            if (userInfo) {
                const parsed = JSON.parse(userInfo);
                return parsed.username || null;
            }
            
            return null;
        } catch (error) {
            console.error('[RoomManager] Error getting username:', error);
            return null;
        }
    }

    // Cache warmup utility - preload popular songs
    async warmupCache(popularSongs: Array<{url: string, trackData?: any}>): Promise<void> {
        console.log(`[RoomManager] 🔥 Starting cache warmup with ${popularSongs.length} songs`);
        
        try {
            const warmupStart = Date.now();
            const results = await this.workerPool.processBatch(
                popularSongs.map((song, index) => ({
                    source: song.url.includes('spotify.com') ? 'Spotify' : 'Youtube',
                    query: this.normalizeQuery(song.url, song.trackData),
                    url: song.url,
                    trackData: song.trackData,
                    batchIndex: index,
                    batchTotal: popularSongs.length
                })),
                'low' // Low priority for warmup
            );
            
            // Cache all successful results
            const validSongs = results.filter((song: any) => !song.failed);
            if (validSongs.length > 0) {
                const cachePromises = validSongs.map((song: any) => ({
                    song,
                    searchQuery: song.originalQuery || song.title
                }));
                await this.musicCache.batchCache(cachePromises);
            }
            
            const warmupTime = Date.now() - warmupStart;
            console.log(`[RoomManager] ✅ Cache warmup completed: ${validSongs.length}/${popularSongs.length} songs cached in ${warmupTime}ms`);
        } catch (error) {
            console.error('[RoomManager] ❌ Cache warmup failed:', error);
        }
    }

    // Graceful shutdown
    async shutdown(): Promise<void> {
        console.log('[RoomManager] 🛑 Starting graceful shutdown...');
        
        try {
            // Stop timestamp broadcasts
            for (const [spaceId, interval] of this.timestampIntervals) {
                clearInterval(interval);
            }
            this.timestampIntervals.clear();

            // Shutdown worker pool
            if (this.workerPool) {
                await this.workerPool.shutdown();
            }

            // Close Redis connections
            await Promise.all([
                this.redisClient.quit(),
                this.publisher.quit(),
                this.subscriber.quit()
            ]);

            console.log('[RoomManager] ✅ Graceful shutdown completed');
        } catch (error) {
            console.error('[RoomManager] ❌ Error during shutdown:', error);
            throw error;
        }
    }
    onSubscribeRoom(message: string, spaceId: string) {
        const { type, data } = JSON.parse(message);
        if (type === "new-stream") {
          RoomManager.getInstance().publishNewStream(spaceId, data);
        } else if (type === "new-vote") {
          RoomManager.getInstance().publishNewVote(
            spaceId,
            data.streamId,
            data.vote,
            data.votedBy
          );
        } else if (type === "play-next") {
          RoomManager.getInstance().publishPlayNext(spaceId);
        } else if (type === "remove-song") {
          RoomManager.getInstance().publishRemoveSong(spaceId, data.streamId);
        } else if (type === "empty-queue") {
          RoomManager.getInstance().publishEmptyQueue(spaceId);
        }
      }


    async createRoom(spaceId: string, spaceName?: string) {
        if (!this.spaces.has(spaceId)) {
          this.spaces.set(spaceId, {
            users: new Map<string, User>(),
            creatorId: "",
            playbackState: {
              currentSong: null,
              startedAt: 0,
              pausedAt: null,
              isPlaying: false,
              lastUpdated: Date.now()
            }
          });

          if (spaceName) {
            await this.redisClient.set(
              `space-details-${spaceId}`,
              JSON.stringify({ name: spaceName }),
              { EX: EXPIRY_SECONDS } // Cache for 24 hours
            );
          }
          await this.subscriber.subscribe(spaceId, this.onSubscribeRoom);
        }
      }
    
    async addUser(userId: string, ws: WebSocket, token: string) {
        let user = this.users.get(userId);
        
        const userTokenInfo : UserTokenInfo | null = this.decodeUserToken(token);
       
        if (!user) {
          
          if (userTokenInfo) {
            await this.storeUserInfo(userId, {
              username: userTokenInfo.username,
              email: userTokenInfo.email,
              name : userTokenInfo.name,
              pfpUrl: userTokenInfo.pfpUrl
            });
          }
          
          this.users.set(userId, {
            userId,
            ws: [ws],
            token,
            username: userTokenInfo?.username,
            email: userTokenInfo?.email,
            name: userTokenInfo?.name
          });
        } else {
          if (!user.ws.some((existingWs : any ) => existingWs === ws)) {
            user.ws.push(ws);
          }
        }
      }
      
      async joinRoom(
        spaceId: string,
        creatorId: string,
        userId: string,
        ws: WebSocket,
        token: string,
        spaceName?: string
      ) {
        let space = this.spaces.get(spaceId);
        let user = this.users.get(userId);
    
        if (!space) {
          await this.createRoom(spaceId, spaceName);
          space = this.spaces.get(spaceId);
        } else if (spaceName) {
          
          await this.redisClient.set(
            `space-details-${spaceId}`,
            JSON.stringify({ name: spaceName }),
            { EX: EXPIRY_SECONDS } 
          );
        }
    
        if (!user) {
          await this.addUser(userId, ws, token);
          user = this.users.get(userId);
        } else {
          if (!user.ws.some((existingWs : any) => existingWs === ws)) {
            user.ws.push(ws);
          }
        }
    
        this.wsToSpace.set(ws, spaceId);
    
        if (space && user) {
          if (!space.creatorId || space.creatorId === "") {
            space.creatorId = creatorId;
          }
          
          space.users.set(userId, user);
          this.spaces.set(spaceId, {
            ...space,
            users: new Map(space.users),
            creatorId: space.creatorId,
            playbackState: space.playbackState || {
              currentSong: null,
              startedAt: 0,
              pausedAt: null,
              isPlaying: false,
              lastUpdated: Date.now()
            }
          });
          
          await this.sendRoomInfoToUser(spaceId, userId);
          
          // Send current playing song first before other updates
          await this.sendCurrentPlayingSongToUser(spaceId, userId);
          
          await this.broadcastUserUpdate(spaceId);
          
          await this.sendCurrentQueueToUser(spaceId, userId);
          
          // Sync playback state after song is loaded
          await this.syncNewUserToPlayback(spaceId, userId);
        } else {
          throw new Error("Failed to add user to space");
        }
      }

    publishEmptyQueue(spaceId: string) {
        const space = this.spaces.get(spaceId);
        space?.users.forEach((user, userId) => {
          user?.ws.forEach((ws : WebSocket ) => {
            ws.send(
              JSON.stringify({
                type: `empty-queue/${spaceId}`,
              })
            );
          });
        });
      }

    async adminEmptyQueue(spaceId: string) {
        const space = this.spaces.get(spaceId);
        if (space) {
          await this.clearRedisQueue(spaceId);
          
          await this.publisher.publish(
            spaceId,
            JSON.stringify({
              type: "empty-queue",
            })
          );
        }
      }

    publishRemoveSong(spaceId: string, streamId: string) {
        const space = this.spaces.get(spaceId);
        space?.users.forEach((user, userId) => {
            user?.ws.forEach((ws: WebSocket) => {
                ws.send(
                    JSON.stringify({
                        type: `remove-song/${spaceId}`,
                        data: {
                          streamId,
                          spaceId,
                        }
                    })
                );
            });
        });
    }


    
    async adminRemoveSong(spaceId: string, userId: string, streamId: string) {
        const user = this.users.get(userId);
        const creatorId = this.spaces.get(spaceId)?.creatorId;

        if (user && userId == creatorId) {
            const removed = await this.removeSongFromRedisQueue(spaceId, streamId);
            
            if (removed) {
                await this.publisher.publish(
                    spaceId,
                    JSON.stringify({
                        type: "remove-song",
                        data: {
                            streamId,
                            spaceId
                        }
                    })
                );
            }
        } else {
            user?.ws.forEach((ws: WebSocket) => {
                ws.send(
                    JSON.stringify({
                        type: "error",
                        data: {
                            message: "You cant remove the song. You are not the host"
                        }
                    })
                );
            });
        }
    }


    publishPlayNext(spaceId: string) {
        const space = this.spaces.get(spaceId);
        space?.users.forEach((user, userId) => {
          user?.ws.forEach((ws) => {
            ws.send(
              JSON.stringify({
                type: `play-next/${spaceId}`,
              })
            );
          });
        });
      }


    async adminPlayNext(spaceId: string, userId: string) {
        const space = this.spaces.get(spaceId);
        const creatorId = space?.creatorId;
        const targetUser = this.users.get(userId);
        
        if (!targetUser || !creatorId || !space) {
            return;
        }

        const nextSong = await this.getNextSongFromRedisQueue(spaceId);

        if (!nextSong) {
            space.playbackState = {
                currentSong: null,
                startedAt: 0,
                pausedAt: null,
                isPlaying: false,
                lastUpdated: Date.now()
            };
            
            space.users.forEach((user) => {
                user.ws.forEach((ws: WebSocket) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: "queue-empty",
                            data: { message: "No more songs in queue" }
                        }));
                    }
                });
            });
            return;
        }

        await this.removeSongFromRedisQueue(spaceId, nextSong.id);

        const now = Date.now();
        space.playbackState = {
            currentSong: {
                id: nextSong.id,
                title: nextSong.title,
                artist: nextSong.artist || undefined,
                url: nextSong.url,
                duration: nextSong.duration || undefined,
                extractedId: nextSong.extractedId
            },
            startedAt: now, // Start tracking time immediately
            pausedAt: now,  // But start paused
            isPlaying: false, // Always start paused
            lastUpdated: now
        };

        const songData = {
            ...nextSong,
            voteCount: nextSong.voteCount || 0
        };

        space.users.forEach((user) => {
            user.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "current-song-update",
                        data: { song: songData }
                    }));
                }
            });
        });

        await this.broadcastImageUpdate(spaceId);

        this.startTimestampBroadcast(spaceId);

        // Broadcast updated queue
        await this.broadcastRedisQueueUpdate(spaceId);

        try {
            await this.publisher.publish(spaceId, JSON.stringify({ 
                type: "play-next",
                data: { 
                    song: songData
                }
            }));
        } catch (error) {
            console.error("Publish error:", error);
        }
    }

    publishNewVote(
        spaceId: string,
        streamId: string,
        vote: "upvote" | "downvote",
        votedBy: string
    ) {
        const spaces = this.spaces.get(spaceId);
        spaces?.users.forEach((user, userId) => {
            user?.ws.forEach((ws: WebSocket) => {
                ws.send(
                    JSON.stringify({
                        type: `new-vote/${spaceId}`,
                        data: {
                            vote,
                            streamId,
                            votedBy,
                            spaceId
                        }
                    })
                );
            });
        });
    }

    async adminCasteVote(
        userId: string,
        streamId: string,
        vote: string,
        spaceId: string
    ) {
        const voteKey = `vote:${spaceId}:${streamId}:${userId}`;
        
        if (vote === "upvote") {
            await this.redisClient.set(voteKey, "upvote", { EX: 86400 }); // Expire after 24 hour
        } else {
            await this.redisClient.del(voteKey);
        }

        await this.redisClient.set(
            `lastVoted-${spaceId}-${userId}`,
            new Date().getTime(),
            {
                EX: TIME_SPAN_FOR_VOTE / 1000,
            }
        );

        await this.publisher.publish(
            spaceId,
            JSON.stringify({
                type: "new-vote",
                data: {
                    streamId,
                    vote,
                    votedBy: userId
                }
            })
        );

        await this.broadcastRedisQueueUpdate(spaceId);
    }


    async casteVote(
      userId: string,
      streamId: string,
      vote: "upvote" | "downvote",
      spaceId: string
  ) {
      const space = this.spaces.get(spaceId);
      const currentUser = this.users.get(userId);
      const creatorId = this.spaces.get(spaceId)?.creatorId;
      const isCreator = currentUser?.userId === creatorId;

      if (!isCreator) {
          const lastVoted = await this.redisClient.get(
              `lastVoted-${spaceId}-${userId}`
          );
          if (lastVoted) {
              currentUser?.ws.forEach((ws: WebSocket) => {
                  ws.send(
                      JSON.stringify({
                          type: "error",
                          data: {
                              message: "You can vote after 20 mins"
                          }
                      })
                  );
              });
              return;
          }
      }
      
      await this.adminCasteVote(
          userId,
          streamId,
          vote,
          spaceId
      );
  }

    publishNewStream(spaceId: string, data: any) {
        const space = this.spaces.get(spaceId);
    
        if (space) {
            space.users.forEach((user, userId) => {
                user?.ws?.forEach((ws: WebSocket) => { 
                    ws.send(
                        JSON.stringify({
                            type: `new-stream/${spaceId}`,
                            data: data
                        })
                    );
                });
            });
        } else {
            console.error(`Space with ID ${spaceId} not found.`);
        }
    }
    private startTimestampBroadcast(spaceId: string) {
        console.log(`[Timestamp] Starting 5-second timestamp broadcast for space ${spaceId}`);
        this.stopTimestampBroadcast(spaceId);
        
        const interval = setInterval(async () => {
            await this.broadcastCurrentTimestamp(spaceId);
        }, this.TIMESTAMP_BROADCAST_INTERVAL);
        
        this.timestampIntervals.set(spaceId, interval);
        console.log(`[Timestamp] 5-second timestamp broadcast started for space ${spaceId}`);
    }

    private stopTimestampBroadcast(spaceId: string) {
        const interval = this.timestampIntervals.get(spaceId);
        if (interval) {
            console.log(`[Timestamp] Stopping timestamp broadcast for space ${spaceId}`);
            clearInterval(interval);
            this.timestampIntervals.delete(spaceId);
        }
    }

    private async broadcastCurrentTimestamp(spaceId: string) {
        const space = this.spaces.get(spaceId);
        if (!space || !space.playbackState.currentSong) {
            console.log(`[Timestamp] No space or current song for ${spaceId}, skipping broadcast`);
            return;
        }

        const now = Date.now();
        const { playbackState } = space;
        
        let currentTime = 0;
        
        if (playbackState.startedAt > 0) {
            if (playbackState.isPlaying) {
                currentTime = (now - playbackState.startedAt) / 1000;
            } else {
                if (playbackState.pausedAt) {
                    currentTime = (playbackState.pausedAt - playbackState.startedAt) / 1000;
                } else {
                    currentTime = 0;
                }
            }
        }

        const timestampData: TimestampBroadcast = {
            currentTime: Math.max(0, currentTime),
            isPlaying: playbackState.isPlaying,
            timestamp: now,
            songId: playbackState.currentSong?.id,
            totalDuration: playbackState.currentSong?.duration
        };

        console.log(`[Timestamp] 5-second sync broadcast to ${space.users.size} users:`, {
            currentTime: timestampData.currentTime,
            isPlaying: timestampData.isPlaying,
            songId: timestampData.songId
        });

        space.users.forEach((user) => {
            user.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "playback-sync",
                        data: timestampData
                    }));
                }
            });
        });
    }

    async sendCurrentTimestampToUser(spaceId: string, userId: string) {
        const user = this.users.get(userId);
        const space = this.spaces.get(spaceId);
        
        if (!user || !space) return;

        const storedTimestamp = await this.redisClient.get(`timestamp-${spaceId}`);
        let timestampData: TimestampBroadcast;

        if (storedTimestamp) {
            timestampData = JSON.parse(storedTimestamp);
        } else {
            const now = Date.now();
            const { playbackState } = space;
            
            let currentTime = 0;
            if (playbackState.isPlaying && playbackState.startedAt > 0 && playbackState.currentSong) {
                if (playbackState.pausedAt) {
                    currentTime = (playbackState.pausedAt - playbackState.startedAt) / 1000;
                } else {
                    currentTime = (now - playbackState.startedAt) / 1000;
                }
            }

            timestampData = {
                currentTime: Math.max(0, currentTime),
                isPlaying: playbackState.isPlaying,
                timestamp: now,
                songId: playbackState.currentSong?.id,
                totalDuration: playbackState.currentSong?.duration
            };
        }

        user.ws.forEach((ws: WebSocket) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: "playback-state-update",
                    data: {
                        ...timestampData,
                        isInitialSync: true // Flag for new joiners
                    }
                }));
            }
        });
    }

    async handlePlaybackPlay(spaceId: string, userId: string) {
        const space = this.spaces.get(spaceId);
        if (!space) return;

        const now = Date.now();
        
        if (space.playbackState.pausedAt && space.playbackState.startedAt) {
            const pauseDuration = now - space.playbackState.pausedAt;
            space.playbackState.startedAt += pauseDuration;
        } else if (!space.playbackState.startedAt) {
            space.playbackState.startedAt = now;
        }
        
        space.playbackState.isPlaying = true;
        space.playbackState.pausedAt = null;
        space.playbackState.lastUpdated = now;

        space.users.forEach((user) => {
            user.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "playback-resumed",
                        data: { spaceId, userId, timestamp: now }
                    }));
                }
            });
        });

        this.startTimestampBroadcast(spaceId);

        // Send immediate play command for instant response
        space.users.forEach((user) => {
            user.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "playback-play",
                        data: { 
                            spaceId, 
                            userId, 
                            timestamp: now,
                            currentTime: (now - space.playbackState.startedAt) / 1000
                        }
                    }));
                }
            });
        });
    }

    async handlePlaybackPause(spaceId: string, userId: string) {
        const space = this.spaces.get(spaceId);
        if (!space) return;

        const now = Date.now();
        
        space.playbackState.isPlaying = false;
        space.playbackState.pausedAt = now;
        space.playbackState.lastUpdated = now;

        // Send immediate pause command
        space.users.forEach((user) => {
            user.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "playback-pause",
                        data: { 
                            spaceId, 
                            userId, 
                            timestamp: now,
                            currentTime: (space.playbackState.pausedAt! - space.playbackState.startedAt) / 1000
                        }
                    }));
                }
            });
        });

        this.stopTimestampBroadcast(spaceId);
    }

    async handlePlaybackSeek(spaceId: string, userId: string, seekTime: number) {        
        const space = this.spaces.get(spaceId);
        if (!space) return;

        const now = Date.now();
        
        console.log(`[Seek] Processing seek request from user ${userId} to ${seekTime}s in space ${spaceId}`);
        
        // Temporarily stop broadcasts during seek - extended period
        this.stopTimestampBroadcast(spaceId);
        
        space.playbackState.startedAt = now - (seekTime * 1000);
        space.playbackState.pausedAt = null;
        space.playbackState.isPlaying = true;
        space.playbackState.lastUpdated = now;

        console.log(`[Seek] Updated playback state - startedAt: ${space.playbackState.startedAt}, seekTime: ${seekTime}`);

        // Send immediate seek command to all users except the one who initiated it
        space.users.forEach((user) => {
            // Skip the user who initiated the seek to prevent conflicts
            if (user.userId === userId) return;
            
            user.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "playback-seek",
                        data: { 
                            seekTime: seekTime,
                            spaceId: spaceId,
                            triggeredBy: userId,
                            timestamp: now
                        }
                    }));
                }
            });
        });

        // Resume broadcasts after seek stabilizes - increased delay for better stability
        setTimeout(() => {
            console.log(`[Seek] Resuming timestamp broadcasts for space ${spaceId} after seek stabilization`);
            this.startTimestampBroadcast(spaceId);
        }, 8000); // Increased to 8 seconds to allow client-side seek to complete
    }

    async syncNewUserToPlayback(spaceId: string, userId: string) {
        try {
            console.log(`[Sync] Starting playbook sync for new user ${userId} in space ${spaceId}`);
            
            const space = this.spaces.get(spaceId);
            if (!space || !space.playbackState.currentSong) {
                console.log(`[Sync] No current song to sync for user ${userId}`);
                return;
            }

            // Get the admin's exact current timestamp to sync new joiner
            await this.syncNewJoinerToAdminTimestamp(spaceId, userId);
            
            // Also trigger image update after a short delay
            setTimeout(async () => {
                const imageUrl = await this.getCurrentSpaceImage(spaceId);
                if (imageUrl) {
                    const user = this.users.get(userId);
                    if (user) {
                        user.ws.forEach((ws: WebSocket) => {
                            if (ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({
                                    type: "space-image-response",
                                    data: { 
                                        spaceId: spaceId,
                                        imageUrl: imageUrl
                                    }
                                }));
                            }
                        });
                    }
                }
            }, 200);
        } catch (error) {
            console.error(`Error syncing user ${userId} to playback:`, error);
        }
    }

    // New method to sync joiner to admin's exact timestamp without affecting others
    async syncNewJoinerToAdminTimestamp(spaceId: string, newUserId: string) {
        try {
            const space = this.spaces.get(spaceId);
            const newUser = this.users.get(newUserId);
            
            if (!space || !newUser || !space.creatorId) {
                console.log(`[AdminSync] Cannot sync - missing space, user, or admin for ${spaceId}`);
                return;
            }

            const adminUser = this.users.get(space.creatorId);
            if (!adminUser || adminUser.ws.length === 0) {
                console.log(`[AdminSync] Admin not found or not connected, falling back to calculated sync`);
                await this.sendCurrentTimestampToUser(spaceId, newUserId);
                return;
            }

            console.log(`[AdminSync] Requesting real-time timestamp from admin ${space.creatorId} for new joiner ${newUserId}`);

            // Create a unique request ID to track the response
            const requestId = `sync_${newUserId}_${Date.now()}`;
            
            // Store the new joiner's info for when admin responds
            await this.redisClient.setEx(`admin-sync-request:${requestId}`, 30, JSON.stringify({
                spaceId,
                newUserId,
                requestedAt: Date.now()
            }));

            // Ask admin for their current timestamp (only admin receives this)
            adminUser.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "request-current-timestamp",
                        data: {
                            spaceId,
                            requestId,
                            purpose: "new-joiner-sync",
                            newJoinerUserId: newUserId
                        }
                    }));
                }
            });

            // Fallback: if admin doesn't respond within 3 seconds, use calculated sync
            setTimeout(async () => {
                const requestExists = await this.redisClient.exists(`admin-sync-request:${requestId}`);
                if (requestExists) {
                    console.log(`[AdminSync] Admin didn't respond, falling back to calculated sync for ${newUserId}`);
                    await this.redisClient.del(`admin-sync-request:${requestId}`);
                    await this.sendCurrentTimestampToUser(spaceId, newUserId);
                }
            }, 3000);

        } catch (error) {
            console.error(`[AdminSync] Error requesting admin timestamp:`, error);
            // Fallback to regular sync
            await this.sendCurrentTimestampToUser(spaceId, newUserId);
        }
    }

    // Handle admin's response with their current timestamp
    async handleAdminTimestampResponse(requestId: string, adminCurrentTime: number, adminIsPlaying: boolean, respondingUserId: string) {
        try {
            const requestData = await this.redisClient.get(`admin-sync-request:${requestId}`);
            if (!requestData) {
                console.log(`[AdminSync] Request ${requestId} expired or already handled`);
                return;
            }

            const { spaceId, newUserId, requestedAt } = JSON.parse(requestData);
            
            // Clean up the request
            await this.redisClient.del(`admin-sync-request:${requestId}`);

            // Verify the response is from the actual admin
            const space = this.spaces.get(spaceId);
            if (!space || space.creatorId !== respondingUserId) {
                console.log(`[AdminSync] Response from non-admin user, ignoring`);
                return;
            }

            const newUser = this.users.get(newUserId);
            if (!newUser) {
                console.log(`[AdminSync] New joiner ${newUserId} no longer connected`);
                return;
            }

            // Calculate network delay compensation
            const responseDelay = Date.now() - requestedAt;
            const compensatedTime = adminCurrentTime + (responseDelay / 1000); // Add network delay in seconds

            console.log(`[AdminSync] Syncing new joiner ${newUserId} to admin's timestamp:`, {
                adminTime: adminCurrentTime,
                responseDelay,
                compensatedTime,
                adminIsPlaying
            });

            // Send the exact timestamp to the new joiner only
            newUser.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "admin-timestamp-sync",
                        data: {
                            currentTime: compensatedTime,
                            isPlaying: adminIsPlaying,
                            timestamp: Date.now(),
                            songId: space.playbackState.currentSong?.id,
                            totalDuration: space.playbackState.currentSong?.duration,
                            isInitialSync: true,
                            syncSource: "admin-realtime"
                        }
                    }));
                }
            });

            console.log(`[AdminSync] ✅ Successfully synced new joiner ${newUserId} to admin's real-time position`);

        } catch (error) {
            console.error(`[AdminSync] Error handling admin timestamp response:`, error);
        }
    }

    // Chat message broadcasting
    async broadcastChatMessage(
        spaceId: string, 
        userId: string, 
        message: string, 
        username: string, 
        userImage?: string, 
        timestamp?: number
    ) {
        try {
            const space = this.spaces.get(spaceId);
            if (!space) {
                console.log(`[Chat] Space ${spaceId} not found`);
                return;
            }

            // Get user info to determine if they're admin
            const user = this.users.get(userId);
            const isAdmin = space.creatorId === userId;

            // Sanitize message (basic protection)
            const sanitizedMessage = message.trim().substring(0, 500); // Max 500 chars
            
            if (!sanitizedMessage) {
                console.log(`[Chat] Empty message from user ${userId}, ignoring`);
                return;
            }

            const chatData = {
                id: `${Date.now()}-${userId}-${Math.random()}`,
                userId,
                username: username || 'Unknown User',
                message: sanitizedMessage,
                timestamp: timestamp || Date.now(),
                userImage: userImage || '',
                isAdmin,
                spaceId
            };

            console.log(`[Chat] Broadcasting message from ${username} (${userId}) in space ${spaceId}: "${sanitizedMessage.substring(0, 50)}${sanitizedMessage.length > 50 ? '...' : ''}"`);

            // Broadcast to all users in the space
            space.users.forEach((spaceUser) => {
                spaceUser.ws.forEach((ws: WebSocket) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: "chat-message",
                            data: chatData
                        }));
                    }
                });
            });

            console.log(`[Chat] Message broadcasted to ${space.users.size} users in space ${spaceId}`);

        } catch (error) {
            console.error(`[Chat] Error broadcasting chat message:`, error);
        }
    }
    destroySpace(spaceId: string) {
        try {
            this.stopTimestampBroadcast(spaceId);
            
            this.spaces.delete(spaceId);
            
            return true;
        } catch (error) {
            console.error(`Error destroying space ${spaceId}:`, error);
            return false;
        }
    }

    async leaveRoom(spaceId: string, userId: string) {
        try {
            const space = this.spaces.get(spaceId);
            const user = this.users.get(userId);

            if (!space || !user) {
                return false;
            }

            // Check if the leaving user is the admin/creator
            const isAdmin = space.creatorId === userId;

            space.users.delete(userId);

            if (space.users.size === 0) {
                this.stopTimestampBroadcast(spaceId);
                this.destroySpace(spaceId);
            } else if (isAdmin) {
                // Admin is leaving but there are still users in the space
                console.log(`[RoomManager] Admin ${userId} leaving space ${spaceId}, broadcasting space end`);
                
                // Broadcast space ended message to remaining users
                space.users.forEach((user) => {
                    user.ws.forEach((userWs: WebSocket) => {
                        if (userWs.readyState === WebSocket.OPEN) {
                            userWs.send(JSON.stringify({
                                type: "space-ended",
                                data: {
                                    spaceId,
                                    reason: "admin-left",
                                    message: "The space admin has left. You can create a new space or join another one."
                                }
                            }));
                        }
                    });
                });
                
                // Clean up the space since admin left
                this.stopTimestampBroadcast(spaceId);
                this.destroySpace(spaceId);
                
                // Clear Redis data for this space
                try {
                    await this.clearRedisQueue(spaceId);
                    await this.redisClient.del(`currentSong:${spaceId}`);
                    await this.redisClient.del(`spaceImage:${spaceId}`);
                    await this.redisClient.del(`spaceName:${spaceId}`);
                } catch (error) {
                    console.error(`Error clearing Redis data for space ${spaceId}:`, error);
                }
            } else {
                // Regular user leaving, just broadcast user update
                await this.broadcastUserUpdate(spaceId);
            }

            return true;
        } catch (error) {
            console.error(`Error in leaveRoom:`, error);
            return false;
        }
    }

    async disconnect(ws: WebSocket) {
        const spaceId = this.wsToSpace.get(ws);
        
        this.wsToSpace.delete(ws);
        
        let disconnectedUserId: string | null = null;
        this.users.forEach((user, userId) => {
            const wsIndex = user.ws.indexOf(ws);
            if (wsIndex !== -1) {
                disconnectedUserId = userId;
                user.ws.splice(wsIndex, 1);
                
                if (user.ws.length === 0) {
                    this.users.delete(userId);
                }
            }
        });
        
        if (spaceId && disconnectedUserId) {
            const space = this.spaces.get(spaceId);
            if (space) {
                // Check if the disconnected user was the admin/creator
                const wasAdmin = space.creatorId === disconnectedUserId;
                
                space.users.delete(disconnectedUserId);
                
                if (space.users.size === 0) {
                    this.stopTimestampBroadcast(spaceId);
                } else {
                    // If admin left and there are still users, broadcast admin leave event
                    if (wasAdmin) {
                        console.log(`[RoomManager] Admin ${disconnectedUserId} left space ${spaceId}, broadcasting space end`);
                        
                        // Broadcast space ended message to remaining users
                        space.users.forEach((user) => {
                            user.ws.forEach((userWs: WebSocket) => {
                                if (userWs.readyState === WebSocket.OPEN) {
                                    userWs.send(JSON.stringify({
                                        type: "space-ended",
                                        data: {
                                            spaceId,
                                            reason: "admin-left",
                                            message: "The space admin has left. You can create a new space or join another one."
                                        }
                                    }));
                                }
                            });
                        });
                        
                        // Clean up the space since admin left
                        this.stopTimestampBroadcast(spaceId);
                        this.destroySpace(spaceId);
                        
                        // Clear Redis data for this space
                        try {
                            await this.clearRedisQueue(spaceId);
                            await this.redisClient.del(`currentSong:${spaceId}`);
                            await this.redisClient.del(`spaceImage:${spaceId}`);
                            await this.redisClient.del(`spaceName:${spaceId}`);
                        } catch (error) {
                            console.error(`Error clearing Redis data for space ${spaceId}:`, error);
                        }
                    } else {
                        // Regular user left, just broadcast user update
                        await this.broadcastUserUpdate(spaceId);
                    }
                }
            }
        }
    }
    async sendRoomInfoToUser(spaceId: string, userId: string) {
        const user = this.users.get(userId);
        const space = this.spaces.get(spaceId);
        
        if (!user || !space) return;
        
        const spaceName = await this.getSpaceName(spaceId);
        const roomInfo = {
            spaceId,
            spaceName,
            creatorId: space.creatorId,
            userCount: space.users.size,
            isCreator: userId === space.creatorId
        };
        
        user.ws.forEach((ws: WebSocket) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: "room-info",
                    data: roomInfo
                }));
            }
        });
    }

    async broadcastUserUpdate(spaceId: string) {
        const space = this.spaces.get(spaceId);
        if (!space) return;
        
        const userList = Array.from(space.users.keys());
        
        const spaceName = await this.getSpaceName(spaceId);
        
        
        const userDetails = await Promise.all(
            userList.map(async (userId) => {
                const userInfo = await this.getUserInfo(userId);
                console.log("User Infoooo 🥶🥶🥶🥶", userInfo);
                return {
                    userId,
                    name: userInfo?.name || `User ${userId.slice(0, 8)}`,
                    imageUrl: userInfo?.pfpUrl || '',
                    isCreator: userId === space.creatorId
                };
            })
        );
        space.users.forEach((user, userId) => {
            user.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "user-update",
                        data: {
                            spaceName,
                            userCount: space.users.size,
                            userDetails: userDetails,
                            users: userList,
                            connectedUsers: space.users.size
                        }
                    }));
                }
            });
        });
    }

    async sendCurrentQueueToUser(spaceId: string, userId: string) {
        const user = this.users.get(userId);
        if (!user) return;
        
        try {
            const queue = await this.getRedisQueue(spaceId);
            
            const queueWithVotes = await Promise.all(
                queue.map(async (song) => ({
                    ...song,
                    voteCount: await this.getSongVoteCount(spaceId, song.id)
                }))
            );
            
            user.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "current-queue",
                        data: { queue: queueWithVotes }
                    }));
                }
            });
        } catch (error) {
            console.error("Error sending current Redis queue to user:", error);
        }
    }

    async sendCurrentPlayingSongToUser(spaceId: string, userId: string) {
        const user = this.users.get(userId);
        const space = this.spaces.get(spaceId);
        if (!user || !space) return;
        
        try {
            // First check in-memory playback state
            let currentSong = null;
            let isPlaying = false;
            let currentTime = 0;
            
            if (space.playbackState.currentSong) {
                // Get current song from in-memory state
                const now = Date.now();
                const { playbackState } = space;
                const currentSongState = playbackState.currentSong; // Store reference for null safety
                
                if (!currentSongState) {
                    // Double check - if null, skip to Redis fallback
                    const redisSong = await this.getCurrentPlayingSong(spaceId);
                    if (redisSong) {
                        currentSong = {
                            ...redisSong,
                            voteCount: await this.getSongVoteCount(spaceId, redisSong.id)
                        };
                    }
                } else {
                    if (playbackState.startedAt > 0) {
                        if (playbackState.isPlaying) {
                            currentTime = (now - playbackState.startedAt) / 1000;
                        } else if (playbackState.pausedAt) {
                            currentTime = (playbackState.pausedAt - playbackState.startedAt) / 1000;
                        }
                    }
                    
                    // Get full song data from Redis to ensure we have all details including images
                    const redisSong = await this.getCurrentPlayingSong(spaceId);
                    
                    currentSong = {
                        id: currentSongState.id,
                        title: currentSongState.title,
                        artist: currentSongState.artist,
                        url: currentSongState.url,
                        duration: currentSongState.duration,
                        extractedId: currentSongState.extractedId,
                        // Include image data from Redis if available
                        smallImg: redisSong?.smallImg || '',
                        bigImg: redisSong?.bigImg || '',
                        userId: redisSong?.userId || '',
                        addedByUser: redisSong?.addedByUser || 'Unknown',
                        source: redisSong?.source || 'Youtube',
                        addedAt: redisSong?.addedAt || Date.now(),
                        voteCount: await this.getSongVoteCount(spaceId, currentSongState.id)
                    };
                    
                    isPlaying = playbackState.isPlaying;
                }
            } else {
                // Fallback to Redis if no in-memory state
                const redisSong = await this.getCurrentPlayingSong(spaceId);
                if (redisSong) {
                    currentSong = {
                        ...redisSong,
                        voteCount: await this.getSongVoteCount(spaceId, redisSong.id)
                    };
                }
            }
            
            if (currentSong) {
                const songData = {
                    ...currentSong,
                    addedByUser: {
                        id: currentSong.userId,
                        name: currentSong.addedByUser
                    }
                };
                
                console.log(`[CurrentSong] Sending current song to new user ${userId}:`, {
                    songId: currentSong.id,
                    title: currentSong.title,
                    hasImages: !!(currentSong.smallImg || currentSong.bigImg),
                    isPlaying: isPlaying,
                    currentTime: Math.max(0, currentTime)
                });
                
                user.ws.forEach((ws: WebSocket) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: "current-song-update",
                            data: { 
                                song: songData,
                                playbackState: {
                                    isPlaying: isPlaying,
                                    currentTime: Math.max(0, currentTime),
                                    timestamp: Date.now()
                                }
                            }
                        }));
                    }
                });
                
                // Also send image update separately to ensure it's received
                const imageUrl = currentSong.bigImg || currentSong.smallImg;
                if (imageUrl) {
                    user.ws.forEach((ws: WebSocket) => {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({
                                type: "space-image-response",
                                data: { 
                                    spaceId: spaceId,
                                    imageUrl: imageUrl
                                }
                            }));
                        }
                    });
                }
            } else {
                console.log(`[CurrentSong] No current song found for space ${spaceId}`);
            }
        } catch (error) {
            console.error("Error sending current playing song to user:", error);
        }
    }

    async broadcastQueueUpdate(spaceId: string) {
        const space = this.spaces.get(spaceId);
        if (!space) return;
        
        try {
            const queue = await this.getRedisQueue(spaceId);
            
            const queueWithVotes = await Promise.all(
                queue.map(async (song) => ({
                    ...song,
                    voteCount: await this.getSongVoteCount(spaceId, song.id)
                }))
            );
            
            space.users.forEach((user, userId) => {
                user.ws.forEach((ws: WebSocket) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: "queue-update",
                            data: { queue: queueWithVotes }
                        }));
                    }
                });
            });
        } catch (error) {
            console.error("Error broadcasting queue update:", error);
        }
    }


    // Add song to Redis queue
    async addSongToRedisQueue(spaceId: string, song: QueueSong): Promise<void> {
        try {
            const queueKey = `queue:${spaceId}`;
            const songData = JSON.stringify(song);
            
            await this.redisClient.rPush(queueKey, songData);
            const songKey = `song:${song.id}`;
            
            // Ensure all values are strings and handle null/undefined values
            await this.redisClient.hSet(songKey, {
                id: String(song.id || ''),
                title: String(song.title || ''),
                artist: String(song.artist || ''),
                url: String(song.url || ''),
                extractedId: String(song.extractedId || ''),
                source: String(song.source || 'Youtube'),
                smallImg: String(song.smallImg || ''),
                bigImg: String(song.bigImg || ''),
                userId: String(song.userId || ''),
                addedByUser: String(song.addedByUser || ''),
                addedAt: String(song.addedAt || Date.now()),
                voteCount: String(song.voteCount || 0),
                duration: String(song.duration || 0),
                spotifyId: String(song.spotifyId || ''),
                youtubeId: String(song.youtubeId || '')
            });

            // Set expiration for song data (24 hours)
            await this.redisClient.expire(songKey, EXPIRY_SECONDS);
        } catch (error) {
            console.error('Error adding song to Redis queue:', error);
            throw error;
        }
    }
     
async getSongById(spaceId: string, songId: string): Promise<QueueSong | null> {
  try {
    const queueKey = `queue:${spaceId}`;
    const songDataList = await this.redisClient.lRange(queueKey, 0, -1);

    let targetSongRaw: string | null = null;
    const songs: QueueSong[] = [];

    for (const songData of songDataList) {
      try {
        const song = JSON.parse(songData) as QueueSong;
        songs.push(song);

        if (song.id === songId) {
          targetSongRaw = songData; // Save raw JSON string for LREM
        }
      } catch (parseError) {
        console.error('Error parsing song data from Redis:', parseError);
      }
    }

    if (!targetSongRaw) {
      return null; // song not found
    }

    await this.redisClient.lRem(queueKey, 1, targetSongRaw);

    const deletedSong = JSON.parse(targetSongRaw) as QueueSong;
    return deletedSong;

  } catch (err: any) {
    console.error("Error getting or deleting the song from Redis:", err);
    return null;
  }
}

    async getRedisQueue(spaceId: string): Promise<QueueSong[]> {
        try {
            const queueKey = `queue:${spaceId}`;
            const songDataList = await this.redisClient.lRange(queueKey, 0, -1);
            
            const songs: QueueSong[] = [];
            for (const songData of songDataList) {
                try {
                    const song = JSON.parse(songData) as QueueSong;
                    songs.push(song);
                } catch (parseError) {
                    console.error('Error parsing song data from Redis:', parseError);
                }
            }
            
            const songsWithVotes = await Promise.all(
                songs.map(async (song) => ({
                    ...song,
                    voteCount: await this.getSongVoteCount(spaceId, song.id)
                }))
            );
            
            songsWithVotes.sort((a, b) => {
                if (b.voteCount !== a.voteCount) {
                    return b.voteCount - a.voteCount; // Higher votes first
                }
                return a.addedAt - b.addedAt; // Earlier added songs first if votes are equal
            });
            
            // Return sorted songs with vote counts
            return songsWithVotes;
        } catch (error) {
            console.error('Error getting Redis queue:', error);
            return [];
        }
    }

    async getNextSongFromRedisQueue(spaceId: string): Promise<QueueSong | null> {
        try {
            
            const sortedQueue = await this.getRedisQueue(spaceId);
            
            if (sortedQueue.length === 0) {
                console.log("📭 Queue is empty, no songs to play");
                return null;
            }
            
            const nextSong = sortedQueue[0];
        
            await this.removeSongFromRedisQueue(spaceId, nextSong.id);
            
            return nextSong;
        } catch (error) {
            console.error('Error getting next song from Redis queue:', error);
            return null;
        }
    }

    async removeSongFromRedisQueue(spaceId: string, songId: string): Promise<boolean> {
        try {
            const queueKey = `queue:${spaceId}`;
            const songDataList = await this.redisClient.lRange(queueKey, 0, -1);
            
            for (let i = 0; i < songDataList.length; i++) {
                try {
                    const song = JSON.parse(songDataList[i]) as QueueSong;
                    if (song.id === songId) {
                        const tempKey = `temp:${Date.now()}`;
                        await this.redisClient.lSet(queueKey, i, tempKey);
                        await this.redisClient.lRem(queueKey, 1, tempKey);
                        
                        await this.redisClient.del(`song:${songId}`);
                        
                        return true;
                    }
                } catch (parseError) {
                    console.error('Error parsing song for removal:', parseError);
                }
            }
            
            return false;
        } catch (error) {
            console.error('Error removing song from Redis queue:', error);
            return false;
        }
    }

    async clearRedisQueue(spaceId: string): Promise<void> {
        try {
            const queueKey = `queue:${spaceId}`;
            
            const songs = await this.getRedisQueue(spaceId);
            for (const song of songs) {
                await this.redisClient.del(`song:${song.id}`);
            }
            
            await this.redisClient.del(queueKey);
        } catch (error) {
            console.error('Error clearing Redis queue:', error);
        }
    }

    async getRedisQueueLength(spaceId: string): Promise<number> {
        try {
            const queueKey = `queue:${spaceId}`;
            return await this.redisClient.lLen(queueKey);
        } catch (error) {
            console.error('Error getting Redis queue length:', error);
            return 0;
        }
    }

    async setCurrentPlayingSong(spaceId: string, song: QueueSong): Promise<void> {
        try {
            const currentKey = `current:${spaceId}`;
            await this.redisClient.set(currentKey, JSON.stringify(song), { EX: EXPIRY_SECONDS }); // 24 hour expiry
        } catch (error) {
            console.error('Error setting current playing song:', error);
        }
    }

    async getCurrentPlayingSong(spaceId: string): Promise<QueueSong | null> {
        try {
            const currentKey = `current:${spaceId}`;
            const songData = await this.redisClient.get(currentKey);
            
            if (!songData) {
                return null;
            }
            
            return JSON.parse(songData) as QueueSong;
        } catch (error) {
            console.error('Error getting current playing song:', error);
            return null;
        }
    }

    async getCurrentSpaceImage(spaceId: string): Promise<string | null> {
        try {
            // First check in-memory state for current song
            const space = this.spaces.get(spaceId);
            if (space?.playbackState.currentSong) {
                // Check if we have image in in-memory state, but get from Redis for full data
                const currentSong = await this.getCurrentPlayingSong(spaceId);
                if (currentSong && (currentSong.bigImg || currentSong.smallImg)) {
                    console.log(`[SpaceImage] Found image from current song: ${currentSong.title}`);
                    return currentSong.bigImg || currentSong.smallImg;
                }
            }
            
            // Fallback to Redis current song
            const currentSong = await this.getCurrentPlayingSong(spaceId);
            if (currentSong && (currentSong.bigImg || currentSong.smallImg)) {
                console.log(`[SpaceImage] Found image from Redis current song: ${currentSong.title}`);
                return currentSong.bigImg || currentSong.smallImg;
            }
            
            // Last resort: check the queue
            const queue = await this.getRedisQueue(spaceId);
            if (queue.length > 0 && (queue[0].bigImg || queue[0].smallImg)) {
                console.log(`[SpaceImage] Found image from queue first song: ${queue[0].title}`);
                return queue[0].bigImg || queue[0].smallImg;
            }
            
            console.log(`[SpaceImage] No image found for space ${spaceId}`);
            return null;
        } catch (error) {
            console.error('Error getting current space image:', error);
            return null;
        }
    }

    async voteOnSongRedis(spaceId: string, songId: string, userId: string, voteType: 'upvote' | 'downvote'): Promise<number> {
        try {
            const votesKey = `votes:${spaceId}:${songId}`;
            const userVoteKey = `uservote:${spaceId}:${userId}`;
        
            const existingVote = await this.redisClient.get(userVoteKey);
            
            if (existingVote === songId) {
                await this.redisClient.zRem(votesKey, userId);
                await this.redisClient.del(userVoteKey);
            } else {
                // Add new vote
                const score = voteType === 'upvote' ? 1 : -1;
                await this.redisClient.zAdd(votesKey, { score, value: userId });
                await this.redisClient.set(userVoteKey, songId, { EX: EXPIRY_SECONDS });
            }
            
            const voteCount = await this.redisClient.zCard(votesKey);
            
            await this.reorderQueueByVotes(spaceId);
            
            return voteCount;
        } catch (error) {
            console.error('Error voting on song:', error);
            return 0;
        }
    }

    async getSongVoteCount(spaceId: string, songId: string): Promise<number> {
        try {
            const votesKey = `votes:${spaceId}:${songId}`;
            return await this.redisClient.zCard(votesKey);
        } catch (error) {
            console.error('Error getting song vote count:', error);
            return 0;
        }
    }

    async reorderQueueByVotes(spaceId: string): Promise<void> {
        try {
            console.log(`🔄 Reordering queue for space ${spaceId} by vote count`);
            
            const queueKey = `queue:${spaceId}`;
            const songDataList = await this.redisClient.lRange(queueKey, 0, -1);
            
            if (songDataList.length === 0) {
                console.log(`📭 Queue is empty for space ${spaceId}, nothing to reorder`);
                return;
            }
            
            const songs: Omit<QueueSong, 'voteCount'>[] = [];
            for (const songData of songDataList) {
                try {
                    const song = JSON.parse(songData) as Omit<QueueSong, 'voteCount'>;
                    songs.push(song);
                } catch (parseError) {
                    console.error('Error parsing song data from Redis:', parseError);
                }
            }
            const songsWithVotes = await Promise.all(
                songs.map(async (song) => ({
                    ...song,
                    voteCount: await this.getSongVoteCount(spaceId, song.id)
                }))
            );
            
            songsWithVotes.sort((a, b) => {
                if (b.voteCount !== a.voteCount) {
                    return b.voteCount - a.voteCount; // Higher votes first
                }
                return a.addedAt - b.addedAt;
            });
            
            console.log(`🔄 Reordered queue:`, songsWithVotes.map(s => ({
                title: s.title,
                votes: s.voteCount,
                addedAt: new Date(s.addedAt).toISOString()
            })));
            
            // Clear the current queue
            await this.redisClient.del(queueKey);
            
            for (const song of songsWithVotes) {
                const { voteCount, ...songToStore } = song;
                await this.redisClient.rPush(queueKey, JSON.stringify(songToStore));
            }
            
            console.log(` Successfully reordered queue for space ${spaceId}`);
        } catch (error) {
            console.error(`❌ Error reordering queue for space ${spaceId}:`, error);
        }
    }

    async addToQueueRedis(spaceId: string, userId: string, url: string, trackData?: any, autoPlay?: boolean): Promise<void> {
        
        const space = this.spaces.get(spaceId);
        const currentUser = this.users.get(userId);
        
        if (!space || !currentUser) {
            return;
        }

        if (!this.musicSourceManager.validateUrl(url)) {
            currentUser?.ws.forEach((ws) => {
                ws.send(JSON.stringify({
                    type: "error",
                    data: { message: "Invalid music URL. Supported: YouTube, Spotify" }
                }));
            });
            return;
        }

        const queueLength = await this.getRedisQueueLength(spaceId);
        if (queueLength >= MAX_QUEUE_LENGTH) {
            currentUser?.ws.forEach((ws) => {
                ws.send(JSON.stringify({
                    type: "error",
                    data: { message: `Queue is full. Maximum ${MAX_QUEUE_LENGTH} songs allowed.` }
                }));
            });
            return;
        }
        const trackDetails = await this.musicSourceManager.getTrackDetails(url);
        if (!trackDetails) {
            currentUser?.ws.forEach((ws) => {
                ws.send(JSON.stringify({
                    type: "error",
                    data: { message: "Could not fetch track details" }
                }));
            });
            return;
        }
        const primaryImage = trackData?.image || trackDetails.smallImg || '';
        const secondaryImage = trackData?.image || trackDetails.bigImg || '';
        console.log("Artists 😎😎" , trackData.artist)
        const queueSong: QueueSong = {
            id: crypto.randomUUID(),
            title: trackData.title || 'Unknown Title',
            artist: trackData.artist || 'Unknown Artist',
            album: trackDetails.album || '',
            url: trackDetails.url || '',
            extractedId: trackDetails.extractedId || '',
            source: (trackDetails.source as 'Youtube' | 'Spotify') || 'Youtube',
            smallImg: primaryImage,
            bigImg: secondaryImage,
            addedByUser: trackData.addedByUser || 'Unknown',
            userId: userId,
            addedAt: Date.now(),
            duration: trackDetails.duration || 0,
            voteCount: 0,
            spotifyId: trackDetails.source === 'Spotify' ? (trackDetails.extractedId || '') : '',
            youtubeId: trackDetails.source === 'Youtube' ? (trackDetails.extractedId || '') : ''
        };

        // Add to Redis queue
        await this.addSongToRedisQueue(spaceId, queueSong);

        if (space) {
            const songData = {
                ...queueSong,
                voteCount: 0,
                addedByUser: {
                    id: userId,
                    name: currentUser.name 
                }
            };

            space.users.forEach((user) => {
                user.ws.forEach((ws: WebSocket) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: "song-added",
                            data: { 
                                song: songData,
                                autoPlay: autoPlay || false
                            }
                        }));
                    }
                });
            });
        }
        const currentPlaying = await this.getCurrentPlayingSong(spaceId);
        
        if ((queueLength === 0 || autoPlay) && !currentPlaying) {
            await this.playNextFromRedisQueue(spaceId, userId);
        }
    }

    async playSong(spaceId : string , songId : string | undefined){

        try{

                   const space = this.spaces.get(spaceId);
                 if (!space || !songId) {
            return;
        }
            const song = await this.getSongById(spaceId , songId)
            if(!song){
                console.log(`No Song Found by this ${songId} `)

                return null
            }
               await this.setCurrentPlayingSong(spaceId, song);

        const now = Date.now();
        space.playbackState = {
            currentSong: {
                id: song.id,
                title: song.title,
                artist: song.artist,
                url: song.url,
                duration: song.duration,
                extractedId: song.extractedId
            },
            startedAt: 0, // Will be set when admin starts playback
            pausedAt: null,
            isPlaying: false, // Always start paused
            lastUpdated: now
        };

        const voteCount = await this.getSongVoteCount(spaceId, song.id);

        const songData = {
            ...song,
            voteCount: voteCount,
            addedByUser: {
                id: song.userId,
                name: song.addedByUser // We might need to get this from database or Redis
            }
        };

        space.users.forEach((user) => {
            user.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "current-song-update",
                        data: { song: songData }
                    }));
                }
            });
        });

        await this.broadcastImageUpdate(spaceId);

        this.startTimestampBroadcast(spaceId);
        } catch(err ) {
            console.error("Error playing the song",err)
        }
    }
    async playNextFromRedisQueue(spaceId: string, userId: string): Promise<void> {        
        const space = this.spaces.get(spaceId);
        
        if (!space) {
            return;
        }

        const nextSong = await this.getNextSongFromRedisQueue(spaceId);
      
        if (!nextSong) {
            // Clear current playing song
            await this.redisClient.del(`current:${spaceId}`);
            
            space.playbackState = {
                currentSong: null,
                startedAt: 0,
                pausedAt: null,
                isPlaying: false,
                lastUpdated: Date.now()
            };
            
            space.users.forEach((user) => {
                user.ws.forEach((ws: WebSocket) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: "queue-empty",
                            data: { message: "No more songs in queue" }
                        }));
                    }
                });
            });
            
            await this.broadcastImageUpdate(spaceId);
            return;
        }

        await this.setCurrentPlayingSong(spaceId, nextSong);

        const now = Date.now();
        space.playbackState = {
            currentSong: {
                id: nextSong.id,
                title: nextSong.title,
                artist: nextSong.artist,
                url: nextSong.url,
                duration: nextSong.duration,
                extractedId: nextSong.extractedId
            },
            startedAt: now, // Start immediately for auto-play
            pausedAt: null,
            isPlaying: true, // Auto-start the next song
            lastUpdated: now
        };

        const voteCount = await this.getSongVoteCount(spaceId, nextSong.id);

        const songData = {
            ...nextSong,
            voteCount: voteCount,
            addedByUser: {
                id: nextSong.userId,
                name: nextSong.addedByUser // We might need to get this from database or Redis
            }
        };

        space.users.forEach((user) => {
            user.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "current-song-update",
                        data: { song: songData }
                    }));
                }
            });
        });

        // Send playback-resumed message to auto-start the song
        space.users.forEach((user) => {
            user.ws.forEach((ws: WebSocket) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "playback-resumed",
                        data: { 
                            spaceId, 
                            userId,
                            timestamp: now,
                            autoPlay: true // Flag to indicate this is auto-play
                        }
                    }));
                }
            });
        });

        await this.broadcastImageUpdate(spaceId);

        this.startTimestampBroadcast(spaceId);
    }

    async broadcastRedisQueueUpdate(spaceId: string): Promise<void> {
        const space = this.spaces.get(spaceId);
        if (!space) return;
        
        try {
            const queue = await this.getRedisQueue(spaceId);
            
            const queueWithVotes = await Promise.all(
                queue.map(async (song) => ({
                    ...song,
                    voteCount: await this.getSongVoteCount(spaceId, song.id)
                }))
            );
            
            space.users.forEach((user, userId) => {
                user.ws.forEach((ws: WebSocket) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: "queue-update",
                            data: { queue: queueWithVotes }
                        }));
                    }
                });
            });
        } catch (error) {
            console.error("Error broadcasting Redis queue update:", error);
        }
    }

    async broadcastImageUpdate(spaceId: string): Promise<void> {
        try {
            const imageUrl = await this.getCurrentSpaceImage(spaceId);
            
            const space = this.spaces.get(spaceId);
            if (!space) {
                return;
            }
            
            space.users.forEach((user, userId) => {
                user.ws.forEach((ws: WebSocket) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: "space-image-update",
                            data: {
                                spaceId,
                                imageUrl
                            }
                        }));
                    }
                });
            });
            
            console.log(`🖼️ Broadcasted image update for space ${spaceId}: ${imageUrl || "No image"}`);
        } catch (error) {
            console.error('Error broadcasting image update:', error);
        }
    }
    
  
    async broadcastDiscordActivity(spaceId: string, songData: any) {
      const space = this.spaces.get(spaceId);
      if (!space) {
        console.warn(`Cannot broadcast Discord activity: Space ${spaceId} not found`);
        return;
      }

      space.users.forEach((user) => {
        user.ws.forEach((ws) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'discord-activity-update',
              data: {
                title: songData.title,
                artist: songData.artist,
                albumArt: songData.image,
                duration: songData.duration,
                startTime: songData.startTime || Date.now(),
                spaceId: spaceId,
                spaceName: songData.spaceName
              }
            }));
          }
        });
      });
      
      console.log(`Discord activity broadcast for ${songData.title} by ${songData.artist} in space ${spaceId}`);
    }
    
    async setSpaceName(spaceId: string, spaceName: string): Promise<void> {
        try {
            await this.redisClient.set(
                `space-details-${spaceId}`,
                JSON.stringify({ name: spaceName }),
                { EX: EXPIRY_SECONDS } // Cache for 24 hours
            );
        } catch (error) {
            console.error(`Error setting space name for ${spaceId}:`, error);
        }
    }

    // Helper method to get space name from Redis cache
    async getSpaceName(spaceId: string): Promise<string> {
        // try {
            const cachedSpaceDetails = await this.redisClient.get(`space-details-${spaceId}`);
            
            // if (cachedSpaceDetails) {
                const spaceData = JSON.parse(cachedSpaceDetails!);
                console.log("Getting space name from Redis cache. 💢💢", spaceData.name);
                return spaceData.name ;
            // }
            // return spaceData.name as string; 
        // } catch (error) {
        //     console.error(`Error getting space name for ${spaceId}:`, error);
        // }
        // return "Unknown Space";
    }

    private decodeUserToken(token: string): { userId: string; username?: string; email?: string; name?: string } | null {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
            return {
                
                userId: decoded.userId,
                username: decoded.username,
                email: decoded.email,
                name: decoded.name
            };
        } catch (error) {
            console.error('Error decoding JWT token:', error);
            return null;
        }
    }

    // Helper method to store user info in Redis
    async storeUserInfo(userId: string, userInfo: { username?: string; email?: string; name?: string, pfpUrl?: string }): Promise<void> {
        try {
            console.log("Storing user info in Redis cache...🤣🤣🤣", userInfo);
            await this.redisClient.set(
                `user-info-${userId}`,
                JSON.stringify(userInfo),
                { EX: EXPIRY_SECONDS } // Cache for 24 hours
            );
        } catch (error) {
            console.error(`Error storing user info for ${userId}:`, error);
        }
    }

    // Helper method to get user info from Redis
    // Handle latency feedback from frontend - simplified version
    async reportLatency(spaceId: string, userId: string, latency: number) {
        const space = this.spaces.get(spaceId);
        if (!space) {
            console.log(`[Latency] Space ${spaceId} not found for latency report`);
            return;
        }

        // Just log latency for monitoring - no complex adaptive logic
        console.log(`[Latency] User ${userId} in space ${spaceId} reported ${latency}ms latency`);
    }

    async getUserInfo(userId: string): Promise<{ username?: string; email?: string; name?: string, pfpUrl?: string } | null> {
        try {
            const userInfo = await this.redisClient.get(`user-info-${userId}`);
            if (userInfo) {
                console.log("Getting user info from Redis cache...🤣🤣🤣", userInfo);
                return JSON.parse(userInfo);
                
            }
            
        } catch (error) {
            console.error(`Error getting user info for ${userId}:`, error);
        }
        return null;
    }

}