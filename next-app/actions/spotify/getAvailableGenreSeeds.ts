import { getSpotifyApi } from "@/lib/spotify";

export async function getAvailableGenreSeeds() {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.getAvailableGenreSeeds();
    return result.body.genres;
  } catch (error) {
    console.error('Error getting genre seeds:', error);
    throw new Error('Failed to get genre seeds');
  }
}