import { getSpotifyApi } from "@/lib/spotify";

// Spotify rejects limit > 10 with 400 "Invalid limit" for apps in development
// mode. Page around it instead of silently returning fewer results.
const MAX_LIMIT_PER_REQUEST = 10;
const MAX_PAGES = 5;

export async function searchTracks(query: string, limit: number = 20, offset: number = 0) {
  const api = await getSpotifyApi();

  // Guard the degenerate case: an empty page list would leave responses[0]
  // undefined and throw while building the envelope.
  const wanted = Math.max(1, Number.isFinite(limit) ? limit : 20);

  const pages: Array<{ limit: number; offset: number }> = [];
  for (let fetched = 0; fetched < wanted && pages.length < MAX_PAGES; fetched += MAX_LIMIT_PER_REQUEST) {
    pages.push({
      limit: Math.min(MAX_LIMIT_PER_REQUEST, wanted - fetched),
      offset: offset + fetched,
    });
  }

  try {
    // Offsets are known up front, so fetch pages concurrently rather than
    // paying serial round-trip latency.
    const responses = await Promise.all(
      pages.map((page) => api.searchTracks(query, { limit: page.limit, offset: page.offset }))
    );

    const first = responses[0];

    // Paged results can overlap: Spotify's ranking may shift between the
    // concurrent requests, so the same track can appear on two pages.
    const seen = new Set<string>();
    const items = responses
      .flatMap((response) => response.body.tracks?.items ?? [])
      .filter((track: any) => {
        if (!track?.id || seen.has(track.id)) return false;
        seen.add(track.id);
        return true;
      });

    return {
      ...first,
      body: {
        ...first.body,
        tracks: {
          ...first.body.tracks,
          items,
          limit: wanted,
          offset,
        },
      },
    };
  } catch (error: any) {
    console.error('Error searching tracks:', error?.statusCode, error?.body ?? error?.message);
    throw Object.assign(new Error('Failed to search tracks'), { statusCode: error?.statusCode });
  }
}
