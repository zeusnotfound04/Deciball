import { getSpotifyApi } from "@/lib/spotify";

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
