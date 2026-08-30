import { searchTracks as searchSpotifyTracks } from '@/actions/spotify/searchTracks';
import { searchTracks as searchYouTubeTracks } from '@/actions/youtube/searchTracks';
import { NextResponse } from 'next/server';

// Pre-defined suggestion songs — title + artist for search
const SUGGESTION_QUERIES = [
  { title: "After Hours", artist: "The Weeknd" },
  { title: "DAMN.", artist: "Kendrick Lamar" },
  { title: "Utopia", artist: "Travis Scott" },
  { title: "Blonde", artist: "Frank Ocean" },
  { title: "Rockstar", artist: "A.R. Rahman" },
  { title: "Nanchaku", artist: "Seedhe Maut" },
  { title: "Tadipaar", artist: "MC STAN" },
  { title: "Tere Bina", artist: "A.R. Rahman" },
  { title: "I Wonder", artist: "Kanye West" },
  { title: "17", artist: "XXXTENTACION" },
];

// In-memory cache — survives across requests within the same server process
let cachedSuggestions: any[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export async function GET() {
  // Return cache if fresh
  if (cachedSuggestions && Date.now() - cacheTimestamp < CACHE_TTL) {
    return NextResponse.json({ suggestions: cachedSuggestions, cached: true });
  }

  try {
    const results = await Promise.allSettled(
      SUGGESTION_QUERIES.map(async ({ title, artist }) => {
        const query = `${title} ${artist}`;

        // Try Spotify first
        try {
          const spotifyResult = await searchSpotifyTracks(query, 1, 0);
          const track = spotifyResult?.body?.tracks?.items?.[0];

          if (track) {
            return {
              title: track.name,
              artist: track.artists?.map((a: any) => a.name).join(', ') || artist,
              img: track.album?.images?.[0]?.url || '',
              smallImg: track.album?.images?.[track.album.images.length - 1]?.url || '',
              spotifyId: track.id,
              spotifyUrl: track.external_urls?.spotify || '',
              album: track.album?.name || '',
              duration_ms: track.duration_ms || 0,
              source: 'spotify' as const,
            };
          }
        } catch {
          // Spotify failed, try YouTube
        }

        // Fallback: YouTube Music
        try {
          const ytResult = await searchYouTubeTracks(query, 1, 0);
          const track = ytResult?.body?.tracks?.items?.[0];

          if (track) {
            return {
              title: track.name,
              artist: track.artists?.map((a: any) => a.name).join(', ') || artist,
              img: track.album?.images?.[0]?.url || '',
              smallImg: track.album?.images?.[track.album.images.length - 1]?.url || '',
              spotifyId: '',
              spotifyUrl: '',
              album: track.album?.name || '',
              duration_ms: track.duration_ms || 0,
              source: 'youtube' as const,
            };
          }
        } catch {
          // Both failed
        }

        // Ultimate fallback — return the query data so UI still renders
        return {
          title,
          artist,
          img: '',
          smallImg: '',
          spotifyId: '',
          spotifyUrl: '',
          album: '',
          duration_ms: 0,
          source: 'fallback' as const,
        };
      })
    );

    const suggestions = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => r.value);

    // Cache it
    cachedSuggestions = suggestions;
    cacheTimestamp = Date.now();

    return NextResponse.json({ suggestions, cached: false });
  } catch (error: any) {
    console.error('Error fetching suggestions:', error);
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}
