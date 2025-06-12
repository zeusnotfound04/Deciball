import { getSpotifyApi } from "./getToken";

export async function searchTracks(query: string, limit: number = 20, offset: number = 0) {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.searchTracks(query, { limit, offset });
    return result.body.tracks;
  } catch (error) {
    console.error('Error searching tracks:', error);
    throw new Error('Failed to search tracks');
  }
}