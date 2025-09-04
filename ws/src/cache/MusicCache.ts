import { RedisClientType } from 'redis';
import { MusicTrack } from '../types';
import * as crypto from 'crypto';

export interface CachedMusicTrack extends MusicTrack {
    cachedAt: number;
    searchQuery: string;
    hitCount?: number;
    lastAccessed?: number;
}

export class MusicCache {
    private redisClient: RedisClientType;
    private readonly CACHE_PREFIX = 'music:';
    private readonly CACHE_TTL = 30 * 24 * 60 * 60; // 30 days
    private readonly POPULAR_SONG_TTL = 60 * 24 * 60 * 60; // 60 days for popular songs
    private readonly STATS_PREFIX = 'music-stats:';

    constructor(redisClient: RedisClientType) {
        this.redisClient = redisClient;
    }

    private generateCacheKey(query: string, source: string): string {
        if (query.includes('://') || query.includes('youtube.com') || query.includes('spotify.com')) {
            // For URLs, use the full URL as the key (just normalize case and whitespace)
            const normalized = query.toLowerCase().trim();
            const hash = crypto.createHash('md5').update(normalized).digest('hex');
            return `${this.CACHE_PREFIX}${source.toLowerCase()}:url:${hash}`;
        }
        
        const normalized = query.toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s-]/g, '') // Remove special characters only for search queries
            .substring(0, 100); // Limit length
        
        const hash = crypto.createHash('md5').update(normalized).digest('hex');
        return `${this.CACHE_PREFIX}${source.toLowerCase()}:search:${hash}`;
    }

    private generateIdCacheKey(id: string, source: string): string {
        return `${this.CACHE_PREFIX}id:${source.toLowerCase()}:${id}`;
    }

    async cacheSong(song: MusicTrack, searchQuery: string, spotifyId?: string): Promise<void> {
        const cacheData: CachedMusicTrack = {
            ...song,
            cachedAt: Date.now(),
            searchQuery: searchQuery.toLowerCase().trim(),
            hitCount: 0,
            lastAccessed: Date.now()
        };

        const promises: Promise<any>[] = [];
        const ttl = this.CACHE_TTL;
        
        try {
            const isUrl = searchQuery.includes('://') || searchQuery.includes('youtube.com') || searchQuery.includes('spotify.com');
            
            if (isUrl) {
                const queryKey = this.generateCacheKey(searchQuery, song.source);
                promises.push(this.redisClient.setEx(queryKey, ttl, JSON.stringify(cacheData)));
                
                if (song.extractedId) {
                    const idKey = this.generateIdCacheKey(song.extractedId, song.source);
                    promises.push(this.redisClient.setEx(idKey, ttl, JSON.stringify(cacheData)));
                }
            } else {
                const queryKey = this.generateCacheKey(searchQuery, song.source);
                promises.push(this.redisClient.setEx(queryKey, ttl, JSON.stringify(cacheData)));
                
                if (song.title) {
                    const titleKey = this.generateCacheKey(song.title, song.source);
                    promises.push(this.redisClient.setEx(titleKey, ttl, JSON.stringify(cacheData)));
                }
                
                if (song.title && song.artist) {
                    const combinedQuery = `${song.title} ${song.artist}`;
                    const combinedKey = this.generateCacheKey(combinedQuery, song.source);
                    promises.push(this.redisClient.setEx(combinedKey, ttl, JSON.stringify(cacheData)));
                }
                
                if (song.extractedId) {
                    const idKey = this.generateIdCacheKey(song.extractedId, song.source);
                    promises.push(this.redisClient.setEx(idKey, ttl, JSON.stringify(cacheData)));
                }

                if (spotifyId) {
                    const spotifyKey = this.generateIdCacheKey(spotifyId, 'Spotify');
                    promises.push(this.redisClient.setEx(spotifyKey, ttl, JSON.stringify(cacheData)));
                }

                const searchIndexKey = `${this.CACHE_PREFIX}search-index:${song.source.toLowerCase()}`;
                const searchData = {
                    key: queryKey,
                    title: song.title,
                    artist: song.artist || '',
                    searchQuery: searchQuery.toLowerCase(),
                    spotifyId: spotifyId || undefined // Include Spotify ID in search index
                };
                promises.push(this.redisClient.zAdd(searchIndexKey, {
                    score: Date.now(),
                    value: JSON.stringify(searchData)
                }));
            }

            await Promise.all(promises);
            
            await this.updateCacheStats('songs_cached', 1);
            
        } catch (error) {
            throw error;
        }
    }

