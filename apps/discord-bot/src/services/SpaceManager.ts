import { Collection } from 'discord.js';
import { MusicPlayer } from './MusicPlayer';
import { WebSocketService, SpaceTrackData } from './WebSocketService';

interface SpaceConnection {
  spaceId: string;
  guildId: string;
  player: MusicPlayer;
  currentTrack: SpaceTrackData | null;
  isPlaying: boolean;
}

export class SpaceManager {
  private static instance: SpaceManager;
  private spaceConnections: Collection<string, SpaceConnection> = new Collection();
  private guildToSpace: Collection<string, string> = new Collection();
  private wsService: WebSocketService;

  private constructor() {
    this.wsService = WebSocketService.getInstance();
    this.setupWebSocketListeners();
  }

  static getInstance(): SpaceManager {
    if (!SpaceManager.instance) {
      SpaceManager.instance = new SpaceManager();
    }
    return SpaceManager.instance;
  }

  private setupWebSocketListeners(): void {
    this.wsService.on('trackChanged', (data: any) => {
      this.handleTrackChanged(data);
    });

    this.wsService.on('playbackStateChanged', (data: any) => {
      this.handlePlaybackStateChanged(data);
    });

    this.wsService.on('trackEnded', (data: any) => {
      this.handleTrackEnded(data);
    });

    this.wsService.on('playbackPaused', (data: any) => {
      this.handlePlaybackPaused(data);
    });

    this.wsService.on('playbackResumed', (data: any) => {
      this.handlePlaybackResumed(data);
    });

    this.wsService.on('syncResponse', (data: any) => {
      this.handleSyncResponse(data);
    });

    this.wsService.on('connected', () => {
      console.log('WebSocket connected, syncing existing spaces...');
      this.syncExistingSpaces();
    });

    this.wsService.on('disconnected', () => {
      console.log('WebSocket disconnected');
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.wsService.connect();
      console.log('SpaceManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SpaceManager:', error);
    }
  }

  async joinSpace(spaceId: string, guildId: string, player: MusicPlayer): Promise<void> {
    try {
      // Check if guild is already connected to a space
      const existingSpaceId = this.guildToSpace.get(guildId);
      if (existingSpaceId) {
        throw new Error(`Guild is already connected to space: ${existingSpaceId}`);
      }

      // Join the space via WebSocket
      await this.wsService.joinSpace(spaceId, guildId);

      // Create space connection
      const connection: SpaceConnection = {
        spaceId,
        guildId,
        player,
        currentTrack: null,
        isPlaying: false
      };

      this.spaceConnections.set(spaceId, connection);
      this.guildToSpace.set(guildId, spaceId);

      // Request current state sync
      await this.wsService.requestSpaceSync(spaceId, guildId);

      console.log(`Successfully joined space ${spaceId} for guild ${guildId}`);
    } catch (error) {
      console.error(`Failed to join space ${spaceId}:`, error);
      throw error;
    }
  }

  async leaveSpace(guildId: string): Promise<void> {
    try {
      const spaceId = this.guildToSpace.get(guildId);
      if (!spaceId) {
        throw new Error('Guild is not connected to any space');
      }

      const connection = this.spaceConnections.get(spaceId);
      if (connection) {
        // Stop any currently playing music
        connection.player.stop();
        
        // Leave the space via WebSocket
        await this.wsService.leaveSpace(spaceId, guildId);

        // Clean up connections
        this.spaceConnections.delete(spaceId);
        this.guildToSpace.delete(guildId);

        console.log(`Successfully left space ${spaceId} for guild ${guildId}`);
      }
    } catch (error) {
      console.error(`Failed to leave space for guild ${guildId}:`, error);
      throw error;
    }
  }

  getSpaceForGuild(guildId: string): string | null {
    return this.guildToSpace.get(guildId) || null;
  }

  getConnectionForGuild(guildId: string): SpaceConnection | null {
    const spaceId = this.guildToSpace.get(guildId);
    return spaceId ? this.spaceConnections.get(spaceId) || null : null;
  }

  private async handleTrackChanged(data: any): Promise<void> {
    const { spaceId, track } = data;
    const connection = this.spaceConnections.get(spaceId);
    
    if (connection && track) {
      console.log(`Track changed in space ${spaceId}: ${track.title} by ${track.artist}`);
      
      try {
        // Stop current track
        connection.player.stop();
        
        // Update connection state
        connection.currentTrack = track;
        connection.isPlaying = false;
        
        // Play new track (without timeline sync for efficiency)
        await this.playTrackInDiscord(connection, track);
        
      } catch (error) {
        console.error(`Error handling track change in space ${spaceId}:`, error);
      }
    }
  }

  private async handlePlaybackStateChanged(data: any): Promise<void> {
    const { spaceId, isPlaying, volume } = data;
    const connection = this.spaceConnections.get(spaceId);
    
    if (connection) {
      console.log(`Playback state changed in space ${spaceId}: playing=${isPlaying}`);
      
      try {
        if (isPlaying && !connection.isPlaying) {
          connection.player.resume();
          connection.isPlaying = true;
        } else if (!isPlaying && connection.isPlaying) {
          connection.player.pause();
          connection.isPlaying = false;
        }
        
        // Update volume if provided
        if (typeof volume === 'number') {
          connection.player.setVolume(volume);
        }
      } catch (error) {
        console.error(`Error handling playback state change in space ${spaceId}:`, error);
      }
    }
  }

  private async handleTrackEnded(data: any): Promise<void> {
    const { spaceId } = data;
    const connection = this.spaceConnections.get(spaceId);
    
    if (connection) {
      console.log(`Track ended in space ${spaceId}`);
      
      try {
        connection.player.stop();
        connection.currentTrack = null;
        connection.isPlaying = false;
      } catch (error) {
        console.error(`Error handling track end in space ${spaceId}:`, error);
      }
    }
  }

  private async handlePlaybackPaused(data: any): Promise<void> {
    const { spaceId } = data;
    const connection = this.spaceConnections.get(spaceId);
    
    if (connection && connection.isPlaying) {
      console.log(`Playback paused in space ${spaceId}`);
      
      try {
        connection.player.pause();
        connection.isPlaying = false;
      } catch (error) {
        console.error(`Error handling playback pause in space ${spaceId}:`, error);
      }
    }
  }

  private async handlePlaybackResumed(data: any): Promise<void> {
    const { spaceId } = data;
    const connection = this.spaceConnections.get(spaceId);
    
    if (connection && !connection.isPlaying) {
      console.log(`Playback resumed in space ${spaceId}`);
      
      try {
        connection.player.resume();
        connection.isPlaying = true;
      } catch (error) {
        console.error(`Error handling playback resume in space ${spaceId}:`, error);
      }
    }
  }

  private async handleSyncResponse(data: any): Promise<void> {
    const { spaceId, currentTrack, isPlaying } = data;
    const connection = this.spaceConnections.get(spaceId);
    
    if (connection) {
      console.log(`Received sync response for space ${spaceId}`);
      
      try {
        if (currentTrack) {
          connection.currentTrack = currentTrack;
          await this.playTrackInDiscord(connection, currentTrack);
          
          if (isPlaying) {
            connection.player.resume();
            connection.isPlaying = true;
          } else {
            connection.player.pause();
            connection.isPlaying = false;
          }
        }
      } catch (error) {
        console.error(`Error handling sync response for space ${spaceId}:`, error);
      }
    }
  }

  private async playTrackInDiscord(connection: SpaceConnection, track: SpaceTrackData): Promise<void> {
    try {
      // Convert space track to Discord bot track format
      const discordTrack = {
        title: track.title,
        artist: track.artist || 'Unknown Artist',
        url: track.url,
        duration: track.duration ? this.formatDuration(track.duration) : 'Unknown',
        thumbnail: track.thumbnail || '',
        requestedBy: 'Space Sync'
      };

      // Add track to queue and play immediately
      await connection.player.addTrackToQueue(discordTrack);
      
      // If nothing is currently playing, start playing
      if (!connection.isPlaying && !connection.currentTrack) {
        await connection.player.playNext();
        connection.isPlaying = true;
      }
      
      console.log(`Started playing ${track.title} in Discord`);
    } catch (error) {
      console.error(`Error playing track in Discord:`, error);
    }
  }

  private formatDuration(durationMs: number): string {
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private async syncExistingSpaces(): Promise<void> {
    // Re-sync all existing space connections
    for (const [spaceId, connection] of this.spaceConnections) {
      try {
        await this.wsService.joinSpace(spaceId, connection.guildId);
        await this.wsService.requestSpaceSync(spaceId, connection.guildId);
      } catch (error) {
        console.error(`Error syncing space ${spaceId}:`, error);
      }
    }
  }

  // Cleanup method
  async shutdown(): Promise<void> {
    console.log('Shutting down SpaceManager...');
    
    // Stop all players
    for (const connection of this.spaceConnections.values()) {
      try {
        connection.player.stop();
      } catch (error) {
        console.error('Error stopping player during shutdown:', error);
      }
    }
    
    // Clear collections
    this.spaceConnections.clear();
    this.guildToSpace.clear();
    
    // Disconnect WebSocket
    this.wsService.disconnect();
  }
}
