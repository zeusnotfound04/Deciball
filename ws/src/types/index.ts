
export type MusicSource = "Youtube" | "Spotify";

export interface MusicTrack {
  id: string;
  source: MusicSource;
  extractedId: string; // YouTube video ID or Spotify track ID
  url: string;
  title: string;
  artist?: string;
  album?: string;
  duration?: number;
  smallImg: string;
  bigImg: string;
  previewUrl?: string; // For Spotify 30-second previews
}

export interface StreamData {
  id: string;
  userId: string;
  spaceId: string;
  source: MusicSource;
  sourceId: string;
  url: string;
  title: string;
  artist?: string;
  album?: string;
  duration?: number;
  smallImg: string;
  bigImg: string;
  previewUrl?: string;
  addedBy: string;
  played: boolean;
  playedTs?: Date;
  createdAt: Date;
}



export interface MusicHandler {
    validateURL(URL :string) : boolean;
    extractId(URL : string) : string | null
    getTrackDetails(id : string) : Promise<MusicTrack | null>
    getSource() : MusicSource
}


