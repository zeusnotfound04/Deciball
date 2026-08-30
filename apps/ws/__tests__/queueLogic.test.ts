import { describe, it, expect } from 'vitest';

interface QueueItem {
  id: string;
  title: string;
  artist: string;
  voteCount: number;
  createAt: string;
}

const sortQueue = (queue: QueueItem[]): QueueItem[] => {
  return [...queue].sort((a, b) => {
    if (b.voteCount !== a.voteCount) {
      return b.voteCount - a.voteCount;
    }
    return new Date(a.createAt).getTime() - new Date(b.createAt).getTime();
  });
};

const hasUserVoted = (item: { upvotes: { userId: string }[] }, userId: string): boolean => {
  return item.upvotes.some(vote => vote.userId === userId);
};

const isValidYouTubeUrl = (url: string): boolean => {
  const patterns = [
    /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/,
    /^(https?:\/\/)?(www\.)?youtube\.com\/embed\/[a-zA-Z0-9_-]{11}/,
    /^[a-zA-Z0-9_-]{11}$/,
  ];
  return patterns.some(pattern => pattern.test(url.trim()));
};

const isValidSpotifyUrl = (url: string): boolean => {
  const patterns = [
    /^(https?:\/\/)?(open\.)?spotify\.com\/track\/[a-zA-Z0-9]+/,
    /^spotify:track:[a-zA-Z0-9]+$/,
  ];
  return patterns.some(pattern => pattern.test(url.trim()));
};

describe('sortQueue', () => {
  it('sorts by vote count descending', () => {
    const queue: QueueItem[] = [
      { id: '1', title: 'Low', artist: 'A', voteCount: 1, createAt: '2024-01-01' },
      { id: '2', title: 'High', artist: 'B', voteCount: 5, createAt: '2024-01-01' },
      { id: '3', title: 'Mid', artist: 'C', voteCount: 3, createAt: '2024-01-01' },
    ];

    const sorted = sortQueue(queue);
    expect(sorted[0].title).toBe('High');
    expect(sorted[1].title).toBe('Mid');
    expect(sorted[2].title).toBe('Low');
  });

  it('sorts by creation time when votes are equal', () => {
    const queue: QueueItem[] = [
      { id: '1', title: 'Later', artist: 'A', voteCount: 0, createAt: '2024-01-02' },
      { id: '2', title: 'Earlier', artist: 'B', voteCount: 0, createAt: '2024-01-01' },
    ];

    const sorted = sortQueue(queue);
    expect(sorted[0].title).toBe('Earlier');
    expect(sorted[1].title).toBe('Later');
  });

  it('handles empty queue', () => {
    expect(sortQueue([])).toEqual([]);
  });

  it('handles single item', () => {
    const queue: QueueItem[] = [{ id: '1', title: 'Solo', artist: 'A', voteCount: 0, createAt: '2024-01-01' }];
    expect(sortQueue(queue)).toHaveLength(1);
  });

  it('does not mutate original array', () => {
    const queue: QueueItem[] = [
      { id: '1', title: 'B', artist: 'A', voteCount: 1, createAt: '2024-01-01' },
      { id: '2', title: 'A', artist: 'B', voteCount: 2, createAt: '2024-01-01' },
    ];
    const original = [...queue];
    sortQueue(queue);
    expect(queue[0].title).toBe(original[0].title);
  });
});

describe('hasUserVoted', () => {
  it('returns true when user has voted', () => {
    const item = { upvotes: [{ userId: 'user-1' }, { userId: 'user-2' }] };
    expect(hasUserVoted(item, 'user-1')).toBe(true);
  });

  it('returns false when user has not voted', () => {
    const item = { upvotes: [{ userId: 'user-1' }] };
    expect(hasUserVoted(item, 'user-2')).toBe(false);
  });

  it('returns false for empty upvotes', () => {
    expect(hasUserVoted({ upvotes: [] }, 'user-1')).toBe(false);
  });
});

describe('isValidYouTubeUrl', () => {
  it('accepts full youtube url', () => {
    expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
  });

  it('accepts short youtube url', () => {
    expect(isValidYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
  });

  it('accepts embed url', () => {
    expect(isValidYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(true);
  });

  it('accepts bare video id', () => {
    expect(isValidYouTubeUrl('dQw4w9WgXcQ')).toBe(true);
  });

  it('rejects invalid url', () => {
    expect(isValidYouTubeUrl('https://vimeo.com/12345')).toBe(false);
  });

  it('rejects short id', () => {
    expect(isValidYouTubeUrl('abc')).toBe(false);
  });

  it('handles whitespace', () => {
    expect(isValidYouTubeUrl('  dQw4w9WgXcQ  ')).toBe(true);
  });
});

describe('isValidSpotifyUrl', () => {
  it('accepts spotify track url', () => {
    expect(isValidSpotifyUrl('https://open.spotify.com/track/7KXjTSCq5nL1LoYtL7XAwS')).toBe(true);
  });

  it('accepts spotify uri', () => {
    expect(isValidSpotifyUrl('spotify:track:7KXjTSCq5nL1LoYtL7XAwS')).toBe(true);
  });

  it('rejects playlist url', () => {
    expect(isValidSpotifyUrl('https://open.spotify.com/playlist/abc123')).toBe(false);
  });

  it('rejects random url', () => {
    expect(isValidSpotifyUrl('https://google.com')).toBe(false);
  });
});
