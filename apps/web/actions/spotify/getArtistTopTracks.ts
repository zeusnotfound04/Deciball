import { getSpotifyApi } from "@/lib/spotify";

export async function getArtistTopTracks(artistId: string, country: string = 'US') {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.getArtistTopTracks(artistId, country);
    return result.body.tracks;
  } catch (error) {
    console.error('Error getting artist top tracks:', error);
    throw new Error('Failed to get artist top tracks');
  }
}