import { getSpotifyApi } from "@/lib/spotify";

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