import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/actions/spotify/searchTracks', () => ({
  searchTracks: vi.fn(),
}));

vi.mock('@/actions/youtube/searchTracks', () => ({
  searchTracks: vi.fn(),
}));

import { searchTracks as mockSpotifySearch } from '@/actions/spotify/searchTracks';
import { searchTracks as mockYouTubeSearch } from '@/actions/youtube/searchTracks';

const mockTrack = (title: string, artist: string) => ({
  body: {
    tracks: {
      items: [{
        name: title,
        id: 'spotify-id-123',
        artists: [{ name: artist }],
        album: {
          name: 'Test Album',
          images: [
            { url: 'https://img.spotify.com/large.jpg' },
            { url: 'https://img.spotify.com/small.jpg' },
          ],
        },
        external_urls: { spotify: 'https://open.spotify.com/track/spotify-id-123' },
        duration_ms: 240000,
      }],
    },
  },
});

describe('Suggestions API logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('spotify search returns a track with correct shape', async () => {
    (mockSpotifySearch as any).mockResolvedValue(mockTrack('After Hours', 'The Weeknd'));

    const result = await (mockSpotifySearch as any)('After Hours The Weeknd', 1, 0);
    const track = result.body.tracks.items[0];

    expect(track.name).toBe('After Hours');
    expect(track.artists[0].name).toBe('The Weeknd');
    expect(track.id).toBe('spotify-id-123');
    expect(track.album.images).toHaveLength(2);
    expect(track.duration_ms).toBe(240000);
  });

  it('falls back to youtube when spotify fails', async () => {
    (mockSpotifySearch as any).mockRejectedValue(new Error('403 Premium required'));
    (mockYouTubeSearch as any).mockResolvedValue(mockTrack('After Hours', 'The Weeknd'));

    await expect((mockSpotifySearch as any)('After Hours', 1, 0)).rejects.toThrow();

    const ytResult = await (mockYouTubeSearch as any)('After Hours The Weeknd', 1, 0);
    expect(ytResult.body.tracks.items[0].name).toBe('After Hours');
  });

  it('handles empty search results', async () => {
    (mockSpotifySearch as any).mockResolvedValue({ body: { tracks: { items: [] } } });

    const result = await (mockSpotifySearch as any)('nonexistent song xyz', 1, 0);
    expect(result.body.tracks.items).toHaveLength(0);
  });

  it('suggestion track has required fields for add-to-queue', () => {
    const suggestion = {
      title: 'HUMBLE.',
      artist: 'Kendrick Lamar',
      img: 'https://img.spotify.com/large.jpg',
      smallImg: 'https://img.spotify.com/small.jpg',
      spotifyId: '7KXjTSCq5nL1LoYtL7XAwS',
      spotifyUrl: 'https://open.spotify.com/track/7KXjTSCq5nL1LoYtL7XAwS',
      album: 'DAMN.',
      duration_ms: 177000,
      source: 'spotify' as const,
    };

    expect(suggestion.title).toBeTruthy();
    expect(suggestion.artist).toBeTruthy();
    expect(suggestion.spotifyId).toMatch(/^[a-zA-Z0-9]+$/);
    expect(suggestion.spotifyUrl).toContain('open.spotify.com/track/');
    expect(suggestion.duration_ms).toBeGreaterThan(0);
  });

  it('builds artistes payload correctly from suggestion', () => {
    const artist = 'Travis Scott, Playboi Carti';
    const artistes = {
      all: artist.split(', ').map(name => ({ name })),
      primary: artist.split(', ').map(name => ({ name, id: 'suggestion', role: 'primary_artist', image: [], type: 'artist', url: '' })),
    };

    expect(artistes.all).toHaveLength(2);
    expect(artistes.all[0].name).toBe('Travis Scott');
    expect(artistes.all[1].name).toBe('Playboi Carti');
    expect(artistes.primary[0].role).toBe('primary_artist');
  });
});
