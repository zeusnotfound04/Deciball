import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  createAudioPlayer,
  createAudioResource,
  DiscordGatewayAdapterCreator,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
  NoSubscriberBehavior,
  VoiceConnection,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import { VoiceBasedChannel } from 'discord.js';
import { YouTubeService } from './YouTubeService';
import { SpotifyService, SpotifyTrack } from './SpotifyService';

// Configure FFmpeg for Discord voice
const ffmpegPath = require('ffmpeg-static');
const prism = require('prism-media');
prism.FFmpeg.getInfo = () => ({ command: ffmpegPath });

export interface Track {
  title: string;
  artist: string;
  url: string;
  duration: string;
  thumbnail: string;
  requestedBy: string;
  spotifyData?: SpotifyTrack;
  youtubeData?: any;
}

export interface QueuedTrack extends Track {
  id: string;
}

export class MusicPlayer {
  private connection: VoiceConnection | null = null;
  private player: AudioPlayer;
  private queue: QueuedTrack[] = [];
  private currentTrack: QueuedTrack | null = null;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private volume: number = 0.5;
  private youtubeService: YouTubeService;
  private spotifyService: SpotifyService;
  private guildId: string;

  constructor(guildId: string) {
    this.guildId = guildId;
    this.youtubeService = new YouTubeService();
    this.spotifyService = new SpotifyService();
    
    this.player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
      },
    });

    this.setupPlayerEvents();
  }

  private setupPlayerEvents(): void {
    this.player.on(AudioPlayerStatus.Playing, () => {
      console.log('🎵 Now playing audio');
      this.isPlaying = true;
      this.isPaused = false;
    });

    this.player.on(AudioPlayerStatus.Paused, () => {
      console.log('⏸️ Audio paused');
      this.isPlaying = false;
      this.isPaused = true;
    });

    this.player.on(AudioPlayerStatus.Idle, () => {
      console.log('⏹️ Audio finished');
      this.isPlaying = false;
      this.isPaused = false;
      // Use setTimeout to avoid potential race conditions
      setTimeout(() => this.playNext(), 100);
    });

    this.player.on('error', (error: Error) => {
      console.error('❌ Audio player error:', error);
      // Use setTimeout to avoid potential race conditions
      setTimeout(() => this.playNext(), 100);
    });
  }

  async connect(channel: VoiceBasedChannel): Promise<boolean> {
    try {
      // Check if already connected to the same channel
      const existingConnection = getVoiceConnection(channel.guild.id);
      if (existingConnection && existingConnection.joinConfig.channelId === channel.id) {
        console.log(`✅ Already connected to voice channel: ${channel.name || 'Unknown'}`);
        this.connection = existingConnection;
        this.connection.subscribe(this.player);
        return true;
      }

      // Destroy existing connection if it's to a different channel
      if (existingConnection) {
        existingConnection.destroy();
        // Wait a bit for cleanup
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`🔌 Connecting to voice channel: ${channel.name || 'Unknown'}`);
      
      this.connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
        selfDeaf: true,
        selfMute: false
      });

      // Set up connection event handlers first
      this.setupConnectionEvents();

      // Try to connect with multiple attempts
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`� Connection attempt ${attempts}/${maxAttempts}`);
          
          // Wait for Ready state with timeout
          await entersState(this.connection, VoiceConnectionStatus.Ready, 10_000);
          
          // Subscribe the audio player to the connection
          this.connection.subscribe(this.player);
          
          console.log(`✅ Successfully connected to voice channel: ${channel.name || 'Unknown'}`);
          return true;
          
        } catch (error) {
          console.warn(`⚠️ Connection attempt ${attempts} failed:`, error);
          
          if (attempts === maxAttempts) {
            throw error;
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      return false;
      
    } catch (error) {
      console.error('❌ Failed to connect to voice channel after all attempts:', error);
      
      // Clean up on failure
      if (this.connection) {
        try {
          this.connection.destroy();
        } catch (destroyError) {
          console.error('Error destroying connection:', destroyError);
        }
        this.connection = null;
      }
      
      return false;
    }
  }

  private setupConnectionEvents(): void {
    if (!this.connection) return;

    this.connection.on(VoiceConnectionStatus.Ready, () => {
      console.log(`🎵 Voice connection ready`);
    });

    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        console.log('🔌 Voice connection disconnected, attempting to reconnect...');
        await Promise.race([
          entersState(this.connection!, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection!, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch (error) {
        console.log('🔌 Voice connection lost permanently');
        if (this.connection) {
          this.connection.destroy();
          this.connection = null;
        }
      }
    });

    this.connection.on('error', (error) => {
      console.error('❌ Voice connection error:', error);
    });
  }

  disconnect(): void {
    try {
      if (this.connection) {
        this.connection.destroy();
        this.connection = null;
      }
      this.player.stop();
      this.queue = [];
      this.currentTrack = null;
      this.isPlaying = false;
      this.isPaused = false;
      console.log('🔌 Disconnected from voice channel');
    } catch (error) {
      console.error('❌ Error during disconnect:', error);
    }
  }

  isConnected(): boolean {
    return this.connection !== null && 
           this.connection.state.status !== VoiceConnectionStatus.Destroyed &&
           this.connection.state.status !== VoiceConnectionStatus.Disconnected;
  }

  async searchAndAddSpotifyTrack(query: string, requestedBy: string): Promise<Track | null> {
    try {
      console.log(`🔍 Searching Spotify for: "${query}"`);
      
      const spotifyTracks = await this.spotifyService.searchTracks(query, 1);
      if (spotifyTracks.length === 0) {
        console.warn(`⚠️ No Spotify results found for: "${query}"`);
        return null;
      }

      const spotifyTrack = spotifyTracks[0];
      if (!spotifyTrack) {
        console.warn(`⚠️ Invalid Spotify track data`);
        return null;
      }

      const searchQuery = this.spotifyService.formatSearchQuery(spotifyTrack);
      
      console.log(`🎵 Found Spotify track: "${spotifyTrack.name}" by ${spotifyTrack.artists[0]?.name}`);
      console.log(`🔍 Searching YouTube for: "${searchQuery}"`);
      
      const youtubeTrack = await this.youtubeService.searchTrack(searchQuery);
      if (!youtubeTrack) {
        console.warn(`⚠️ No YouTube version found for: "${searchQuery}"`);
        return null;
      }

      const track: Track = {
        title: spotifyTrack.name,
        artist: spotifyTrack.artists.map(artist => artist.name).join(', '),
        url: youtubeTrack.url,
        duration: youtubeTrack.duration,
        thumbnail: spotifyTrack.album.images[0]?.url || youtubeTrack.thumbnail,
        requestedBy,
        spotifyData: spotifyTrack,
        youtubeData: youtubeTrack
      };

      console.log(`✅ Successfully found track: "${track.title}" on YouTube`);
      return track;
      
    } catch (error) {
      console.error(` Error searching for track "${query}":`, error);
      return null;
    }
  }

  async addTrackToQueue(track: Track): Promise<string> {
    const queuedTrack: QueuedTrack = {
      ...track,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    };

    this.queue.push(queuedTrack);
    console.log(`📝 Added to queue: "${track.title}" (Queue length: ${this.queue.length})`);

    if (!this.isPlaying && !this.currentTrack) {
      this.playNext();
    }

    return queuedTrack.id;
  }

  async playNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.currentTrack = null;
      console.log('📭 Queue is empty');
      return;
    }

    // Check if we're still connected to voice
    if (!this.connection || this.connection.state.status === VoiceConnectionStatus.Destroyed) {
      console.warn('⚠️ No voice connection available, stopping playback');
      this.currentTrack = null;
      return;
    }

    const track = this.queue.shift()!;
    this.currentTrack = track;

    try {
      console.log(`🎵 Now playing: "${track.title}" by ${track.artist}`);
      
      // Validate YouTube URL before creating stream
      if (!this.youtubeService.validateURL(track.url)) {
        console.error(`❌ Invalid YouTube URL: ${track.url}`);
        setTimeout(() => this.playNext(), 100);
        return;
      }

      // Create audio stream with error handling
      let stream;
      try {
        stream = this.youtubeService.createAudioStream(track.url, {
          filter: 'audioonly',
          quality: 'highestaudio',
          highWaterMark: 1 << 25,
          requestOptions: {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          }
        });
      } catch (streamError) {
        console.error(`❌ Failed to create audio stream for "${track.title}":`, streamError);
        setTimeout(() => this.playNext(), 1000);
        return;
      }

      const resource = createAudioResource(stream, {
        inlineVolume: true,
      });

      // Handle stream errors
      stream.on('error', (error: any) => {
        console.error(`❌ Stream error for "${track.title}":`, error);
        setTimeout(() => this.playNext(), 1000);
      });

      // Set volume
      if (resource.volume) {
        resource.volume.setVolume(this.volume);
      }
      
      // Play the resource
      this.player.play(resource);
      
      // Log successful playback start
      console.log(`✅ Started playing: "${track.title}"`);
      
    } catch (error) {
      console.error(`❌ Error playing track "${track.title}":`, error);
      // Try next track after a brief delay
      setTimeout(() => this.playNext(), 1000);
    }
  }

  pause(): boolean {
    if (this.isPlaying) {
      this.player.pause();
      return true;
    }
    return false;
  }

  resume(): boolean {
    if (this.isPaused) {
      this.player.unpause();
      return true;
    }
    return false;
  }

  stop(): void {
    this.player.stop();
    this.queue = [];
    this.currentTrack = null;
  }

  skip(): boolean {
    if (this.currentTrack) {
      this.player.stop(); // This will trigger the 'idle' event and play next
      return true;
    }
    return false;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.player.state.status === AudioPlayerStatus.Playing) {
      const resource = this.player.state.resource as AudioResource;
      resource.volume?.setVolume(this.volume);
    }
  }

  getQueue(): QueuedTrack[] {
    return [...this.queue];
  }

  getCurrentTrack(): QueuedTrack | null {
    return this.currentTrack;
  }

  getStatus(): {
    isPlaying: boolean;
    isPaused: boolean;
    currentTrack: QueuedTrack | null;
    queueLength: number;
    volume: number;
  } {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentTrack: this.currentTrack,
      queueLength: this.queue.length,
      volume: this.volume
    };
  }

  removeTrackFromQueue(trackId: string): boolean {
    const index = this.queue.findIndex(track => track.id === trackId);
    if (index > -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  clearQueue(): void {
    this.queue = [];
  }

  shuffleQueue(): void {
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = this.queue[i];
      this.queue[i] = this.queue[j]!;
      this.queue[j] = temp!;
    }
  }

  getGuildId(): string {
    return this.guildId;
  }
}
