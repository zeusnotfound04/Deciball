import { getSpotifyApi } from "@/lib/spotify";

export async function getPopularTracks(country: string = 'US', limit: number = 50) {
  const api = await getSpotifyApi();
  
  try {
    const chartPlaylistIds: { [key: string]: string } = {
      'US': '37i9dQZEVXbLRQDuF5jeBp',
      'GB': '37i9dQZEVXbLnolsZ8PSNw',
      'DE': '37i9dQZEVXbJiZcmkrIHGU',
      'FR': '37i9dQZEVXbIPWwFssbupI',
      'CA': '37i9dQZEVXbKj23U1GF4IR',
      'AU': '37i9dQZEVXbJPcfkRz0wJ0',
      'global': '37i9dQZEVXbMDoHDwVN2tF'
    };
    
    const playlistId = chartPlaylistIds[country.toUpperCase()] || chartPlaylistIds['global'];
    const result = await api.getPlaylistTracks(playlistId, { limit });
    return result.body;
  } catch (error) {
    console.error('Error getting popular tracks:', error);
    throw new Error('Failed to get popular tracks');
  }
}