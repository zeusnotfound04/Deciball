// lib/spotify.ts
import SpotifyWebApi from 'spotify-web-api-node';

// Initialize Spotify API with credentials
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

// Cache for access token
let accessToken: string | null = null;
let tokenExpiryTime: number = 0;

/**
 * Get or refresh Spotify access token using client credentials flow
 */
async function getAccessToken(): Promise<string> {
  const now = Date.now();
  
  // Return cached token if it's still valid (with 5 minute buffer)
  if (accessToken && now < tokenExpiryTime - 300000) {
    return accessToken;
  }

  try {
    const data = await spotifyApi.clientCredentialsGrant();
    accessToken = data.body.access_token;
    tokenExpiryTime = now + (data.body.expires_in * 1000);
    
    spotifyApi.setAccessToken(accessToken);
    return accessToken;
  } catch (error) {
    console.error('Error getting Spotify access token:', error);
    throw new Error('Failed to authenticate with Spotify');
  }
}

/**
 * Initialize Spotify API with fresh access token
 */
export async function getSpotifyApi(): Promise<SpotifyWebApi> {
  await getAccessToken();
  return spotifyApi;
}

/**
 * Search for tracks
 */
export async function searchTracks(query: string, limit: number = 20, offset: number = 0) {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.searchTracks(query, { limit, offset });
    return result.body.tracks;
  } catch (error) {
    console.error('Error searching tracks:', error);
    throw new Error('Failed to search tracks');
  }
}

/**
 * Search for playlists
 */
export async function searchPlaylists(query: string, limit: number = 20, offset: number = 0) {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.searchPlaylists(query, { limit, offset });
    return result.body.playlists;
  } catch (error) {
    console.error('Error searching playlists:', error);
    throw new Error('Failed to search playlists');
  }
}

/**
 * Get playlist by ID
 */
export async function getPlaylist(playlistId: string) {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.getPlaylist(playlistId);
    return result.body;
  } catch (error) {
    console.error('Error getting playlist:', error);
    throw new Error('Failed to get playlist');
  }
}

/**
 * Get playlist tracks
 */
export async function getPlaylistTracks(playlistId: string, limit: number = 50, offset: number = 0) {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.getPlaylistTracks(playlistId, { limit, offset });
    return result.body;
  } catch (error) {
    console.error('Error getting playlist tracks:', error);
    throw new Error('Failed to get playlist tracks');
  }
}

/**
 * Get track by ID
 */
export async function getTrack(trackId: string) {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.getTrack(trackId);
    return result.body;
  } catch (error) {
    console.error('Error getting track:', error);
    throw new Error('Failed to get track');
  }
}

/**
 * Get multiple tracks by IDs
 */
export async function getTracks(trackIds: string[]) {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.getTracks(trackIds);
    return result.body.tracks;
  } catch (error) {
    console.error('Error getting tracks:', error);
    throw new Error('Failed to get tracks');
  }
}

/**
 * Get album by ID
 */
export async function getAlbum(albumId: string) {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.getAlbum(albumId);
    return result.body;
  } catch (error) {
    console.error('Error getting album:', error);
    throw new Error('Failed to get album');
  }
}

/**
 * Get artist by ID
 */
export async function getArtist(artistId: string) {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.getArtist(artistId);
    return result.body;
  } catch (error) {
    console.error('Error getting artist:', error);
    throw new Error('Failed to get artist');
  }
}

/**
 * Get artist's top tracks
 */
export async function getArtistTopTracks(artistId: string, country: string = 'US') {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.getArtistTopTracks(artistId, country);
    return result.body.tracks;
  } catch (error) {
    console.error('Error getting artist top tracks:', error);
    throw new Error('Failed to get artist top tracks');
  }
}

/**
 * Get featured playlists
 */
export async function getFeaturedPlaylists(limit: number = 20, offset: number = 0, country?: string) {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.getFeaturedPlaylists({ limit, offset, country });
    return result.body.playlists;
  } catch (error) {
    console.error('Error getting featured playlists:', error);
    throw new Error('Failed to get featured playlists');
  }
}

