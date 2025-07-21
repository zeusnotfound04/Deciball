import { NextRequest, NextResponse } from 'next/server';
import { searchTracks as searchSpotifyTracks } from '@/actions/spotify/searchTracks';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const source = searchParams.get('source');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  if (!query) {
    return NextResponse.json(
      { 
        success: false,
        message: 'Query parameter is required' 
      },
      { status: 400 }
    );
  }

  try {
    let allResults: any[] = [];

    if (!source || source === 'spotify') {
      try {
        console.log('Searching Spotify for:', query);
        const spotifyResults = await searchSpotifyTracks(query, limit, offset);
        
        if (spotifyResults?.body?.tracks?.items) {
          const spotifyTracks = spotifyResults.body.tracks.items.map((track: any) => ({
            id: track.id,
            name: track.name,
            url: track.external_urls.spotify,
            artistes: {
              primary: track.artists.map((artist: any) => ({
                name: artist.name,
                id: artist.id,
                image: artist.images?.[0]?.url || '',
                url: artist.external_urls.spotify
              }))
            },
            image: track.album.images.map((img: any) => ({
              url: img.url,
              quality: `${img.width}x${img.height}`
            })),
            downloadUrl: [{
              url: `spotify:track:${track.id}`,
              quality: 'spotify'
            }],
            addedBy: '',
            source: 'spotify',
            voteCount: 0,
            duration: Math.floor(track.duration_ms / 1000),
            album: track.album.name,
            preview_url: track.preview_url
          }));
          
          allResults = [...allResults, ...spotifyTracks];
        }
      } catch (spotifyError) {
        console.error('Spotify search error:', spotifyError);
      }
    }

    if (!source || source === 'youtube') {
      try {
        console.log('Searching YouTube/JioSaavn for:', query);
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}/api/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`);
        const youtubeResults = await response.json();
        
        if (youtubeResults?.data?.results) {
          const youtubeTracks = youtubeResults.data.results.map((track: any) => ({
            ...track,
            source: 'youtube'
          }));
          
          allResults = [...allResults, ...youtubeTracks];
        }
      } catch (youtubeError) {
        console.error('YouTube search error:', youtubeError);
      }
    }

    allResults.sort((a, b) => {
      const aExactMatch = a.name.toLowerCase().includes(query.toLowerCase());
      const bExactMatch = b.name.toLowerCase().includes(query.toLowerCase());
      
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;
      
      return 0;
    });

    return NextResponse.json({
      success: true,
      data: {
        total: allResults.length,
        start: offset,
        results: allResults.slice(0, limit)
      }
    });

  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: error.message || 'Search failed'
      },
      { status: 500 }
    );
  }
}
