import { getSpotifyApi } from "@/lib/spotify";

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
