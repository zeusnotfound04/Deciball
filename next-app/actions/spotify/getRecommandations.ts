import { getSpotifyApi } from "@/lib/spotify";

export async function getRecommendations(options: {
  seed_tracks?: string[];
  seed_artists?: string[];
  seed_genres?: string[];
  limit?: number;
  market?: string;
  target_acousticness?: number;
  target_danceability?: number;
  target_energy?: number;
  target_instrumentalness?: number;
  target_liveness?: number;
  target_loudness?: number;
  target_speechiness?: number;
  target_tempo?: number;
  target_valence?: number;
  target_popularity?: number;
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
    const hasSeeds = (options.seed_tracks && options.seed_tracks.length > 0) ||
                     (options.seed_artists && options.seed_artists.length > 0) ||
                     (options.seed_genres && options.seed_genres.length > 0);
    
    if (!hasSeeds) {
      throw new Error('At least one seed is required (tracks, artists, or genres)');
    }

    const cleanOptions: any = {
      limit: options.limit || 20
    };

    if (options.seed_tracks && options.seed_tracks.length > 0) {
      cleanOptions.seed_tracks = options.seed_tracks;
    }
    if (options.seed_artists && options.seed_artists.length > 0) {
      cleanOptions.seed_artists = options.seed_artists;
    }
    if (options.seed_genres && options.seed_genres.length > 0) {
      cleanOptions.seed_genres = options.seed_genres;
    }

    if (options.target_acousticness !== undefined) cleanOptions.target_acousticness = options.target_acousticness;
    if (options.target_danceability !== undefined) cleanOptions.target_danceability = options.target_danceability;
    if (options.target_energy !== undefined) cleanOptions.target_energy = options.target_energy;
    if (options.target_instrumentalness !== undefined) cleanOptions.target_instrumentalness = options.target_instrumentalness;
    if (options.target_liveness !== undefined) cleanOptions.target_liveness = options.target_liveness;
    if (options.target_loudness !== undefined) cleanOptions.target_loudness = options.target_loudness;
    if (options.target_speechiness !== undefined) cleanOptions.target_speechiness = options.target_speechiness;
    if (options.target_tempo !== undefined) cleanOptions.target_tempo = options.target_tempo;
    if (options.target_valence !== undefined) cleanOptions.target_valence = options.target_valence;
    if (options.target_popularity !== undefined) cleanOptions.target_popularity = options.target_popularity;

    if (options.min_acousticness !== undefined) cleanOptions.min_acousticness = options.min_acousticness;
    if (options.max_acousticness !== undefined) cleanOptions.max_acousticness = options.max_acousticness;
    if (options.min_danceability !== undefined) cleanOptions.min_danceability = options.min_danceability;
    if (options.max_danceability !== undefined) cleanOptions.max_danceability = options.max_danceability;
    if (options.min_energy !== undefined) cleanOptions.min_energy = options.min_energy;
    if (options.max_energy !== undefined) cleanOptions.max_energy = options.max_energy;
    if (options.min_instrumentalness !== undefined) cleanOptions.min_instrumentalness = options.min_instrumentalness;
    if (options.max_instrumentalness !== undefined) cleanOptions.max_instrumentalness = options.max_instrumentalness;
    if (options.min_liveness !== undefined) cleanOptions.min_liveness = options.min_liveness;
    if (options.max_liveness !== undefined) cleanOptions.max_liveness = options.max_liveness;
    if (options.min_loudness !== undefined) cleanOptions.min_loudness = options.min_loudness;
    if (options.max_loudness !== undefined) cleanOptions.max_loudness = options.max_loudness;
    if (options.min_popularity !== undefined) cleanOptions.min_popularity = options.min_popularity;
    if (options.max_popularity !== undefined) cleanOptions.max_popularity = options.max_popularity;
    if (options.min_speechiness !== undefined) cleanOptions.min_speechiness = options.min_speechiness;
    if (options.max_speechiness !== undefined) cleanOptions.max_speechiness = options.max_speechiness;
    if (options.min_tempo !== undefined) cleanOptions.min_tempo = options.min_tempo;
    if (options.max_tempo !== undefined) cleanOptions.max_tempo = options.max_tempo;
    if (options.min_valence !== undefined) cleanOptions.min_valence = options.min_valence;
    if (options.max_valence !== undefined) cleanOptions.max_valence = options.max_valence;

    console.log('Calling Spotify API with clean options:', cleanOptions);
    console.log('API instance ready:', !!api);
    console.log('Access token set:', !!api.getAccessToken());
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const result = await api.getRecommendations(cleanOptions);
    console.log('Spotify API returned:', { success: true, tracksCount: result?.body?.tracks?.length });
    return result.body;
  } catch (error: any) {
    console.error('Error getting recommendations:', error);
    console.error('Error details:', {
      message: error.message,
      statusCode: error.statusCode,
      body: error.body
    });
    
    if (error.statusCode === 404) {
      throw new Error('Spotify recommendations endpoint not found. Check your API setup.');
    } else if (error.statusCode === 401) {
      throw new Error('Spotify authentication failed. Check your client credentials.');
    } else if (error.statusCode === 400) {
      throw new Error(`Invalid request parameters: ${error.body?.error?.message || 'Bad Request'}`);
    } else {
      throw new Error(`Spotify API error: ${error.message || 'Unknown error'}`);
    }
  }
}
