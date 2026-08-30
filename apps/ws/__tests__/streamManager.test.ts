import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-secret-key';

const decodeUserToken = (token: string): { userId: string; username?: string; email?: string; name?: string; pfpUrl?: string } | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      name: decoded.name,
      pfpUrl: decoded.pfpUrl,
    };
  } catch {
    return null;
  }
};

const normalizeQuery = (url: string, trackData?: any): string => {
  if (trackData?.title && trackData?.artist) {
    const names = trackData.artistes?.all?.map((obj: any) => obj.name).join(' , ') || trackData.artist;
    return `${trackData.title} by ${names}`.toLowerCase().trim();
  }
  return url.trim();
};

const extractSourceInfo = (url: string): { source: string; extractedId?: string } => {
  if (!url || typeof url !== 'string') {
    return { source: 'Youtube', extractedId: undefined };
  }
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return { source: 'Youtube', extractedId: match?.[1] || undefined };
  }
  if (url.includes('spotify.com')) {
    const match = url.match(/track\/([a-zA-Z0-9]+)/);
    return { source: 'Spotify', extractedId: match?.[1] || undefined };
  }
  return { source: 'Youtube', extractedId: url };
};

const applySpotifyMetadata = (song: any, trackData: any, hasFullSpotifyData: boolean) => {
  if (!hasFullSpotifyData) return song;
  return {
    ...song,
    title: trackData.title,
    artist: trackData.artist,
    album: trackData.album || song.album,
    smallImg: trackData.smallImg || song.smallImg,
    bigImg: trackData.bigImg || song.bigImg,
    duration: trackData.duration ? Math.floor(trackData.duration / 1000) : song.duration,
  };
};

