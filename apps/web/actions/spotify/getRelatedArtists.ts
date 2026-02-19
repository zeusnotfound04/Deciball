import { getSpotifyApi } from "@/lib/spotify";

export async function getRelatedArtists(artistId: string) {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.getArtistRelatedArtists(artistId);
    return result.body.artists;
  } catch (error) {
    console.error('Error getting related artists:', error);
    throw new Error('Failed to get related artists');
  }
}