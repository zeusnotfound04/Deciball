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
      const existingConnection = getVoiceConnection(channel.guild.id);
      if (existingConnection) {
        this.connection = existingConnection;
      } else {
        this.connection = joinVoiceChannel({
          channelId: channel.id,
          guildId: channel.guild.id,
          adapterCreator: channel.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
        });
      }

      await entersState(this.connection, VoiceConnectionStatus.Ready, 30_000);
      this.connection.subscribe(this.player);
      
      console.log(`✅ Connected to voice channel: ${channel.name || 'Unknown'}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to voice channel:', error);
      if (this.connection) {
        this.connection.destroy();
        this.connection = null;
      }
      return false;
    }
  }

  disconnect(): void {
    if (this.connection) {
      this.connection.destroy();
      this.connection = null;
    }
    this.player.stop();
    this.queue = [];
    this.currentTrack = null;
    this.isPlaying = false;
    console.log('🔌 Disconnected from voice channel');
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
      console.error(`❌ Error searching for track "${query}":`, error);
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

      const stream = this.youtubeService.createAudioStream(track.url);
      const resource = createAudioResource(stream, {
        inlineVolume: true,
      });

      // Set volume
      if (resource.volume) {
        resource.volume.setVolume(this.volume);
      }
      
      this.player.play(resource);
      
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