describe('decodeUserToken', () => {
  it('decodes valid token with all fields', () => {
    const payload = {
      userId: 'user-123',
      email: 'test@test.com',
      name: 'Test User',
      pfpUrl: 'https://img.com/pfp.jpg',
      username: 'testuser',
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    const decoded = decodeUserToken(token);

    expect(decoded?.userId).toBe('user-123');
    expect(decoded?.email).toBe('test@test.com');
    expect(decoded?.name).toBe('Test User');
    expect(decoded?.pfpUrl).toBe('https://img.com/pfp.jpg');
    expect(decoded?.username).toBe('testuser');
  });

  it('extracts pfpUrl from token', () => {
    const token = jwt.sign({ userId: '1', pfpUrl: 'https://example.com/pic.png' }, JWT_SECRET);
    const decoded = decodeUserToken(token);
    expect(decoded?.pfpUrl).toBe('https://example.com/pic.png');
  });

  it('returns null for invalid token', () => {
    expect(decodeUserToken('garbage')).toBeNull();
  });

  it('returns null for expired token', () => {
    const token = jwt.sign({ userId: '1' }, JWT_SECRET, { expiresIn: '-1s' });
    expect(decodeUserToken(token)).toBeNull();
  });

  it('returns null for wrong secret', () => {
    const token = jwt.sign({ userId: '1' }, 'wrong-secret');
    expect(decodeUserToken(token)).toBeNull();
  });

  it('handles token with missing optional fields', () => {
    const token = jwt.sign({ userId: '1' }, JWT_SECRET);
    const decoded = decodeUserToken(token);
    expect(decoded?.userId).toBe('1');
    expect(decoded?.pfpUrl).toBeUndefined();
    expect(decoded?.email).toBeUndefined();
  });
});

describe('normalizeQuery', () => {
  it('builds query from trackData with artistes', () => {
    const result = normalizeQuery('', {
      title: 'HUMBLE.',
      artist: 'Kendrick Lamar',
      artistes: { all: [{ name: 'Kendrick Lamar' }] },
    });
    expect(result).toBe('humble. by kendrick lamar');
  });

  it('handles multiple artists', () => {
    const result = normalizeQuery('', {
      title: 'FE!N',
      artist: 'Travis Scott, Playboi Carti',
      artistes: { all: [{ name: 'Travis Scott' }, { name: 'Playboi Carti' }] },
    });
    expect(result).toBe('fe!n by travis scott , playboi carti');
  });

  it('falls back to url when no trackData', () => {
    expect(normalizeQuery('https://youtube.com/watch?v=abc')).toBe('https://youtube.com/watch?v=abc');
  });

  it('falls back to url when trackData has no title', () => {
    expect(normalizeQuery('some-url', { artist: 'Test' })).toBe('some-url');
  });

  it('trims whitespace', () => {
    expect(normalizeQuery('  url  ')).toBe('url');
  });

  it('lowercases the query', () => {
    const result = normalizeQuery('', {
      title: 'After Hours',
      artist: 'The Weeknd',
      artistes: { all: [{ name: 'The Weeknd' }] },
    });
    expect(result).toBe('after hours by the weeknd');
  });
});

describe('extractSourceInfo', () => {
  it('extracts YouTube video id from full url', () => {
    const result = extractSourceInfo('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(result.source).toBe('Youtube');
    expect(result.extractedId).toBe('dQw4w9WgXcQ');
  });

  it('extracts YouTube video id from short url', () => {
    const result = extractSourceInfo('https://youtu.be/dQw4w9WgXcQ');
    expect(result.source).toBe('Youtube');
    expect(result.extractedId).toBe('dQw4w9WgXcQ');
  });

  it('extracts Spotify track id', () => {
    const result = extractSourceInfo('https://open.spotify.com/track/7KXjTSCq5nL1LoYtL7XAwS');
    expect(result.source).toBe('Spotify');
    expect(result.extractedId).toBe('7KXjTSCq5nL1LoYtL7XAwS');
  });

  it('defaults to YouTube for unknown urls', () => {
    const result = extractSourceInfo('https://soundcloud.com/test');
    expect(result.source).toBe('Youtube');
  });

  it('handles null url', () => {
    const result = extractSourceInfo(null as any);
    expect(result.source).toBe('Youtube');
    expect(result.extractedId).toBeUndefined();
  });

  it('handles empty string', () => {
    const result = extractSourceInfo('');
    expect(result.source).toBe('Youtube');
  });
});

describe('applySpotifyMetadata', () => {
  const cachedSong = {
    title: 'The Weeknd - After Hours (Audio)',
    artist: 'YouTube Channel',
    album: '',
    smallImg: 'https://yt-thumb.jpg',
    bigImg: 'https://yt-thumb-big.jpg',
    duration: 362,
  };

  const trackData = {
    title: 'After Hours',
    artist: 'The Weeknd',
    album: 'After Hours',
    smallImg: 'https://spotify-small.jpg',
    bigImg: 'https://spotify-big.jpg',
    duration: 361026,
    spotifyId: '2p8IUWQDrpjuFltbdgLOag',
  };

  it('overrides YouTube title with Spotify title', () => {
    const result = applySpotifyMetadata(cachedSong, trackData, true);
    expect(result.title).toBe('After Hours');
  });

  it('overrides YouTube artist with Spotify artist', () => {
    const result = applySpotifyMetadata(cachedSong, trackData, true);
    expect(result.artist).toBe('The Weeknd');
  });

  it('overrides images with Spotify images', () => {
    const result = applySpotifyMetadata(cachedSong, trackData, true);
    expect(result.bigImg).toBe('https://spotify-big.jpg');
    expect(result.smallImg).toBe('https://spotify-small.jpg');
  });

  it('converts duration from ms to seconds', () => {
    const result = applySpotifyMetadata(cachedSong, trackData, true);
    expect(result.duration).toBe(361);
  });

  it('preserves original song fields not in trackData', () => {
    const songWithExtra = { ...cachedSong, extractedId: 'yt-123', url: 'https://yt.com' };
    const result = applySpotifyMetadata(songWithExtra, trackData, true);
    expect(result.extractedId).toBe('yt-123');
    expect(result.url).toBe('https://yt.com');
  });

  it('returns original song when hasFullSpotifyData is false', () => {
    const result = applySpotifyMetadata(cachedSong, trackData, false);
    expect(result.title).toBe('The Weeknd - After Hours (Audio)');
  });

  it('keeps original album if trackData album is empty', () => {
    const result = applySpotifyMetadata(
      { ...cachedSong, album: 'Original Album' },
      { ...trackData, album: '' },
      true
    );
    expect(result.album).toBe('Original Album');
  });
});
