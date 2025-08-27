import { NextRequest, NextResponse } from 'next/server';
import { getPlaylistTracks, extractPlaylistId } from '@/actions/spotify/getPlaylistTracks';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playlistUrl = searchParams.get('url') || searchParams.get('id');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    if (!playlistUrl) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Playlist URL or ID is required' 
        },
        { status: 400 }
      );
    }

    console.log('Processing playlist request:', playlistUrl);

    // Extract playlist ID from URL
    const playlistId = extractPlaylistId(playlistUrl);
    
    if (!playlistId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid Spotify playlist URL or ID'
        },
        { status: 400 }
      );
    }

    // Get all tracks from the playlist (handle pagination internally)
    let allTracks: any[] = [];
    let offset = 0;
    let hasMore = true;
    
    while (hasMore && allTracks.length < 200) { // Limit to 200 tracks max
      const result = await getPlaylistTracks(playlistId, limit, offset);
      allTracks = [...allTracks, ...result.tracks];
      
      hasMore = result.tracks.length === limit && offset + limit < result.total;
      offset += limit;
      
      // Prevent infinite loops
      if (offset > 1000) break;
    }

    console.log(`Retrieved ${allTracks.length} tracks from playlist`);

    return NextResponse.json({
      success: true,
      data: {
        tracks: allTracks,
        total: allTracks.length,
        playlistId: playlistId
      }
    });

  } catch (error: any) {
    console.error('Error in playlist processing API:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to process playlist',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}
