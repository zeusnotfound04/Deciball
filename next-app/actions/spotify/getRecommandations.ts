import { getSpotifyApi } from "@/lib/spotify";

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
