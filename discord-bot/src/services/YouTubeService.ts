import ytdl from 'ytdl-core';
//@ts-ignore
import youtubesearchapi from 'youtube-search-api';

export interface YouTubeTrack {
  id: string;
  title: string;
  url: string;
  duration: string;
  thumbnail: string;
  channelTitle: string;
}

export class YouTubeService {
  
  async searchTrack(query: string): Promise<YouTubeTrack | null> {
    try {
      console.log(`🔍 Searching YouTube for: "${query}"`);
      
      const finalQuery = `${query.trim()} audio`;
      const searchResult = await youtubesearchapi.GetListByKeyword(finalQuery, false, 5);
      
      if (!searchResult || !searchResult.items || searchResult.items.length === 0) {
        console.warn(`⚠️ No YouTube results found for: "${query}"`);
        return null;
      }

      // Filter out shorts and live streams for better audio quality
      const validVideos = searchResult.items.filter((video: any) => {
        return video.type === 'video' && 
               !video.title?.toLowerCase().includes('#shorts') &&
               !video.isLive;
      });

      if (validVideos.length === 0) {
        console.warn(`⚠️ No valid YouTube videos found for: "${query}"`);
        return null;
      }

      const video = validVideos[0];
      if (!video) {
        console.warn(`⚠️ No valid video found`);
        return null;
      }
      
      const videoId = video.id;
      
      if (!videoId || videoId.length !== 11) {
        console.warn(`⚠️ Invalid video ID: ${videoId}`);
        return null;
      }

      const url = `https://youtube.com/watch?v=${videoId}`;
      
      // Verify the video is playable
      if (!await this.isVideoPlayable(url)) {
        console.warn(`⚠️ Video not playable: ${url}`);
        // Try next video if available
        if (validVideos.length > 1) {
          const nextVideo = validVideos[1];
          if (nextVideo) {
            const nextUrl = `https://youtube.com/watch?v=${nextVideo.id}`;
            if (await this.isVideoPlayable(nextUrl)) {
              const nextThumbnail = this.getThumbnailUrl(nextVideo, nextVideo.id);
              return {
                id: nextVideo.id,
                title: nextVideo.title || 'Unknown Title',
                url: nextUrl,
                duration: nextVideo.length?.simpleText || 'Unknown',
                thumbnail: nextThumbnail,
                channelTitle: nextVideo.channelTitle || 'Unknown Channel'
              };
            }
          }
        }
        return null;
      }

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
      console.error(`❌ Error searching YouTube for "${query}":`, error);
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
      const info = await ytdl.getBasicInfo(url);
      return !info.videoDetails.isLiveContent && 
             info.videoDetails.lengthSeconds !== '0' &&
             !info.videoDetails.isPrivate;
    } catch (error) {
      console.warn(`⚠️ Video not accessible: ${url}`, error);
      return false;
    }
  }

  async getVideoInfo(url: string): Promise<ytdl.videoInfo> {
    try {
      return await ytdl.getInfo(url);
    } catch (error) {
      console.error(`❌ Error getting video info for ${url}:`, error);
      throw error;
    }
  }

  createAudioStream(url: string, options?: ytdl.downloadOptions) {
    const defaultOptions: ytdl.downloadOptions = {
      filter: 'audioonly',
      quality: 'highestaudio',
      highWaterMark: 1 << 25, // 32MB buffer
    };

    return ytdl(url, { ...defaultOptions, ...options });
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
      console.log(`🔍 Searching YouTube for multiple results: "${query}"`);
      
      const finalQuery = `${query.trim()} audio`;
      const searchResult = await youtubesearchapi.GetListByKeyword(finalQuery, false, limit * 2);
      
      if (!searchResult || !searchResult.items || searchResult.items.length === 0) {
        console.warn(`⚠️ No YouTube results found for: "${query}"`);
        return [];
      }

      // Filter and process multiple videos
      const validVideos = searchResult.items
        .filter((video: any) => {
          return video.type === 'video' && 
                 !video.title?.toLowerCase().includes('#shorts') &&
                 !video.isLive;
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
          title: video.title,
          url,
          duration: video.length?.simpleText || 'Unknown',
          thumbnail,
          channelTitle: video.channelTitle || 'Unknown Channel'
        });
      }

      return tracks;

    } catch (error) {
      console.error(`❌ Error searching YouTube for multiple tracks "${query}":`, error);
      return [];
    }
  }
}
