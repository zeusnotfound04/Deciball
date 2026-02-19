import { MusicHandler, MusicSource, MusicTrack } from "../types";
import { SpotifyHandler } from "./SpotifyHandler";
import { YoutubeHandler } from "./YoutubeHandler";

export class MusicSourceManager {
  private handlers: Map<MusicSource, MusicHandler> = new Map();

  constructor(spotifyToken?: string) {
    this.handlers.set("Youtube", new YoutubeHandler());
    if (spotifyToken) {
      this.handlers.set("Spotify", new SpotifyHandler());
    }
  }

  detectSource(url: string): MusicSource | null {
    for (const [source, handler] of this.handlers) {
      if (handler.validateURL(url)) {
        return source;
      }
    }
    return null;
  }

  getHandler(source: MusicSource): MusicHandler | null {
    return this.handlers.get(source) || null;
  }

  validateUrl(url: string): boolean {
    const source = this.detectSource(url);
    if (!source) return false;
    
    const handler = this.getHandler(source);
    return handler ? handler.validateURL(url) : false;
  }

  async getTrackDetails(url: string): Promise<MusicTrack | null> {
    const source = this.detectSource(url);
    if (!source) return null;

    const handler = this.getHandler(source);
    if (!handler) return null;

    const id = handler.extractId(url);
    if (!id) return null;

    return await handler.getTrackDetails(id);
  }
}