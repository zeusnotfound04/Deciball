import { MusicHandler, MusicSource, MusicTrack } from "../types";
//@ts-ignore
import youtubesearchapi from "youtube-search-api";


export class YoutubeHandler implements MusicHandler {
    validateURL(URL: string): boolean {
          return /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/.test(URL);
    }

    extractId(URL: string): string | null {
    const match = URL.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
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