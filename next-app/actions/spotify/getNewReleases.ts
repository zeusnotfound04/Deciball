import { getSpotifyApi } from "@/lib/spotify";

export async function getNewReleases(limit: number = 20, offset: number = 0, country?: string) {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.getNewReleases({ limit, offset, country });
    return result.body.albums;
  } catch (error) {
    console.error('Error getting new releases:', error);
    throw new Error('Failed to get new releases');
  }
}