/**
 * Get new releases
 */
export async function getNewReleases(limit: number = 20, offset: number = 0, country?: string) {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.getNewReleases({ limit, offset, country });
    return result.body.albums;
  } catch (error) {
    console.error('Error getting new releases:', error);
    throw new Error('Failed to get new releases');
  }
}

/**
 * Get categories
 */
export async function getCategories(limit: number = 20, offset: number = 0, country?: string) {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.getCategories({ limit, offset, country });
    return result.body.categories;
  } catch (error) {
    console.error('Error getting categories:', error);
    throw new Error('Failed to get categories');
  }
}

/**
 * Get category playlists
 */
export async function getCategoryPlaylists(categoryId: string, limit: number = 20, offset: number = 0, country?: string) {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.getPlaylistsForCategory(categoryId, { limit, offset, country });
    return result.body.playlists;
  } catch (error) {
    console.error('Error getting category playlists:', error);
    throw new Error('Failed to get category playlists');
  }
}

/**
 * Get audio features for a track
 */
export async function getAudioFeatures(trackId: string) {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.getAudioFeaturesForTrack(trackId);
    return result.body;
  } catch (error) {
    console.error('Error getting audio features:', error);
    throw new Error('Failed to get audio features');
  }
}

/**
 * Get audio features for multiple tracks
 */
export async function getAudioFeaturesForTracks(trackIds: string[]) {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.getAudioFeaturesForTracks(trackIds);
    return result.body.audio_features;
  } catch (error) {
    console.error('Error getting audio features for tracks:', error);
    throw new Error('Failed to get audio features for tracks');
  }
}

/**
 * Get audio analysis for a track
 */
export async function getAudioAnalysis(trackId: string) {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.getAudioAnalysisForTrack(trackId);
    return result.body;
  } catch (error) {
    console.error('Error getting audio analysis:', error);
    throw new Error('Failed to get audio analysis');
  }
}

/**
 * Get recommendations based on seed tracks, artists, or genres
 */
export async function getRecommendations(options: {
  seed_tracks?: string[];
  seed_artists?: string[];
  seed_genres?: string[];
  limit?: number;
  target_acousticness?: number;
  target_danceability?: number;
  target_energy?: number;
  target_instrumentalness?: number;
  target_liveness?: number;
  target_loudness?: number;
  target_speechiness?: number;
  target_tempo?: number;
  target_valence?: number;
  min_acousticness?: number;
  max_acousticness?: number;
  min_danceability?: number;
  max_danceability?: number;
  min_energy?: number;
  max_energy?: number;
  min_instrumentalness?: number;
  max_instrumentalness?: number;
  min_liveness?: number;
  max_liveness?: number;
  min_loudness?: number;
  max_loudness?: number;
  min_popularity?: number;
  max_popularity?: number;
  min_speechiness?: number;
  max_speechiness?: number;
  min_tempo?: number;
  max_tempo?: number;
  min_valence?: number;
  max_valence?: number;
}) {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.getRecommendations(options);
    return result.body;
  } catch (error) {
    console.error('Error getting recommendations:', error);
    throw new Error('Failed to get recommendations');
  }
}

/**
 * Get available genre seeds
 */
export async function getAvailableGenreSeeds() {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.getAvailableGenreSeeds();
    return result.body.genres;
  } catch (error) {
    console.error('Error getting genre seeds:', error);
    throw new Error('Failed to get genre seeds');
  }
}

/**
 * Get artist's albums
 */
export async function getArtistAlbums(artistId: string, options?: {
  include_groups?: string;
  country?: string;
  limit?: number;
  offset?: number;
}) {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.getArtistAlbums(artistId, options);
    return result.body;
  } catch (error) {
    console.error('Error getting artist albums:', error);
    throw new Error('Failed to get artist albums');
  }
}

/**
 * Get related artists
 */
export async function getRelatedArtists(artistId: string) {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.getArtistRelatedArtists(artistId);
    return result.body.artists;
  } catch (error) {
    console.error('Error getting related artists:', error);
    throw new Error('Failed to get related artists');
  }
}

