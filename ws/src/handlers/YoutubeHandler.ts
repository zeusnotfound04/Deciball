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
    console.log(`[YoutubeHandler] Getting track details for ID: ${id}`);

    if (!id || id.length !== 11 || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      console.warn(`[YoutubeHandler] Invalid YouTube video ID format: ${id}`);
      return null;
    }

    // const res = await youtubesearchapi.GetVideoDetails(id);
    const searchResult = await youtubesearchapi.GetListByKeyword(`https://youtube.com/watch?v=${id}`, false, 1);

    const video = searchResult?.items?.[0];
    console.log("The Response from the Youtube API is: ", video);
    // console.log(`[YoutubeHandler] API Response:`, JSON.stringify(res, null, 2));

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

    getSource(): MusicSource {
    return "Youtube";
  }


}