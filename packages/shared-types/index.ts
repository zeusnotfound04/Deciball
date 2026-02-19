// Shared types across all packages
export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface Space {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Date;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  url: string;
  duration: number;
}

export interface QueueItem {
  id: string;
  song: Song;
  addedBy: string;
  addedAt: Date;
}

export type WebSocketMessageType = 
  | 'SPACE_JOIN'
  | 'SPACE_LEAVE'
  | 'SONG_ADD'
  | 'SONG_REMOVE'
  | 'SONG_PLAY'
  | 'SONG_PAUSE'
  | 'SONG_SKIP';

export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType;
  payload: T;
  timestamp: number;
}
