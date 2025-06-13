import { getSpotifyApi } from "@/lib/spotify";

export async function getAlbum(albumId: string) {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.getAlbum(albumId);
    return result.body;
  } catch (error) {
    console.error('Error getting album:', error);
    throw new Error('Failed to get album');
  }
}
