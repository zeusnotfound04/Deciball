import { getSpotifyApi } from "@/lib/spotify";

export async function searchTracks(query: string, limit: number = 20, offset: number = 0) {
  const api = await getSpotifyApi();
  console.log(api)
  
  try {
    const result = await api.searchTracks(query, { limit, offset });
    
    return result;
  } catch (error) {
    console.error('Error searching tracks:', error);
    throw new Error('Failed to search tracks');
  }
}