import { MusicHandler, MusicSource, MusicTrack } from "../types";
//@ts-ignore
import youtubesearchapi from "youtube-search-api";
import * as crypto from 'crypto';
export class YoutubeHandler implements MusicHandler {
    validateURL(URL: string): boolean {
        if (!URL) return false;
        
        const urlPatterns = [
            /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/,
            /^(https?:\/\/)?(www\.)?youtube\.com\/embed\/[a-zA-Z0-9_-]{11}/,
            /^(https?:\/\/)?(www\.)?youtube\.com\/v\/[a-zA-Z0-9_-]{11}/,
            /^[a-zA-Z0-9_-]{11}$/ // Direct video ID
        ];
        
        return urlPatterns.some(pattern => pattern.test(URL));
    }

    extractId(URL: string): string | null {
        if (!URL) return null;
        if (/^[a-zA-Z0-9_-]{11}$/.test(URL)) {
            return URL;
        }
        
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
        ];
        
        for (const pattern of patterns) {
            const match = URL.match(pattern);
            if (match) return match[1];
        }
        
        return null;
    }
 async getTrackDetails(id: string): Promise<MusicTrack | null> {
  try {

    if (!id || id.length !== 11 || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return null;
    }

    const searchResult = await youtubesearchapi.GetListByKeyword(`https://youtube.com/watch?v=${id}`, false, 1);

    const video = searchResult?.items?.[0];
    

    // Check if response exists and has the expected structure
    // if (!res || typeof res !== "object") {
    //   console.warn(`[YoutubeHandler] Invalid or empty response from YouTube API for ID: ${id}`);
    //   return null;
    // }

    // // Check if the video details are available
    // if (!res.title) {
    //   console.warn(`[YoutubeHandler] Video title not found for ID: ${id}. Video may be private, deleted, or restricted.`);
    //   return null;
    // }
    const title = video.title;

    // Handle thumbnail extraction
    let smallImage = "";
    let bigImage = "";

    if (video.thumbnail && Array.isArray(video.thumbnail.thumbnails)) {
      const thumbnails = video.thumbnail.thumbnails;
      smallImage = thumbnails[0]?.url || "";
      bigImage = thumbnails[thumbnails.length - 1]?.url || smallImage;
    }

    // Fallback thumbnails
    if (!smallImage && !bigImage) {
      const fallback = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
      smallImage = fallback;
      bigImage = fallback;
    }

    // const title = res.title;
    
    // Handle thumbnail extraction more safely
    // let smallImage = "";
    // let bigImage = "";
    
    // if (res.thumbnail && res.thumbnail.thumbnails && Array.isArray(res.thumbnail.thumbnails)) {
    //   const thumbnails = res.thumbnail.thumbnails;
    //   if (thumbnails.length > 0) {
    //     smallImage = thumbnails[0]?.url || "";
    //     bigImage = thumbnails[thumbnails.length - 1]?.url || "";
    //   }
    // }

    // Fallback thumbnail if none found
    if (!smallImage && !bigImage) {
      const fallbackThumbnail = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
      smallImage = fallbackThumbnail;
      bigImage = fallbackThumbnail;
    }

    return {
      id: crypto.randomUUID(),
      source: "Youtube",
      extractedId: id,
      url: `https://youtube.com/watch?v=${id}`,
      title,
      smallImg: smallImage,
      bigImg: bigImage,
      duration: video.length.simpleText 
    };
    
  } catch (error) {
    console.error(`[YoutubeHandler] Error fetching details for ID ${id}:`, error);
    
    // Check if it's a specific API error
    if (error instanceof Error) {
      if (error.message.includes('Cannot read properties of undefined')) {
        console.warn(`[YoutubeHandler] Video ${id} may not exist or is not accessible`);
      }
    }
    
    return null;
  }
}

    // New method for searching YouTube by query
    async searchTrack(query: string): Promise<MusicTrack | null> {
        try {
            
            
            if (!query || query.trim().length === 0) {
                console.warn(`[YoutubeHandler] Empty search query provided`);
                return null;
            }
            
            const finalQuery = `${query.trim()} (Audio)`
            console.log("Final Query" , finalQuery)
            const searchResult = await youtubesearchapi.GetListByKeyword(finalQuery, false, 1);
            
            if (!searchResult || !searchResult.items || searchResult.items.length === 0) {
                console.warn(`[YoutubeHandler] No search results found for: "${query}"`);
                return null;
            }

            const video = searchResult.items[0];
            console.log(`[YoutubeHandler] 📺 Found video: "${video.title}" (${video.id})`);

            // Extract video ID from the result
            const videoId = video.id;
            if (!videoId || videoId.length !== 11) {
                console.warn(`[YoutubeHandler] Invalid video ID in search result: ${videoId}`);
                return null;
            }

            const title = video.title;

            // Handle thumbnail extraction
            let smallImage = "";
            let bigImage = "";

            if (video.thumbnail && Array.isArray(video.thumbnail.thumbnails)) {
                const thumbnails = video.thumbnail.thumbnails;
                smallImage = thumbnails[0]?.url || "";
                bigImage = thumbnails[thumbnails.length - 1]?.url || smallImage;
            }

            // Fallback thumbnails
            if (!smallImage && !bigImage) {
                const fallback = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
                smallImage = fallback;
                bigImage = fallback;
            }

            // Parse duration if available
            let duration: number | undefined;
            if (video.length && video.length.simpleText) {
                // Convert duration from "4:32" format to seconds
                const timeStr = video.length.simpleText;
                const timeParts = timeStr.split(':').map((part: string) => parseInt(part));
                if (timeParts.length === 2) {
                    duration = timeParts[0] * 60 + timeParts[1]; // minutes:seconds
                } else if (timeParts.length === 3) {
                    duration = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2]; // hours:minutes:seconds
                }
            }

            const result: MusicTrack = {
                id: crypto.randomUUID(),
                source: "Youtube",
                extractedId: videoId,
                url: `https://youtube.com/watch?v=${videoId}`,
                title,
                artist: video.channelTitle || 'Youtube',
                smallImg: smallImage,
                bigImg: bigImage,
                duration
            };
     return result;
            
        } catch (error) {
            console.error(`[YoutubeHandler] ❌ Error searching for "${query}":`, error);
            return null;
        }
    }

    getSource(): MusicSource {
    return "Youtube";
  }


}
