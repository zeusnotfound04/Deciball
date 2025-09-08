import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface SpaceTrackData {
  id: string;
  title: string;
  artist: string;
  url: string;
  duration?: number;
  extractedId: string;
  thumbnail?: string;
}

export interface SpacePlaybackState {
  currentSong: SpaceTrackData | null;
  isPlaying: boolean;
  volume: number;
  timestamp: number;
}

export class WebSocketService extends EventEmitter {
  private static instance: WebSocketService;
  private ws: WebSocket | null = null;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private readonly wsUrl: string;
  private connectedSpaces: Set<string> = new Set();
  private isReconnecting: boolean = false;

  private constructor() {
    super();
    this.wsUrl = process.env.WS_URL || 'ws://localhost:8080';
  }

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(this.wsUrl);
      
      if (!this.ws) {
        throw new Error('Failed to create WebSocket connection');
      }
      
      this.ws.on('open', () => {
        console.log('Discord bot connected to WebSocket server');
        this.isReconnecting = false;
        this.emit('connected');
        
        // Clear reconnect interval on successful connection
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
      });

      this.ws.on('message', (data: WebSocket.RawData) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      this.ws.on('close', () => {
        console.log('Discord bot disconnected from WebSocket server');
        this.ws = null;
        this.emit('disconnected');
        this.startReconnect();
      });

      this.ws.on('error', (error: any) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      });

    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.startReconnect();
    }
  }

  private startReconnect(): void {
    if (this.isReconnecting || this.reconnectInterval) {
      return;
    }

    this.isReconnecting = true;
    console.log('Starting reconnection attempts...');

    this.reconnectInterval = setInterval(() => {
      console.log('Attempting to reconnect to WebSocket...');
      this.connect().catch(error => {
        console.error('Reconnection attempt failed:', error);
      });
    }, 5000); // Retry every 5 seconds
  }

  private handleMessage(message: any): void {
    const { type, data } = message;

    switch (type) {
      case 'space-track-changed':
        this.emit('trackChanged', data);
        break;
      case 'space-playback-state':
        this.emit('playbackStateChanged', data);
        break;
      case 'space-track-ended':
        this.emit('trackEnded', data);
        break;
      case 'space-playback-paused':
        this.emit('playbackPaused', data);
        break;
      case 'space-playback-resumed':
        this.emit('playbackResumed', data);
        break;
      case 'space-sync-response':
        this.emit('syncResponse', data);
        break;
      default:
        // Ignore unknown message types
        break;
    }
  }

  async joinSpace(spaceId: string, discordGuildId: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const message = {
      type: 'discord-join-space',
      data: {
        spaceId,
        discordGuildId,
        timestamp: Date.now()
      }
    };

    this.ws.send(JSON.stringify(message));
    this.connectedSpaces.add(spaceId);
    console.log(`Discord bot joined space: ${spaceId}`);
  }

  async leaveSpace(spaceId: string, discordGuildId: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      type: 'discord-leave-space',
      data: {
        spaceId,
        discordGuildId,
        timestamp: Date.now()
      }
    };

    this.ws.send(JSON.stringify(message));
    this.connectedSpaces.delete(spaceId);
    console.log(`Discord bot left space: ${spaceId}`);
  }

  async requestSpaceSync(spaceId: string, discordGuildId: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const message = {
      type: 'discord-request-sync',
      data: {
        spaceId,
        discordGuildId,
        timestamp: Date.now()
      }
    };

    this.ws.send(JSON.stringify(message));
  }

  isConnectedToSpace(spaceId: string): boolean {
    return this.connectedSpaces.has(spaceId);
  }

  getConnectedSpaces(): string[] {
    return Array.from(this.connectedSpaces);
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  disconnect(): void {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connectedSpaces.clear();
    this.isReconnecting = false;
  }
}
