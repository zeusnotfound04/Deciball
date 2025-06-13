import { getSpotifyApi } from "@/lib/spotify";

export async function getArtistAlbums(artistId: string, options?: {
  include_groups?: string;
  country?: string;
  limit?: number;
  offset?: number;
}) {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.getArtistAlbums(artistId, options);
    return result.body;
  } catch (error) {
    console.error('Error getting artist albums:', error);
    throw new Error('Failed to get artist albums');
  }
}