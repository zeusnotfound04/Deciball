import { NextRequest, NextResponse } from 'next/server';

// Popular songs to warm up the cache with
const POPULAR_SONGS = [
  { query: "God's Plan Drake", spotifyId: "6DCZcSspjsKoFjzjrWoCdn" },
  { query: "Blinding Lights The Weeknd", spotifyId: "0VjIjW4GlULA7N0lTXOD4E" },
  { query: "Shape of You Ed Sheeran", spotifyId: "7qiZfU4dY1lWllzX7mPBI3" },
  { query: "Someone Like You Adele", spotifyId: "1zwMYTA5nlNjZxYrvBB2pV" },
  { query: "Bohemian Rhapsody Queen", spotifyId: "4u7EnebtmKWzUH433cf5Qv" },
  { query: "Hotel California Eagles", spotifyId: "40riOy7x9W7GXjyGp4pjAv" },
  { query: "Imagine John Lennon", spotifyId: "7pKfPomDEeI4TPT6EOYjn9" },
  { query: "Stairway to Heaven Led Zeppelin", spotifyId: "5CQ30WqJwcep0pYcV4AMNc" },
  { query: "Billie Jean Michael Jackson", spotifyId: "5ChkMS8OtdzJeqyybCc9R5" },
  { query: "Hey Jude The Beatles", spotifyId: "0aym2LBJBk9DAYuHHutrIl" }
];

export async function POST(request: NextRequest) {
  try {
    console.log('🔥 Starting cache warmup process...');
    
    const warmupResults = {
      successful: 0,
      failed: 0,
      total: POPULAR_SONGS.length,
      details: [] as Array<{ song: string; success: boolean; error?: string }>
    };

    // Process songs in batches to avoid overwhelming the system
    const BATCH_SIZE = 3;
    for (let i = 0; i < POPULAR_SONGS.length; i += BATCH_SIZE) {
      const batch = POPULAR_SONGS.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (song) => {
        try {
          console.log(`🎵 Warming up: ${song.query}`);
          
          // Search for the song using our existing API
          const searchResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/search?q=${encodeURIComponent(song.query)}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!searchResponse.ok) {
            throw new Error(`Search failed: ${searchResponse.status}`);
          }

          const searchData = await searchResponse.json();
          
          if (searchData.tracks && searchData.tracks.length > 0) {
            // Get detailed track info for caching
            const track = searchData.tracks[0];
            const detailResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/spotify/getTrack`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(track),
            });

            if (detailResponse.ok) {
              const detailData = await detailResponse.json();
              console.log(`✅ Cached: ${song.query} (${detailData.body?.length || 0} variations)`);
              
              warmupResults.successful++;
              warmupResults.details.push({
                song: song.query,
                success: true
              });
            } else {
              throw new Error(`Detail fetch failed: ${detailResponse.status}`);
            }
          } else {
            throw new Error('No tracks found in search results');
          }
        } catch (error) {
          console.error(`❌ Failed to warm up ${song.query}:`, error);
          warmupResults.failed++;
          warmupResults.details.push({
            song: song.query,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      // Process batch and wait
      await Promise.all(batchPromises);
      
      // Small delay between batches
      if (i + BATCH_SIZE < POPULAR_SONGS.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`🎯 Cache warmup complete: ${warmupResults.successful}/${warmupResults.total} successful`);

    return NextResponse.json({
      success: true,
      message: `Cache warmup completed: ${warmupResults.successful}/${warmupResults.total} songs cached`,
      results: warmupResults
    });

  } catch (error) {
    console.error('❌ Cache warmup failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Cache warmup failed',
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Cache warmup endpoint - use POST to start warmup',
    popularSongs: POPULAR_SONGS.length,
    endpoint: '/api/cache/warmup'
  });
}
