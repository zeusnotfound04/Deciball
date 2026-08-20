import { getYTMusic } from "@/lib/YTmusic";

/**
 * YouTube Music search shaped as the Spotify search envelope.
 *
 * The queue pipeline resolves everything to YouTube anyway (Search.tsx sends
 * trackData to the ws worker pool, which converts to a video), so YouTube
 * Music is the more direct metadata source. Emitting the Spotify envelope
 * keeps every existing consumer unchanged.
 */
export async function searchTracks(query: string, limit: number = 20, offset: number = 0) {
  const ytmusic = await getYTMusic();

  try {
    const songs = await ytmusic.searchSongs(query);
    const page = songs.slice(offset, offset + limit);

    const items = page.map((song: any) => {
      const thumbs = song.thumbnails ?? [];
      const largest = thumbs[thumbs.length - 1]?.url ?? '';
      // YouTube Music serves square art sized in the URL; ask for 500x500.
      const upscaled = largest
        .replace(/w\d+-h\d+/, 'w500-h500')
        .replace('w120-h120', 'w500-h500');

      return {
        id: song.videoId,
        name: song.name,
        artists: [{
          id: song.artist?.artistId ?? '',
          name: song.artist?.name ?? 'Unknown Artist',
          external_urls: { spotify: '' },
        }],
        album: {
          id: song.album?.albumId ?? '',
          name: song.album?.name ?? '',
          images: upscaled
            ? [{ url: upscaled, height: 500, width: 500 }]
            : [],
        },
        external_urls: { spotify: `https://music.youtube.com/watch?v=${song.videoId}` },
        duration_ms: (song.duration ?? 0) * 1000,
        preview_url: null,
        // 11-char YouTube id, which is what the queue path validates on.
        downloadUrl: [{ quality: '320kbps', url: song.videoId }],
        source: 'youtube',
      };
    });

    return {
      body: {
        tracks: {
          href: '',
          items,
          limit,
          offset,
          total: songs.length,
        },
      },
    };
  } catch (error: any) {
    console.error('Error searching YouTube Music:', error?.message ?? error);
    throw Object.assign(new Error('Failed to search tracks'), { statusCode: 502 });
  }
}
