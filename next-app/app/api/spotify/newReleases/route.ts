import { getNewReleases } from '@/actions/spotify/getNewReleases';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const country = searchParams.get('country') || undefined;

    console.log('Fetching new releases with params:', { limit, offset, country });

    const result = await getNewReleases(limit, offset, country);

    if (!result || !result.items) {
      return NextResponse.json(
        { error: 'No new releases returned from Spotify' },
        { status: 404 }
      );
    }

    console.log('New releases fetched:', { 
      albumsCount: result.items.length,
      success: true
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error in new releases API:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch new releases',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}
