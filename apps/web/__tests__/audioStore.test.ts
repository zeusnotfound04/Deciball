import { describe, it, expect } from 'vitest';

const formatSongFromServer = (songData: any) => {
  if (!songData) return null;

  const artistes: string[] = Array.isArray(songData.artists)
    ? songData.artists.map((a: any) => a.name || a)
    : songData.artist
      ? songData.artist.split(', ')
      : ['Unknown Artist'];

  return {
    id: songData.id,
    name: songData.title || songData.name,
    artistes,
    image: [
      { quality: 'high', url: songData.bigImg || songData.smallImg || '' },
      { quality: 'medium', url: songData.smallImg || songData.bigImg || '' },
    ],
    downloadUrl: songData.youtubeId
      ? [{ quality: 'auto', url: songData.youtubeId }]
      : [{ quality: 'auto', url: songData.url || '' }],
    source: songData.type === 'Youtube' ? 'youtube' : 'spotify',
  };
};

describe('formatSongFromServer', () => {
  it('handles server data with artist as string', () => {
    const song = formatSongFromServer({
      id: '1',
      title: 'After Hours',
      artist: 'The Weeknd',
      bigImg: 'https://img.com/big.jpg',
      smallImg: 'https://img.com/small.jpg',
      youtubeId: 'abc123def45',
      type: 'Youtube',
    });

    expect(song?.name).toBe('After Hours');
    expect(song?.artistes).toEqual(['The Weeknd']);
    expect(song?.image[0].url).toBe('https://img.com/big.jpg');
    expect(song?.downloadUrl[0].url).toBe('abc123def45');
    expect(song?.source).toBe('youtube');
  });

  it('handles server data with artists as array', () => {
    const song = formatSongFromServer({
      id: '2',
      title: 'FE!N',
      artists: [{ name: 'Travis Scott' }, { name: 'Playboi Carti' }],
      bigImg: 'https://img.com/big.jpg',
      smallImg: 'https://img.com/small.jpg',
      youtubeId: 'xyz789',
      type: 'Youtube',
    });

    expect(song?.artistes).toEqual(['Travis Scott', 'Playboi Carti']);
  });

  it('handles comma-separated artist string', () => {
    const song = formatSongFromServer({
      id: '3',
      title: 'Test',
      artist: 'Artist A, Artist B, Artist C',
    });

    expect(song?.artistes).toEqual(['Artist A', 'Artist B', 'Artist C']);
  });

  it('returns Unknown Artist when no artist data', () => {
    const song = formatSongFromServer({ id: '4', title: 'Mystery' });
    expect(song?.artistes).toEqual(['Unknown Artist']);
  });

  it('returns null for null input', () => {
    expect(formatSongFromServer(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(formatSongFromServer(undefined)).toBeNull();
  });

  it('uses name when title is missing', () => {
    const song = formatSongFromServer({ id: '5', name: 'Fallback Name' });
    expect(song?.name).toBe('Fallback Name');
  });

  it('prefers title over name', () => {
    const song = formatSongFromServer({ id: '6', title: 'Title', name: 'Name' });
    expect(song?.name).toBe('Title');
  });

  it('falls back to smallImg when bigImg is missing', () => {
    const song = formatSongFromServer({ id: '7', title: 'T', smallImg: 'https://small.jpg' });
    expect(song?.image[0].url).toBe('https://small.jpg');
  });

  it('maps Spotify type correctly', () => {
    const song = formatSongFromServer({ id: '8', title: 'T', type: 'Spotify' });
    expect(song?.source).toBe('spotify');
  });

  it('uses url fallback when no youtubeId', () => {
    const song = formatSongFromServer({ id: '9', title: 'T', url: 'https://yt.com/watch?v=abc' });
    expect(song?.downloadUrl[0].url).toBe('https://yt.com/watch?v=abc');
  });
});
