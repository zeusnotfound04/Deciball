// Use CommonJS require for better compatibility
const ytdlDistube = require('@distube/ytdl-core');
const ytdlCore = require('ytdl-core');
const youtubesearchapi = require('youtube-search-api');
require('dotenv').config();

export interface YouTubeTrack {
  id: string;
  title: string;
  url: string;
  duration: string;
  thumbnail: string;
  channelTitle: string;
}

export class YouTubeService {
  private cookies: string;
  private primaryYtdl: any;
  private fallbackYtdl: any;

  constructor() {
    // Load cookies from environment variables
    this.cookies = process.env.COOKIES || '';
    
    // Set up primary and fallback ytdl instances
    this.primaryYtdl = ytdlDistube;
    this.fallbackYtdl = ytdlCore;
    
    console.log(`[YouTubeService] Initialized with cookies: ${this.cookies ? 'Yes' : 'No'}`);
    console.log(`[YouTubeService] Primary ytdl: @distube/ytdl-core, Fallback: ytdl-core`);
  }

  // Method to refresh cookies if needed
  refreshCookies(): void {
    this.cookies = process.env.COOKIES || '';
    console.log(`[YouTubeService] Cookies refreshed: ${this.cookies ? 'Yes' : 'No'}`);
  }

  // Method to set cookies manually
  setCookies(cookies: string): void {
    this.cookies = cookies;
    console.log(`[YouTubeService] Cookies manually set`);
  }
  
  async searchTrack(query: string): Promise<YouTubeTrack | null> {
    try {
      if (!query || query.trim().length === 0) {
        console.warn(`[YouTubeService] Empty search query provided`);
        return null;
      }

      // Check if youtubesearchapi is available
      if (!youtubesearchapi || typeof youtubesearchapi.GetListByKeyword !== 'function') {
        console.error(`[YouTubeService] YouTube search API not available`);
        return null;
      }

      const finalQuery = `${query.trim()} audio`;
      console.log(`Searching YouTube for: "${finalQuery}"`);
      
      const searchResult = await youtubesearchapi.GetListByKeyword(finalQuery, false, 5);
      
      if (!searchResult || !searchResult.items || searchResult.items.length === 0) {
        console.warn(`No YouTube results found for: "${query}"`);
        return null;
      }

      // Filter out shorts and live streams for better audio quality
      const validVideos = searchResult.items.filter((video: any) => {
        return video.type === 'video' && 
               !video.title?.toLowerCase().includes('#shorts') &&
               !video.isLive &&
               video.id && 
               video.id.length === 11;
      });

      if (validVideos.length === 0) {
        console.warn(`No valid YouTube videos found for: "${query}"`);
        return null;
      }

      const video = validVideos[0];
      if (!video) {
        console.warn(`No valid video found`);
        return null;
      }
      
      const videoId = video.id;
      console.log(`Found video: "${video.title}" (${videoId})`);

      const url = `https://youtube.com/watch?v=${videoId}`;
      
      // Skip playability check for now to avoid additional delays
      // if (!await this.isVideoPlayable(url)) {
      //   console.warn(`Video not playable: ${url}`);
      //   return null;
      // }

      const thumbnail = this.getThumbnailUrl(video, videoId);

      return {
        id: videoId,
        title: video.title || 'Unknown Title',
        url,
        duration: video.length?.simpleText || 'Unknown',
        thumbnail,
        channelTitle: video.channelTitle || 'Unknown Channel'
      };

    } catch (error) {
      console.error(`Error searching YouTube for "${query}":`, error);
      
      // Check if it's a specific API error
      if (error instanceof Error) {
        if (error.message.includes('Cannot read properties of undefined')) {
          console.warn(`[YouTubeService] YouTube API returned undefined response for "${query}"`);
          console.warn(`[YouTubeService] youtubesearchapi available:`, !!youtubesearchapi);
          console.warn(`[YouTubeService] GetListByKeyword available:`, typeof youtubesearchapi?.GetListByKeyword);
        }
      }
      
      return null;
    }
  }

  private getThumbnailUrl(video: any, videoId: string): string {
    let thumbnail = "";
    if (video.thumbnail && Array.isArray(video.thumbnail.thumbnails)) {
      const thumbnails = video.thumbnail.thumbnails;
      thumbnail = thumbnails[thumbnails.length - 1]?.url || "";
    }

    if (!thumbnail) {
      thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }

    return thumbnail;
  }

