import { getSpotifyApi } from "@/lib/spotify";

export async function getPlaylistTracks(playlistId: string, limit: number = 50, offset: number = 0) {
  const api = await getSpotifyApi();
  
  try {
    // Extract playlist ID from full URL if provided
    const extractedId = playlistId.includes('spotify.com/playlist/') 
      ? playlistId.split('playlist/')[1].split('?')[0]
      : playlistId;
    
    console.log('Fetching playlist tracks for ID:', extractedId);
    
    const result = await api.getPlaylistTracks(extractedId, { 
      limit, 
      offset,
      fields: 'items(track(id,name,artists(name,id),album(name,images),duration_ms,external_urls)),total,limit,offset'
    });
    
    // Filter out null tracks and local files
    const validTracks = result.body.items
      .filter(item => item.track && item.track.id && !item.track.is_local)
      .map(item => ({
        id: item.track!.id,
        name: item.track!.name,
        artists: item.track!.artists.map((artist: any) => ({
          id: artist.id,
          name: artist.name
        })),
        album: {
          name: item.track!.album.name,
          images: item.track!.album.images || []
        },
        duration_ms: item.track!.duration_ms,
        external_urls: item.track!.external_urls
      }));

    return {
      tracks: validTracks,
      total: result.body.total,
      limit: result.body.limit,
      offset: result.body.offset
    };
  } catch (error: any) {
    console.error('Error getting playlist tracks:', error);
    if (error.statusCode === 404) {
      throw new Error('Playlist not found or is private');
    } else if (error.statusCode === 401) {
      throw new Error('Unauthorized access to playlist');
    }
    throw new Error('Failed to get playlist tracks');
  }
}

// Helper function to extract playlist ID from various Spotify URL formats
export function extractPlaylistId(url: string): string | null {
  const patterns = [
    /spotify:playlist:([a-zA-Z0-9]+)/,
    /open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
    /^[a-zA-Z0-9]+$/ // Direct ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }
  
  return null;
}
