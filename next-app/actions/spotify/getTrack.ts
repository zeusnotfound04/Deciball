import { getSpotifyApi } from "@/lib/spotify";

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