  async isVideoPlayable(url: string): Promise<boolean> {
    try {
      const requestOptions = this.getRequestOptions();
      
      // Try with primary ytdl first
      try {
        const info = await this.primaryYtdl.getBasicInfo(url, { requestOptions });
        return !info.videoDetails.isLiveContent && 
               info.videoDetails.lengthSeconds !== '0' &&
               !info.videoDetails.isPrivate;
      } catch (primaryError) {
        console.warn(`[YouTubeService] Primary ytdl failed, trying fallback:`, (primaryError as Error).message);
        
        // Fallback to secondary ytdl
        const info = await this.fallbackYtdl.getBasicInfo(url, { requestOptions });
        return !info.videoDetails.isLiveContent && 
               info.videoDetails.lengthSeconds !== '0' &&
               !info.videoDetails.isPrivate;
      }
    } catch (error) {
      console.warn(`Video not accessible: ${url}`, error);
      return false;
    }
  }

  async getVideoInfo(url: string): Promise<any> {
    try {
      const requestOptions = this.getRequestOptions();
      
      // Try with primary ytdl first
      try {
        return await this.primaryYtdl.getInfo(url, { requestOptions });
      } catch (primaryError) {
        console.warn(`[YouTubeService] Primary ytdl getInfo failed, trying fallback:`, (primaryError as Error).message);
        
        // Fallback to secondary ytdl
        return await this.fallbackYtdl.getInfo(url, { requestOptions });
      }
    } catch (error) {
      console.error(`Error getting video info for ${url}:`, error);
      throw error;
    }
  }

  private getRequestOptions(): any {
    const headers: any = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    };

    // Add cookies if available
    if (this.cookies && this.cookies.trim()) {
      headers['Cookie'] = this.cookies;
      console.log(`[YouTubeService] Using cookies for authentication`);
    }

