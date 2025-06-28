import { MusicHandler, MusicSource, MusicTrack } from "../types";
//@ts-ignore
import youtubesearchapi from "youtube-search-api";


export class YoutubeHandler implements MusicHandler {
    validateURL(URL: string): boolean {
        // Accept both full YouTube URLs and video IDs (11 characters)
        if (!URL) return false;
        
        // Check if it's a valid YouTube URL
        const urlPattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/;
        if (urlPattern.test(URL)) return true;
        
        // Check if it's a valid 11-character YouTube video ID
        const videoIdPattern = /^[a-zA-Z0-9_-]{11}$/;
        return videoIdPattern.test(URL);
    }

    extractId(URL: string): string | null {
        if (!URL) return null;
        
        // If it's already a video ID (11 characters)
        if (/^[a-zA-Z0-9_-]{11}$/.test(URL)) {
            return URL;
        }
        
        // Extract from full URL
        const match = URL.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        return match ? match[1] : null;
    }
  async getTrackDetails(id: string): Promise<MusicTrack | null> {
    try {
      const res = await youtubesearchapi.GetVideoDetails(id);
      
      if (!res.thumbnail) {
        return null;
      }

       const smallImage = JSON.stringify(res.thumbnail.thumbnails[0].url);
        
        const bigImage = JSON.stringify(res.thumbnail.thumbnails.at(-1).url);
      return {
        id: crypto.randomUUID(),
        source: "Youtube",
        extractedId: id,
        url: `https://youtube.com/watch?v=${id}`,
        title: res.title ?? "Can't find video",
        smallImg: smallImage,
        bigImg: bigImage,
      };
    } catch (error) {
      console.error("YouTube API error:", error);
      return null;
    }
  }

    getSource(): MusicSource {
    return "Youtube";
  }


}