import SpotifyWebApi from 'spotify-web-api-node';

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{
    id: string;
    name: string;
    external_urls: { spotify: string };
  }>;
  album: {
    id: string;
    name: string;
    images: Array<{
      height?: number | undefined;
      width?: number | undefined;
      url: string;
    }>;
  };
  external_urls: { spotify: string };
  preview_url?: string | null;
  duration_ms: number;
  popularity: number;
}

export class SpotifyService {
  private spotifyApi: SpotifyWebApi;
  private tokenExpirationTime: number = 0;

  constructor() {
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      throw new Error('❌ Spotify Client ID and Secret are required in environment variables');
    }

    this.spotifyApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    });
  }

  private async ensureAccessToken(): Promise<void> {
    if (Date.now() >= this.tokenExpirationTime) {
      try {
        const data = await this.spotifyApi.clientCredentialsGrant();
        this.spotifyApi.setAccessToken(data.body['access_token']);
        this.tokenExpirationTime = Date.now() + (data.body['expires_in'] * 1000) - 60000; // Refresh 1 minute early
        console.log('✅ Spotify access token refreshed');
      } catch (error) {
        console.error('❌ Error getting Spotify access token:', error);
        throw error;
      }
    }
  }

  async searchTracks(query: string, limit: number = 10): Promise<SpotifyTrack[]> {
    try {
      await this.ensureAccessToken();
      
      const response = await this.spotifyApi.searchTracks(query, { limit });
      
      if (!response.body.tracks || !response.body.tracks.items) {
        return [];
      }

      return response.body.tracks.items.map(track => ({
        id: track.id,
        name: track.name,
        artists: track.artists.map(artist => ({
          id: artist.id,
          name: artist.name,
          external_urls: { spotify: artist.external_urls.spotify }
        })),
        album: {
          id: track.album.id,
          name: track.album.name,
          images: track.album.images.map(img => ({
            height: img.height ?? undefined,
            width: img.width ?? undefined,
            url: img.url
          }))
        },
        external_urls: { spotify: track.external_urls.spotify },
        preview_url: track.preview_url,
        duration_ms: track.duration_ms,
        popularity: track.popularity
      }));
      
    } catch (error) {
      console.error('❌ Error searching Spotify tracks:', error);
      return [];
    }
  }

  async getTrackById(id: string): Promise<SpotifyTrack | null> {
    try {
      await this.ensureAccessToken();
      
      const response = await this.spotifyApi.getTrack(id);
      const track = response.body;
      
      return {
        id: track.id,
        name: track.name,
        artists: track.artists.map(artist => ({
          id: artist.id,
          name: artist.name,
          external_urls: { spotify: artist.external_urls.spotify }
        })),
        album: {
          id: track.album.id,
          name: track.album.name,
          images: track.album.images.map(img => ({
            height: img.height ?? undefined,
            width: img.width ?? undefined,
            url: img.url
          }))
        },
        external_urls: { spotify: track.external_urls.spotify },
        preview_url: track.preview_url,
        duration_ms: track.duration_ms,
        popularity: track.popularity
      };
      
    } catch (error) {
      console.error('❌ Error getting Spotify track:', error);
      return null;
    }
  }

  formatSearchQuery(track: SpotifyTrack): string {
    const artists = track.artists.map(artist => artist.name).join(' ');
    return `${track.name} ${artists}`;
  }

  formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${parseInt(seconds) < 10 ? '0' : ''}${seconds}`;
  }
}