    return { headers };
  }

  createAudioStream(url: string, options?: any) {
    const requestOptions = this.getRequestOptions();
    
    const defaultOptions: any = {
      filter: 'audioonly',
      quality: 'highestaudio',
      highWaterMark: 1 << 25, // 32MB buffer
      requestOptions
    };

  createAudioStream(url: string, options?: any) {
    const requestOptions = this.getRequestOptions();
    
    const defaultOptions: any = {
      filter: 'audioonly',
      quality: 'highestaudio',
      highWaterMark: 1 << 25, // 32MB buffer
      requestOptions
    };

    // Try primary ytdl first, then fallback
    let stream: any;
    let usingFallback = false;
    
    try {
      stream = this.primaryYtdl(url, { ...defaultOptions, ...options });
      console.log(`[YouTubeService] Using primary ytdl (@distube/ytdl-core) for stream`);
    } catch (primaryError) {
      console.warn(`[YouTubeService] Primary ytdl failed, using fallback:`, (primaryError as Error).message);
      stream = this.fallbackYtdl(url, { ...defaultOptions, ...options });
      usingFallback = true;
      console.log(`[YouTubeService] Using fallback ytdl (ytdl-core) for stream`);
    }
    
    // Add error handling to the stream
    stream.on('error', (error: any) => {
      console.error(`YouTube stream error for ${url}:`, error);
      
      // Check if it's a bot detection error
      if (error.message && error.message.includes('Sign in to confirm you\'re not a bot')) {
        console.warn(`[YouTubeService] Bot detection triggered. Make sure cookies are valid and up to date.`);
        console.warn(`[YouTubeService] Current cookies set: ${this.cookies ? 'Yes' : 'No'}`);
        console.warn(`[YouTubeService] You may need to update the COOKIES environment variable with fresh YouTube session cookies.`);
      }
      
      // If it's a parsing error, suggest using the fallback
      if (error.message && error.message.includes('Error when parsing watch.html')) {
        console.warn(`[YouTubeService] YouTube HTML parsing error detected. This usually means YouTube changed their page structure.`);
        if (!usingFallback) {
          console.warn(`[YouTubeService] Consider updating @distube/ytdl-core or using the fallback ytdl-core.`);
        }
      }
    });

    stream.on('info', (info: any) => {
      const ytdlType = usingFallback ? 'fallback ytdl-core' : 'primary @distube/ytdl-core';
      console.log(`YouTube stream info (${ytdlType}): ${info.videoDetails.title} - ${info.videoDetails.lengthSeconds}s`);
    });

    return stream;
  }

  // New method to create stream with retry logic
  async createAudioStreamWithRetry(url: string, options?: any, maxRetries: number = 2): Promise<any> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[YouTubeService] Creating audio stream (attempt ${attempt}/${maxRetries}) for: ${url}`);
        
        const stream = this.createAudioStream(url, options);
        
        // Test the stream by listening for the first few events
        return new Promise((resolve, reject) => {
          let resolved = false;
          
          const timeout = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              reject(new Error('Stream creation timeout'));
            }
          }, 10000); // 10 second timeout
          
          stream.on('error', (error: any) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              reject(error);
            }
          });
          
          stream.on('info', () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              resolve(stream);
            }
          });
          
          // Also resolve if data starts flowing
          stream.on('readable', () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              resolve(stream);
            }
          });
        });
        
      } catch (error) {
        lastError = error;
        console.warn(`[YouTubeService] Stream creation attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          console.log(`[YouTubeService] Waiting 2 seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    throw lastError || new Error('Failed to create audio stream after all attempts');
  }

  validateURL(url: string): boolean {
    return ytdl.validateURL(url);
  }

  extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1];
    }
    
    return null;
  }

  async searchMultipleTracks(query: string, limit: number = 5): Promise<YouTubeTrack[]> {
    try {
      if (!query || query.trim().length === 0) {
        console.warn(`[YouTubeService] Empty search query provided for multiple tracks`);
        return [];
      }

      console.log(`🔍 Searching YouTube for multiple results: "${query}"`);
      
      const finalQuery = `${query.trim()} audio`;
      const searchResult = await youtubesearchapi.GetListByKeyword(finalQuery, false, limit * 2);
      
      if (!searchResult || !searchResult.items || searchResult.items.length === 0) {
        console.warn(`No YouTube results found for: "${query}"`);
        return [];
      }

      // Filter and process multiple videos
      const validVideos = searchResult.items
        .filter((video: any) => {
          return video.type === 'video' && 
                 !video.title?.toLowerCase().includes('#shorts') &&
                 !video.isLive &&
                 video.id &&
                 video.id.length === 11;
        })
        .slice(0, limit);

      const tracks: YouTubeTrack[] = [];

      for (const video of validVideos) {
        const videoId = video.id;
        
        if (!videoId || videoId.length !== 11) {
          continue;
        }

        const url = `https://youtube.com/watch?v=${videoId}`;
        const thumbnail = this.getThumbnailUrl(video, videoId);

        tracks.push({
          id: videoId,
          title: video.title || 'Unknown Title',
          url,
          duration: video.length?.simpleText || 'Unknown',
          thumbnail,
          channelTitle: video.channelTitle || 'Unknown Channel'
        });
      }

      console.log(`Found ${tracks.length} valid YouTube tracks for "${query}"`);
      return tracks;

    } catch (error) {
      console.error(`Error searching YouTube for multiple tracks "${query}":`, error);
      
      // Check if it's a specific API error
      if (error instanceof Error) {
        if (error.message.includes('Cannot read properties of undefined')) {
          console.warn(`[YouTubeService] YouTube API returned undefined response for multiple tracks "${query}"`);
        }
      }
      
      return [];
    }
  }

  // Debug method to test YouTube API directly
  async testYouTubeAPI(query: string): Promise<any> {
    try {
      console.log(`🧪 Testing YouTube API with query: "${query}"`);
      console.log(`🧪 youtubesearchapi available:`, !!youtubesearchapi);
      console.log(`🧪 GetListByKeyword available:`, typeof youtubesearchapi?.GetListByKeyword);
      
      if (!youtubesearchapi || typeof youtubesearchapi.GetListByKeyword !== 'function') {
        console.error(`🧪 YouTube search API not available!`);
        return null;
      }
      
      const searchResult = await youtubesearchapi.GetListByKeyword(query, false, 3);
      
      console.log('Raw YouTube API Response:');
      console.log('- Has result:', !!searchResult);
      console.log('- Has items:', !!searchResult?.items);
      console.log('- Items count:', searchResult?.items?.length || 0);
      
      if (searchResult?.items?.length > 0) {
        searchResult.items.forEach((item: any, index: number) => {
          console.log(`- Item ${index + 1}:`, {
            id: item.id,
            title: item.title,
            type: item.type,
            channelTitle: item.channelTitle,
            hasLength: !!item.length,
            duration: item.length?.simpleText
          });
        });
      }
      
      return searchResult;
    } catch (error) {
      console.error('🧪 YouTube API test failed:', error);
      return null;
    }
  }
}
