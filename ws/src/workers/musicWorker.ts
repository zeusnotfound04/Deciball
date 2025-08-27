import { parentPort, workerData } from 'worker_threads';
import { SpotifyHandler } from '../handlers/SpotifyHandler';
import { YoutubeHandler } from '../handlers/YoutubeHandler';
import { MusicTrack, MusicSource } from '../types';

interface WorkerMessage {
    taskId: string;
    type: string;
    data: any;
}

interface WorkerResponse {
    taskId: string;
    success: boolean;
    data?: any;
    error?: string;
    processingTime: number;
    workerId: string;
}

interface SongData {
    source: string;
    query?: string;
    extractedId?: string;
    url?: string;
    batchIndex?: number;
    batchTotal?: number;
    batchId?: string;
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
}

interface BatchData {
    songs: SongData[];
    batchId: string;
}

interface ProcessedSong extends Partial<MusicTrack> {
    error?: string;
    fetchedAt: number;
    fetchedBy: string;
    originalQuery?: string;
    originalUrl?: string;
    processingSource?: string;
    failed?: boolean;
    batchIndex?: number;
    batchId?: string;
    // Ensure these are properly typed
    id?: string;
    source?: MusicSource;
    extractedId?: string;
}

interface ExtractedMetadata {
    source: string;
    extractedId: string;
    originalQuery?: string;
    originalUrl?: string;
    isValid: boolean;
    extractedAt: number;
    extractedBy: string;
    thumbnails?: {
        small: string;
        large: string;
    };
    videoUrl?: string;
    error?: string;
    failed?: boolean;
}

class MusicWorker {
    private workerId: string;
    private spotifyHandler: SpotifyHandler;
    private youtubeHandler: YoutubeHandler;
    private startTime: number;
    private tasksProcessed: number;
    constructor() {
        this.workerId = workerData?.workerId || 'unknown';
        this.spotifyHandler = new SpotifyHandler();
        this.youtubeHandler = new YoutubeHandler();
        this.startTime = Date.now();
        this.tasksProcessed = 0;
        
        this.setupMessageHandler();
        console.log(`[MusicWorker-${this.workerId}] ✅ Worker initialized and ready`);
    }

    setupMessageHandler() {
        if (!parentPort) {
            console.error(`[MusicWorker-${this.workerId}] ❌ No parent port available`);
            return;
        }

        parentPort.on('message', async (message: WorkerMessage) => {
            const startTime = Date.now();
            
            try {
                const { taskId, type, data } = message;
                
                // Handle health check
                if (type === 'health-check') {
                    parentPort?.postMessage({
                        type: 'health-check-response',
                        workerId: this.workerId,
                        uptime: Date.now() - this.startTime,
                        tasksProcessed: this.tasksProcessed
                    });
                    return;
                }

                console.log(`[MusicWorker-${this.workerId}] 🚀 Processing task ${taskId} (${type})`);
                
                let result;
                switch (type) {
                    case 'fetch-song-details':
                        result = await this.fetchSongDetails(data);
                        break;
                    
                    case 'verify-song':
                        result = await this.verifySong(data);
                        break;
                    
                    case 'extract-metadata':
                        result = await this.extractMetadata(data);
                        break;
                    
                    case 'batch-process':
                        result = await this.processBatch(data);
                        break;
                    
                    default:
                        throw new Error(`Unknown task type: ${type}`);
                }

                const processingTime = Date.now() - startTime;
                this.tasksProcessed++;

                parentPort?.postMessage({
                    taskId,
                    success: true,
                    data: result,
                    processingTime,
                    workerId: this.workerId
                });

                console.log(`[MusicWorker-${this.workerId}] ✅ Task ${taskId} completed (${processingTime}ms)`);
                
            } catch (error) {
                const processingTime = Date.now() - startTime;
                const errorMessage = error instanceof Error ? error.message : String(error);
                
                console.error(`[MusicWorker-${this.workerId}] ❌ Task ${message.taskId} failed:`, errorMessage);
                
                parentPort?.postMessage({
                    taskId: message.taskId,
                    success: false,
                    error: errorMessage,
                    processingTime,
                    workerId: this.workerId
                });
            }
        });

        parentPort.on('error', (error) => {
            console.error(`[MusicWorker-${this.workerId}] ❌ Parent port error:`, error);
        });
    }

