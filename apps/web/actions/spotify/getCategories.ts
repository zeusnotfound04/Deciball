import { getSpotifyApi } from "@/lib/spotify";

export async function getCategories(limit: number = 20, offset: number = 0, country?: string) {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.getCategories({ limit, offset, country });
    return result.body.categories;
  } catch (error) {
    console.error('Error getting categories:', error);
    throw new Error('Failed to get categories');
  }
}