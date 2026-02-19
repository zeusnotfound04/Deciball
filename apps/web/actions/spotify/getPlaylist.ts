import { getSpotifyApi } from "@/lib/spotify";

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