import { searchPlaylists } from '@/actions/spotify/searchPlayList';
import { searchTracks as searchSpotifyTracks } from '@/actions/spotify/searchTracks';
import { searchTracks as searchYouTubeTracks } from '@/actions/youtube/searchTracks';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const type = searchParams.get('type') || 'track'; // 'track' or 'playlist'
  // Unset  -> Spotify, falling back to YouTube Music if Spotify refuses us.
  // 'spotify'/'youtube' -> that source only, with no fallback, so the failure
  // stays visible when you are deliberately testing one provider.
  const source = searchParams.get('source');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  try {
    if (type === 'playlist') {
      // No YouTube equivalent wired up, so this stays Spotify-only.
      return NextResponse.json(await searchPlaylists(query, limit, offset));
    }

    if (source === 'youtube') {
      return NextResponse.json({ ...await searchYouTubeTracks(query, limit, offset), source: 'youtube' });
    }

    if (source === 'spotify') {
      return NextResponse.json({ ...await searchSpotifyTracks(query, limit, offset), source: 'spotify' });
    }

    // Default: Spotify first, YouTube Music as a safety net. Spotify access
    // depends on the app owner's Premium subscription and a development-mode
    // quota, both of which have taken search down before.
    try {
      return NextResponse.json({ ...await searchSpotifyTracks(query, limit, offset), source: 'spotify' });
    } catch (spotifyError: any) {
      // Log loudly: a fallback must not quietly hide a real Spotify regression.
      console.warn(
        `Spotify search failed (status ${spotifyError?.statusCode ?? 'unknown'}), falling back to YouTube Music:`,
        spotifyError?.message
      );
      return NextResponse.json({ ...await searchYouTubeTracks(query, limit, offset), source: 'youtube' });
    }
  } catch (error: any) {
    // Distinguish "our server broke" from "the upstream refused us". A failing
    // upstream is a 502; only an unattributed error is genuinely our 500.
    const upstream = error?.statusCode;
    const status = upstream === 429 ? 429 : upstream ? 502 : 500;

    return NextResponse.json(
      { error: error.message, upstreamStatus: upstream ?? null },
      { status }
    );
  }
}
