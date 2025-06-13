import { getSpotifyApi } from "@/lib/spotify";

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