/**
 * Get album tracks
 */
export async function getAlbumTracks(albumId: string, limit: number = 50, offset: number = 0) {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.getAlbumTracks(albumId, { limit, offset });
    return result.body;
  } catch (error) {
    console.error('Error getting album tracks:', error);
    throw new Error('Failed to get album tracks');
  }
}

/**
 * Get multiple albums
 */
export async function getAlbums(albumIds: string[]) {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.getAlbums(albumIds);
    return result.body.albums;
  } catch (error) {
    console.error('Error getting albums:', error);
    throw new Error('Failed to get albums');
  }
}

/**
 * Search for everything (tracks, artists, albums, playlists)
 */
export async function searchAll(query: string, types: string[] = ['track', 'artist', 'album', 'playlist'], limit: number = 20, offset: number = 0) {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.search(query, types as any, { limit, offset });
    return result.body;
  } catch (error) {
    console.error('Error searching:', error);
    throw new Error('Failed to search');
  }
}

/**
 * Get popular tracks in a country
 */
export async function getPopularTracks(country: string = 'US', limit: number = 50) {
  const api = await getSpotifyApi();
  
  try {
    // Use the "Top 50 - Global" or country-specific charts
    const chartPlaylistIds: { [key: string]: string } = {
      'US': '37i9dQZEVXbLRQDuF5jeBp',
      'GB': '37i9dQZEVXbLnolsZ8PSNw',
      'DE': '37i9dQZEVXbJiZcmkrIHGU',
      'FR': '37i9dQZEVXbIPWwFssbupI',
      'CA': '37i9dQZEVXbKj23U1GF4IR',
      'AU': '37i9dQZEVXbJPcfkRz0wJ0',
      'global': '37i9dQZEVXbMDoHDwVN2tF'
    };
    
    const playlistId = chartPlaylistIds[country.toUpperCase()] || chartPlaylistIds['global'];
    const result = await api.getPlaylistTracks(playlistId, { limit });
    return result.body;
  } catch (error) {
    console.error('Error getting popular tracks:', error);
    throw new Error('Failed to get popular tracks');
  }
}

/**
 * Get trending tracks by analyzing recent playlists
 */
export async function getTrendingTracks(limit: number = 20) {
  const api = await getSpotifyApi();
  
  try {
    // Get featured playlists and extract trending tracks
    const featuredPlaylists = await getFeaturedPlaylists(10);
    const trendingTracks = [];
    
    for (const playlist of featuredPlaylists.items.slice(0, 3)) {
      const tracks = await api.getPlaylistTracks(playlist.id, { limit: 10 });
      trendingTracks.push(...tracks.body.items);
    }
    
    // Remove duplicates and return limited results
    const uniqueTracks = trendingTracks
      .filter((item, index, self) => 
        index === self.findIndex(t => t.track?.id === item.track?.id)
      )
      .slice(0, limit);
    
    return {
      items: uniqueTracks,
      total: uniqueTracks.length
    };
  } catch (error) {
    console.error('Error getting trending tracks:', error);
    throw new Error('Failed to get trending tracks');
  }
}

/**
 * Analyze playlist for insights
 */
