import { describe, it, expect, vi, beforeEach } from 'vitest';
import getURL, { getBackgroundURL } from '@/lib/utils';

const FALLBACK = 'https://fzrikj5pca.ufs.sh/f/5YNrqr2QLJnxupp8GI0qKT58dI3l4qaoDABLFybZUQJitNgR';

describe('getURL', () => {
  beforeEach(() => {
    vi.stubEnv('STREAM_URL', 'https://stream.example.com');
  });

  it('returns http url directly', () => {
    const song = { downloadUrl: [{ url: 'https://cdn.example.com/audio.mp3' }] } as any;
    expect(getURL(song)).toBe('https://cdn.example.com/audio.mp3');
  });

  it('prepends STREAM_URL for non-http paths', () => {
    const song = { downloadUrl: [{ url: 'abc123def45' }] } as any;
    expect(getURL(song)).toBe('https://stream.example.com/abc123def45');
  });

  it('uses last download url when multiple exist', () => {
    const song = {
      downloadUrl: [
        { url: 'https://low.mp3' },
        { url: 'https://high.mp3' },
      ],
    } as any;
    expect(getURL(song)).toBe('https://high.mp3');
  });

  it('handles single download url', () => {
    const song = { downloadUrl: [{ url: 'https://only.mp3' }] } as any;
    expect(getURL(song)).toBe('https://only.mp3');
  });
});

describe('getBackgroundURL', () => {
  beforeEach(() => {
    vi.stubEnv('BACKGROUND_STREAM_URI', 'https://bg.example.com');
  });

  it('returns http url directly', () => {
    const song = { downloadUrl: [{ url: 'https://cdn.example.com/bg.mp3' }] } as any;
    expect(getBackgroundURL(song)).toBe('https://cdn.example.com/bg.mp3');
  });
});
