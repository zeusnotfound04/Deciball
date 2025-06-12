import { getFeaturedPlaylists } from "./getFeaturedPlaylist";
import { getSpotifyApi } from "./getToken";

export async function getTrendingTracks(limit: number = 20) {
  const api = await getSpotifyApi();
  
  try {
    // Get featured playlists and extract trending tracks
    const featuredPlaylists = await getFeaturedPlaylists(10);
    const trendingTracks = [];
    
    for (const playlist of featuredPlaylists.items.slice(0, 3)) {
      const tracks = await api.getPlaylistTracks(playlist.id, { limit: 10 });
      trendingTracks.push(...tracks.body.items);
    }
    
    // Remove duplicates and return limited results
    const uniqueTracks = trendingTracks
      .filter((item, index, self) => 
        index === self.findIndex(t => t.track?.id === item.track?.id)
      )
      .slice(0, limit);
    
    return {
      items: uniqueTracks,
      total: uniqueTracks.length
    };
  } catch (error) {
    console.error('Error getting trending tracks:', error);
    throw new Error('Failed to get trending tracks');
  }
}