export async function analyzePlaylist(playlistId: string) {
  const api = await getSpotifyApi();
  
  try {
    const playlist = await getPlaylist(playlistId);
    const tracks = await getPlaylistTracks(playlistId, 100);
    
    // Get track IDs for audio features
    const trackIds = tracks.items
      .filter(item => item.track && item.track.id)
      .map(item => item.track!.id);
    
    if (trackIds.length === 0) {
      throw new Error('No valid tracks found in playlist');
    }
    
    const audioFeatures = await getAudioFeaturesForTracks(trackIds);
    
    // Calculate averages
    const validFeatures = audioFeatures.filter(f => f !== null);
    const avgFeatures = validFeatures.reduce((acc, feature) => {
      acc.acousticness += feature.acousticness;
      acc.danceability += feature.danceability;
      acc.energy += feature.energy;
      acc.instrumentalness += feature.instrumentalness;
      acc.liveness += feature.liveness;
      acc.loudness += feature.loudness;
      acc.speechiness += feature.speechiness;
      acc.tempo += feature.tempo;
      acc.valence += feature.valence;
      return acc;
    }, {
      acousticness: 0,
      danceability: 0,
      energy: 0,
      instrumentalness: 0,
      liveness: 0,
      loudness: 0,
      speechiness: 0,
      tempo: 0,
      valence: 0
    });
    
    const count = validFeatures.length;
    Object.keys(avgFeatures).forEach(key => {
      avgFeatures[key as keyof typeof avgFeatures] /= count;
    });
    
    // Get genre distribution
    const genres: { [key: string]: number } = {};
    tracks.items.forEach(item => {
      if (item.track?.artists) {
        item.track.artists.forEach(artist => {
          // Note: Genre info requires separate artist API calls
          // This is a simplified version
        });
      }
    });
    
    return {
      playlist: {
        name: playlist.name,
        description: playlist.description,
        followers: playlist.followers.total,
        tracks: playlist.tracks.total
      },
      audioFeatures: avgFeatures,
      trackCount: count,
      insights: {
        mood: avgFeatures.valence > 0.5 ? 'positive' : 'negative',
        energy: avgFeatures.energy > 0.7 ? 'high' : avgFeatures.energy > 0.4 ? 'medium' : 'low',
        danceability: avgFeatures.danceability > 0.7 ? 'very danceable' : avgFeatures.danceability > 0.5 ? 'danceable' : 'not very danceable'
      }
    };
  } catch (error) {
    console.error('Error analyzing playlist:', error);
    throw new Error('Failed to analyze playlist');
  }
}

/**
 * Get similar tracks based on audio features
 */
export async function getSimilarTracks(trackId: string, limit: number = 20) {
  try {
    const audioFeatures = await getAudioFeatures(trackId);
    const track = await getTrack(trackId);
    
    const recommendations = await getRecommendations({
      seed_tracks: [trackId],
      limit,
      target_acousticness: audioFeatures.acousticness,
      target_danceability: audioFeatures.danceability,
      target_energy: audioFeatures.energy,
      target_valence: audioFeatures.valence,
      target_tempo: audioFeatures.tempo
    });
    
    return {
      originalTrack: track,
      audioFeatures,
      similarTracks: recommendations.tracks
    };
  } catch (error) {
    console.error('Error getting similar tracks:', error);
    throw new Error('Failed to get similar tracks');
  }
}

/**
 * Create a mood-based playlist recommendation
 */
export async function getMoodBasedTracks(mood: 'happy' | 'sad' | 'energetic' | 'chill' | 'focus', limit: number = 20) {
  const moodSettings = {
    happy: {
      target_valence: 0.8,
      target_energy: 0.7,
      target_danceability: 0.7,
      seed_genres: ['pop', 'dance', 'funk']
    },
    sad: {
      target_valence: 0.2,
      target_energy: 0.3,
      target_acousticness: 0.7,
      seed_genres: ['indie', 'alternative', 'folk']
    },
    energetic: {
      target_energy: 0.9,
      target_danceability: 0.8,
      target_tempo: 140,
      seed_genres: ['electronic', 'rock', 'pop']
    },
    chill: {
      target_valence: 0.5,
      target_energy: 0.3,
      target_acousticness: 0.6,
      seed_genres: ['ambient', 'chill', 'indie']
    },
    focus: {
      target_instrumentalness: 0.8,
      target_energy: 0.4,
      target_speechiness: 0.1,
      seed_genres: ['ambient', 'classical', 'electronic']
    }
  };
  
  try {
    const settings = moodSettings[mood];
    const recommendations = await getRecommendations({
      ...settings,
      limit
    });
    
    return {
      mood,
      tracks: recommendations.tracks,
      settings: settings
    };
  } catch (error) {
    console.error('Error getting mood-based tracks:', error);
    throw new Error('Failed to get mood-based tracks');
  }
}