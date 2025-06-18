import { searchPlaylists } from '@/actions/spotify/searchPlayList';
import { searchTracks } from '@/actions/spotify/searchTracks';
import { NextRequest, NextResponse } from 'next/server';
// import { searchTracks, searchPlaylists } from '@/lib/spotify';

export async function GET(request: NextRequest) {
  console.log("WebSocket URL:", process.env.NEXT_PUBLIC_WSS_URL);
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const type = searchParams.get('type') || 'track'; // 'track' or 'playlist'
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  try {
    let results : any;
    
    if (type === 'playlist') {
      results = await searchPlaylists(query, limit, offset);
    } else {
      results = await searchTracks(query, limit, offset);
    }
    console.log("Response Tracks",results.body.tracks.items)

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}