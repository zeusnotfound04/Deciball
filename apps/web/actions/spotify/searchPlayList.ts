import { getSpotifyApi } from "@/lib/spotify";

export async function searchPlaylists(query: string, limit: number = 20, offset: number = 0) {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.searchPlaylists(query, { limit, offset });
    return result.body.playlists;
  } catch (error: any) {
    console.error('Error searching playlists:', error?.statusCode, error?.body ?? error?.message);
    throw Object.assign(new Error('Failed to search playlists'), { statusCode: error?.statusCode });
  }
}
