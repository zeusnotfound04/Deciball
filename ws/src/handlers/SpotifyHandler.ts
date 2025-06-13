import { MusicHandler, MusicSource, MusicTrack } from "../types";

export class SpotifyHandler implements MusicHandler {
//   private spotifyToken: string;

//   constructor(spotifyToken: string) {
//     // this.spotifyToken = spotifyToken;
//   }

  validateURL
  (URL: string): boolean {
    return /^https:\/\/open\.spotify\.com\/track\//.test(URL);
  }

  extractId(url: string): string | null {
    const match = url.match(/track\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  async getTrackDetails(id: string): Promise<MusicTrack | null> {
    try {
      const response = await fetch(`${process.env.YOUR_API_BASE_URL}/spotify/track/${id}`, {
        // headers: {
        //   'Authorization': `Bearer ${this.spotifyToken}`,
        //   'Content-Type': 'application/json'
        // }
      });

      if (!response.ok) {
        return null;
      }

      const trackData = await response.json();

      return {
        id: crypto.randomUUID(),
        source: "Spotify",
        extractedId: id,
        url: `https://open.spotify.com/track/${id}`,
        title: trackData.name,
        artist: trackData.artists?.map((a: any) => a.name).join(", "),
        album: trackData.album?.name,
        duration: trackData.duration_ms,
        smallImg: trackData.album?.images?.find((img: any) => img.height <= 300)?.url || "",
        bigImg: trackData.album?.images?.[0]?.url || "",
        previewUrl: trackData.preview_url,
      };
    } catch (error) {
      console.error("Spotify API error:", error);
      return null;
    }
  }

  getSource(): MusicSource {
    return "Spotify";
  }
}