    async fetchSongDetails(songData: SongData): Promise<ProcessedSong> {
        const { source, query, extractedId, url, batchIndex, batchTotal, completeTrackData } = songData;
        
        try {
            console.log(`[MusicWorker-${this.workerId}] 🎵 Processing ${source} song: ${query || extractedId}${batchIndex !== undefined ? ` (${batchIndex + 1}/${batchTotal})` : ''}`);
            
            // If complete track data is provided, use it directly (no API call needed!)
            if (completeTrackData && completeTrackData.title && completeTrackData.extractedId) {
                console.log(`[MusicWorker-${this.workerId}] 🚀 OPTIMIZATION: Using provided track data - SKIPPING YouTube API call!`);
                console.log(`[MusicWorker-${this.workerId}] 📊 Track details: "${completeTrackData.title}" by "${completeTrackData.artist}"`);
                
                const enhancedResult: ProcessedSong = {
                    ...completeTrackData,
                    fetchedAt: Date.now(),
                    fetchedBy: this.workerId,
                    originalQuery: query,
                    originalUrl: url,
                    processingSource: source,
                    // Ensure MusicTrack compatibility
                    id: completeTrackData.id || completeTrackData.extractedId,
                    source: completeTrackData.source as any,
                    extractedId: completeTrackData.extractedId
                };

                console.log(`[MusicWorker-${this.workerId}] ⚡ FAST TRACK: "${completeTrackData.title}" processed instantly (0ms API time)`);
                return enhancedResult;
            }
            
            // Special case: if we have completeTrackData but need to search YouTube for URL
            if (completeTrackData && completeTrackData.title && source.toLowerCase() === 'youtube' && query && !completeTrackData.extractedId) {
                console.log(`[MusicWorker-${this.workerId}] 🔍 Searching YouTube for URL while preserving Spotify metadata: "${completeTrackData.title}"`);
                
                try {
                    const youtubeResult = await this.youtubeHandler.searchTrack(query);
                    
                    if (youtubeResult && youtubeResult.extractedId && youtubeResult.url) {
                        // Merge YouTube URL data with original Spotify metadata
                        const mergedResult: ProcessedSong = {
                            ...completeTrackData, // Keep all Spotify metadata (title, artist, images, etc.)
                            extractedId: youtubeResult.extractedId, // Use YouTube ID for playback
                            url: youtubeResult.url, // Use YouTube URL for playback
                            source: 'Youtube' as any, // Set source as YouTube for playback
                            fetchedAt: Date.now(),
                            fetchedBy: this.workerId,
                            originalQuery: query,
                            originalUrl: url,
                            processingSource: source,
                            id: completeTrackData.id || youtubeResult.extractedId
                        };
                        
                        console.log(`[MusicWorker-${this.workerId}] ✅ YouTube URL found, Spotify metadata preserved: "${completeTrackData.title}" -> ${youtubeResult.extractedId}`);
                        return mergedResult;
                    }
                } catch (searchError) {
                    console.warn(`[MusicWorker-${this.workerId}] ⚠️ YouTube search failed for "${completeTrackData.title}", marking as failed`);
                    
                    // Return failed result with proper typing
                    return {
                        ...completeTrackData,
                        fetchedAt: Date.now(),
                        fetchedBy: this.workerId,
                        originalQuery: query,
                        originalUrl: url,
                        processingSource: source,
                        failed: true,
                        error: 'YouTube search failed',
                        source: completeTrackData.source as any
                    };
                }
            }
            
            // Fallback to API call if no complete data provided
            let handler;
            switch (source.toLowerCase()) {
                case 'spotify':
                    handler = this.spotifyHandler;
                    break;
                case 'youtube':
                    handler = this.youtubeHandler;
                    break;
                default:
                    throw new Error(`Unsupported source: ${source}`);
            }

            // Use extractedId if available, otherwise use query or url
            const identifier = extractedId || query || url;
            if (!identifier) {
                throw new Error('No identifier provided for song');
            }

            console.log(`[MusicWorker-${this.workerId}] 🐌 FALLBACK: No complete data provided - making ${source} API call for: ${identifier}`);
            const apiCallStart = Date.now();
            
            let result;
            // If extractedId is provided, use getTrackDetails for direct lookup
            // If only query is provided, use search method for YouTube
            if (extractedId && extractedId.length > 0) {
                console.log(`[MusicWorker-${this.workerId}] 📋 Using direct lookup with extractedId: ${extractedId}`);
                result = await handler.getTrackDetails(extractedId);
            } else if (source.toLowerCase() === 'youtube' && query) {
                console.log(`[MusicWorker-${this.workerId}] 🔍 Using YouTube search for query: ${query}`);
                // Use search method for YouTube when we have a search query
                if ('searchTrack' in handler && typeof handler.searchTrack === 'function') {
                    result = await (handler as any).searchTrack(query);
                } else {
                    // Fallback to getTrackDetails if searchTrack doesn't exist
                    result = await handler.getTrackDetails(identifier);
                }
            } else {
                console.log(`[MusicWorker-${this.workerId}] 📋 Using standard getTrackDetails for: ${identifier}`);
                result = await handler.getTrackDetails(identifier);
            }
            
            const apiCallTime = Date.now() - apiCallStart;
            
            if (!result) {
                throw new Error(`No track details found for: ${identifier}`);
            }

            console.log(`[MusicWorker-${this.workerId}] 🌐 API call completed in ${apiCallTime}ms for: "${result.title}"`);

            // Add additional metadata
            const enhancedResult = {
                ...result,
                fetchedAt: Date.now(),
                fetchedBy: this.workerId,
                originalQuery: query,
                originalUrl: url,
                processingSource: source
            };

            console.log(`[MusicWorker-${this.workerId}] ✅ Successfully fetched: "${result.title}"`);
            return enhancedResult;
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[MusicWorker-${this.workerId}] ❌ Error fetching ${source} song:`, errorMessage);
            
            // Return partial data if possible
            return {
                error: errorMessage,
                source: source as MusicSource,
                originalQuery: query,
                originalUrl: url,
                extractedId: extractedId || '',
                fetchedAt: Date.now(),
                fetchedBy: this.workerId,
                failed: true
            };
        }
    }

    async verifySong(songData: SongData) {
        const { source, extractedId, url, query } = songData;
        
        try {
            console.log(`[MusicWorker-${this.workerId}] 🔍 Verifying ${source} song availability`);
            
            let handler;
            switch (source.toLowerCase()) {
                case 'spotify':
                    handler = this.spotifyHandler;
                    break;
                case 'youtube':
                    handler = this.youtubeHandler;
                    break;
                default:
                    return { available: false, reason: `Unsupported source: ${source}` };
            }

            const identifier = extractedId || query || url;
            if (!identifier) {
                return { available: false, reason: 'No identifier provided' };
            }

            // For verification, we can do a lighter check
            // This could be extended to ping the service without full data fetch
            if (source.toLowerCase() === 'youtube') {
                const isValid = handler.validateURL ? handler.validateURL(identifier) : true;
                return { 
                    available: isValid, 
                    reason: isValid ? 'Valid format' : 'Invalid URL format',
                    verifiedAt: Date.now()
                };
            }

            // For Spotify or other sources, you might want to do actual verification
            // For now, assume available if we have an ID
            return { 
                available: !!identifier, 
                reason: identifier ? 'Identifier present' : 'No identifier',
                verifiedAt: Date.now()
            };
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[MusicWorker-${this.workerId}] ❌ Error verifying song:`, errorMessage);
            return { 
                available: false, 
                reason: errorMessage,
                verifiedAt: Date.now()
            };
        }
    }

    async extractMetadata(songData: SongData): Promise<ExtractedMetadata> {
        const { source, extractedId, url, query } = songData;
        
        try {
            console.log(`[MusicWorker-${this.workerId}] 📊 Extracting metadata for ${source} song`);
            
            let handler;
            switch (source.toLowerCase()) {
                case 'spotify':
                    handler = this.spotifyHandler;
                    break;
                case 'youtube':
                    handler = this.youtubeHandler;
                    break;
                default:
                    throw new Error(`Unsupported source: ${source}`);
            }

            const identifier = extractedId || query || url;
            if (!identifier) {
                throw new Error('No identifier provided');
            }

            // Extract basic metadata without full processing
            const extractedId_clean = handler.extractId ? handler.extractId(identifier) : identifier;
            
            if (!extractedId_clean) {
                throw new Error('Could not extract ID from identifier');
            }
            
            const metadata: ExtractedMetadata = {
                source,
                extractedId: extractedId_clean,
                originalQuery: query,
                originalUrl: url,
                isValid: handler.validateURL ? handler.validateURL(identifier) : true,
                extractedAt: Date.now(),
                extractedBy: this.workerId
            };

            // Add source-specific metadata
            if (source.toLowerCase() === 'youtube' && extractedId_clean) {
                metadata.thumbnails = {
                    small: `https://img.youtube.com/vi/${extractedId_clean}/mqdefault.jpg`,
                    large: `https://img.youtube.com/vi/${extractedId_clean}/maxresdefault.jpg`
                };
                metadata.videoUrl = `https://youtube.com/watch?v=${extractedId_clean}`;
            }

            return metadata;
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[MusicWorker-${this.workerId}] ❌ Error extracting metadata:`, errorMessage);
            return {
                error: errorMessage,
                source,
                extractedId: '',
                originalQuery: query,
                originalUrl: url,
                isValid: false,
                extractedAt: Date.now(),
                extractedBy: this.workerId,
                failed: true
            };
        }
    }

    async processBatch(batchData: BatchData) {
        const { songs, batchId } = batchData;
        
        if (!Array.isArray(songs)) {
            throw new Error('Batch data must contain an array of songs');
        }

        console.log(`[MusicWorker-${this.workerId}] 📦 Processing batch ${batchId} with ${songs.length} songs`);
        
        const results = [];
        const startTime = Date.now();
        
        for (let i = 0; i < songs.length; i++) {
            try {
                const songData = {
                    ...songs[i],
                    batchIndex: i,
                    batchTotal: songs.length,
                    batchId
                };
                
                const result = await this.fetchSongDetails(songData);
                results.push(result);
                
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`[MusicWorker-${this.workerId}] ❌ Error processing song ${i} in batch:`, errorMessage);
                results.push({
                    error: errorMessage,
                    batchIndex: i,
                    batchId,
                    failed: true,
                    fetchedAt: Date.now(),
                    fetchedBy: this.workerId
                });
            }
        }

        const processingTime = Date.now() - startTime;
        const successful = results.filter(r => !r.failed).length;
        const failed = results.length - successful;
        
        console.log(`[MusicWorker-${this.workerId}] ✅ Batch ${batchId} completed: ${successful} successful, ${failed} failed (${processingTime}ms)`);
        
        return {
            batchId,
            results,
            stats: {
                total: results.length,
                successful,
                failed,
                processingTime
            }
        };
    }

    // Graceful shutdown handler
    async shutdown() {
        console.log(`[MusicWorker-${this.workerId}] 🛑 Shutting down gracefully...`);
        
        // Clean up any resources if needed
        try {
            // Close any open connections, clear timeouts, etc.
            console.log(`[MusicWorker-${this.workerId}] ✅ Shutdown completed`);
        } catch (error) {
            console.error(`[MusicWorker-${this.workerId}] ❌ Error during shutdown:`, error);
        }
    }
}

// Handle uncaught exceptions to prevent worker crashes
process.on('uncaughtException', (error) => {
    console.error(`[MusicWorker-${workerData?.workerId || 'unknown'}] ❌ Uncaught exception:`, error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(`[MusicWorker-${workerData?.workerId || 'unknown'}] ❌ Unhandled rejection at:`, promise, 'reason:', reason);
    process.exit(1);
});

// Initialize worker
const worker = new MusicWorker();

// Handle graceful shutdown
process.on('SIGTERM', () => {
    worker.shutdown().then(() => process.exit(0));
});

process.on('SIGINT', () => {
    worker.shutdown().then(() => process.exit(0));
});
