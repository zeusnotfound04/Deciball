
export type QueueSong = {
    id: string;
    title: string;
    artist?: string;
    album?: string;
    url: string;
    extractedId: string;
    source: 'Youtube' | 'Spotify';
    smallImg: string;
    bigImg: string;
    userId: string;
    addedAt: number;
    duration?: number;
    voteCount: number;
    spotifyId?: string;
    youtubeId?: string;
};

// Get the queue for a space
export async function getRedisQueue(spaceId: string): Promise<QueueSong[]> {
    try {
        const client = getWebSocketRedisClient();
        const queueData = await client.lrange(`queue-${spaceId}`, 0, -1);
        if (!queueData || queueData.length === 0) {
            return [];
        }
        const songs: QueueSong[] = [];
        for (const songData of queueData) {
            try {
                const song = JSON.parse(songData);
                songs.push(song);
            } catch (parseError) {
                console.error('Error parsing song data from Redis:', parseError);
            }
        }
        return songs;
    } catch (error) {
        console.error('Error getting Redis queue:', error);
        return [];
    }
}

// Get currently playing song from Redis
export async function getCurrentPlayingSong(spaceId: string): Promise<QueueSong | null> {
    try {
        const client = getWebSocketRedisClient();
        const currentSongData = await client.get(`current-playing-${spaceId}`);
        if (!currentSongData) {
            return null;
        }
        return JSON.parse(currentSongData);
    } catch (error) {
        console.error('Error getting current playing song from Redis:', error);
        return null;
    }
}

// Get the first track image for a space (either from queue or currently playing)
export async function getSpaceFirstTrackImage(spaceId: string): Promise<string | null> {
    try {
        // First check if there's a currently playing song
        const currentSong = await getCurrentPlayingSong(spaceId);
        if (currentSong && (currentSong.bigImg || currentSong.smallImg)) {
            return currentSong.bigImg || currentSong.smallImg;
        }
        // If no current song, get the first song from queue
        const queue = await getRedisQueue(spaceId);
        if (queue.length > 0 && (queue[0].bigImg || queue[0].smallImg)) {
            return queue[0].bigImg || queue[0].smallImg;
        }
        return null;
    } catch (error) {
        console.error('Error getting space first track image:', error);
        return null;
    }
}

// Get queue length
export async function getRedisQueueLength(spaceId: string): Promise<number> {
    try {
        const client = getWebSocketRedisClient();
        return await client.llen(`queue-${spaceId}`);
    } catch (error) {
        console.error('Error getting Redis queue length:', error);
        return 0;
    }
}

import { getWebSocketRedisClient } from "../../lib/websocket-redis-client";