async searchCache(query: string, source?: string, spotifyId?: string): Promise<CachedMusicTrack | null> {
        const searchStart = Date.now();
        
        try {
            if (spotifyId) {
                const spotifyResult = await this.getBySpotifyId(spotifyId);
                if (spotifyResult) {
                    await this.updateHitStats(spotifyResult, Date.now() - searchStart);
                    return spotifyResult;
                }
            }

                const directResult = await this.directSearch(query, source);
            if (directResult) {
                await this.updateHitStats(directResult, Date.now() - searchStart);
                return directResult;
            }

            const isUrl = query.includes('://') || query.includes('youtube.com') || query.includes('spotify.com');
            
            if (!isUrl) {
                const fuzzyResult = await this.fuzzySearch(query, source);
                if (fuzzyResult) {
                    await this.updateHitStats(fuzzyResult, Date.now() - searchStart);
                    return fuzzyResult;
                }
            }

            await this.updateCacheStats('cache_misses', 1);
     return null;
        } catch (error) {
            console.error(`[MusicCache] Error searching cache for "${query}":`, error);
            return null;
        }
    }

    private async directSearch(query: string, source?: string): Promise<CachedMusicTrack | null> {
        const searchKeys: string[] = [];
        
        if (source) {
            searchKeys.push(this.generateCacheKey(query, source));
        } else {
            searchKeys.push(this.generateCacheKey(query, 'Youtube'));
            searchKeys.push(this.generateCacheKey(query, 'Spotify'));
        }

        for (const key of searchKeys) {
            try {
                const cached = await this.redisClient.get(key);
                if (cached) {
                    const song = JSON.parse(cached) as CachedMusicTrack;
                    song.lastAccessed = Date.now();
                    await this.redisClient.setEx(key, this.CACHE_TTL, JSON.stringify(song));
                    
                    return song;
                }
            } catch (error) {
                console.error(`[MusicCache] Error reading cache key ${key}:`, error);
            }
        }
        
        return null;
    }

    private async fuzzySearch(query: string, source?: string): Promise<CachedMusicTrack | null> {
        const sources = source ? [source] : ['Youtube', 'Spotify'];
        const queryLower = query.toLowerCase();
        
        
        for (const src of sources) {
            try {
                const searchIndexKey = `${this.CACHE_PREFIX}search-index:${src.toLowerCase()}`;
                const results = await this.redisClient.zRange(searchIndexKey, 0, -1);
                   
                for (const result of results) {
                    try {
                        const searchData = JSON.parse(result);
                        const { title, artist, searchQuery } = searchData;
                        
                            if (this.isFuzzyMatch(queryLower, title, artist, searchQuery)) {
                            const cached = await this.redisClient.get(searchData.key);
                            if (cached) {
                                const song = JSON.parse(cached) as CachedMusicTrack;
                                return song;
                            } else {
                                console.log(` Fuzzy match found but cache entry missing for key: ${searchData.key}`);
                            }
                        }
                    } catch (parseError) {
                        continue;
                    }
                }
            } catch (error) {
                console.error(`Error in fuzzy search for ${src}:`, error);
            }
        }
        
        return null;
    }

    private isFuzzyMatch(query: string, title: string, artist: string, originalQuery: string): boolean {
        const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
        const titleWords = (title?.toLowerCase() || '').split(/\s+/).filter(word => word.length > 2);
        const artistWords = (artist?.toLowerCase() || '').split(/\s+/).filter(word => word.length > 2);
        const originalWords = (originalQuery?.toLowerCase() || '').split(/\s+/).filter(word => word.length > 2);

let titleMatchedWords = 0;
        let artistMatchedWords = 0;
        
        for (const queryWord of queryWords) {
            if (titleWords.some(titleWord => 
                titleWord.includes(queryWord) || 
                queryWord.includes(titleWord) ||
                this.calculateSimilarity(queryWord, titleWord) > 0.85
            )) {
                titleMatchedWords++;
            }
            
            // Count artist matches separately
            if (artistWords.some(artistWord => 
                artistWord.includes(queryWord) || 
                queryWord.includes(artistWord) ||
                this.calculateSimilarity(queryWord, artistWord) > 0.85
            )) {
                artistMatchedWords++;
            }
        }
        
        const titleMatchRatio = titleWords.length > 0 ? titleMatchedWords / Math.min(queryWords.length, titleWords.length) : 0;
        const totalMatchedWords = titleMatchedWords + artistMatchedWords;
        const totalMatchRatio = totalMatchedWords / queryWords.length;
        
const hasSignificantTitleMatch = titleMatchedWords >= 1 && titleMatchRatio >= 0.5;
        const hasHighOverallMatch = totalMatchRatio >= 0.8 && totalMatchedWords >= 2;
        
        if (hasSignificantTitleMatch && hasHighOverallMatch) {
            return true;
        }
        
        // Fallback: Direct string similarity for exact matches (very strict)
        const directTitleSimilarity = this.calculateSimilarity(query, title?.toLowerCase() || '');
        const directFullSimilarity = this.calculateSimilarity(query, `${title} ${artist}`.toLowerCase());
        const directOriginalSimilarity = this.calculateSimilarity(query, originalQuery?.toLowerCase() || '');
        
        if (directTitleSimilarity > 0.9 || directFullSimilarity > 0.9 || directOriginalSimilarity > 0.9) {
            return true;
        }

        // Debug log for failed matches to help tune the algorithm
        if (titleMatchedWords > 0 || artistMatchedWords > 0) {
            console.log(`Match rejected: "${query}" -> "${title}" by "${artist}" (Title: ${titleMatchedWords}/${titleWords.length}, Artist: ${artistMatchedWords}/${artistWords.length}, Ratios: ${Math.round(titleMatchRatio * 100)}%/${Math.round(totalMatchRatio * 100)}%)`);
        }

        return false;
    }

    private calculateSimilarity(str1: string, str2: string): number {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    private levenshteinDistance(str1: string, str2: string): number {
        const matrix = Array(str2.length + 1).fill(null).map(() => 
            Array(str1.length + 1).fill(null)
        );

        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + indicator
                );
            }
        }

        return matrix[str2.length][str1.length];
    }

    async getBySpotifyId(spotifyId: string): Promise<CachedMusicTrack | null> {
        const key = this.generateIdCacheKey(spotifyId, 'Spotify');
        const cached = await this.redisClient.get(key);
        return cached ? JSON.parse(cached) : null;
    }

    async getByYouTubeId(youtubeId: string): Promise<CachedMusicTrack | null> {
        const key = this.generateIdCacheKey(youtubeId, 'Youtube');
        const cached = await this.redisClient.get(key);
        return cached ? JSON.parse(cached) : null;
    }

    async batchSearch(queries: Array<{query: string, source?: string, spotifyId?: string}>): Promise<Array<CachedMusicTrack | null>> {
        const promises = queries.map(({query, source, spotifyId}) => this.searchCache(query, source, spotifyId));
        return Promise.all(promises);
    }

    async batchCache(songs: Array<{song: MusicTrack, searchQuery: string, spotifyId?: string}>): Promise<void> {
        const promises = songs.map(({song, searchQuery, spotifyId}) => this.cacheSong(song, searchQuery, spotifyId));
        await Promise.all(promises);
    }

    private async updateHitStats(song: CachedMusicTrack, responseTime: number): Promise<void> {
        try {
            
            await Promise.all([
                this.updateCacheStats('cache_hits', 1),
                this.updateCacheStats('total_response_time', responseTime),
                this.redisClient.incr(`${this.STATS_PREFIX}song_hits:${song.id}`)
            ]);
            
        } catch (error) {
            console.error('[MusicCache] Error updating hit stats:', error);
        }
    }

    private async updateCacheStats(metric: string, value: number): Promise<void> {
        try {
            await this.redisClient.incrBy(`${this.STATS_PREFIX}${metric}`, value);
        } catch (error) {
            console.error(`[MusicCache] Error updating stat ${metric}:`, error);
        }
    }

    async getStats(): Promise<any> {
        try {
            const [hits, misses, songsCached, totalResponseTime] = await Promise.all([
                this.redisClient.get(`${this.STATS_PREFIX}cache_hits`),
                this.redisClient.get(`${this.STATS_PREFIX}cache_misses`),
                this.redisClient.get(`${this.STATS_PREFIX}songs_cached`),
                this.redisClient.get(`${this.STATS_PREFIX}total_response_time`)
            ]);

            const numHits = parseInt(hits || '0');
            const numMisses = parseInt(misses || '0');
            const numSongsCached = parseInt(songsCached || '0');
            const totalTime = parseInt(totalResponseTime || '0');

            const totalRequests = numHits + numMisses;
            const hitRate = totalRequests > 0 ? (numHits / totalRequests) * 100 : 0;
            const avgResponseTime = numHits > 0 ? totalTime / numHits : 0;

            return {
                cache_hits: numHits,
                cache_misses: numMisses,
                hit_rate: `${hitRate.toFixed(2)}%`,
                songs_cached: numSongsCached,
                avg_response_time: `${avgResponseTime.toFixed(2)}ms`,
                total_requests: totalRequests
            };
        } catch (error) {
            console.error('[MusicCache] Error getting stats:', error);
            return {
                cache_hits: 0,
                cache_misses: 0,
                hit_rate: '0%',
                songs_cached: 0,
                avg_response_time: '0ms',
                total_requests: 0
            };
        }
    }

    
    async clearAllCache(): Promise<void> {
        const keys = await this.redisClient.keys(`${this.CACHE_PREFIX}*`);
        if (keys.length > 0) {
            await this.redisClient.del(keys);
        }
    }
}
