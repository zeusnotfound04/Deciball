import { getSpotifyApi } from "@/lib/spotify";

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