import { getSpotifyApi } from "@/lib/spotify";

export async function searchAll(query: string, types: string[] = ['track', 'artist', 'album', 'playlist'], limit: number = 20, offset: number = 0) {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.search(query, types as any, { limit, offset });
    return result.body;
  } catch (error) {
    console.error('Error searching:', error);
    throw new Error('Failed to search');
  }
}
