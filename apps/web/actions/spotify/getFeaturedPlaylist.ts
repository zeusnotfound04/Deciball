import { getSpotifyApi } from "@/lib/spotify";

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