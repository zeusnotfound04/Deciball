import { useEffect, useState } from 'react';
import { useSocket } from '@/context/socket-context';
import { useUserStore } from '@/store/userStore';
import { useAudio, useAudioStore } from '@/store/audioStore';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { ThumbsUp, ThumbsDown, Play, Trash2, SkipForward } from 'lucide-react';

interface QueueItem {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  smallImg: string;
  bigImg: string;
  url: string;
  type: 'Youtube' | 'Spotify';
  voteCount: number;
  createAt?: string; // Add creation timestamp for secondary sorting
  addedByUser: {
    id: string;
    username: string;
  };
  upvotes: Array<{
    userId: string;
  }>;
  // Additional fields for hybrid Spotify/YouTube approach
  spotifyId?: string;
  spotifyUrl?: string;
  youtubeId?: string;
  youtubeUrl?: string;
}

interface QueueManagerProps {
  spaceId: string;
  isAdmin?: boolean;
}

export const QueueManager: React.FC<QueueManagerProps> = ({ spaceId, isAdmin = false }) => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentPlaying, setCurrentPlaying] = useState<QueueItem | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const { sendMessage, socket } = useSocket();
  const { user } = useUserStore();
  const { voteOnSong, addToQueue, play, currentSong: audioCurrentSong } = useAudio();

  // Sort queue by vote count (descending) and then by creation time (ascending)
  const sortedQueue = [...queue].sort((a, b) => {
    // First sort by vote count (highest first)
    if (b.voteCount !== a.voteCount) {
      return b.voteCount - a.voteCount;
    }
    
    // If vote counts are equal, sort by creation time (oldest first) 
    // This ensures songs added earlier get played first when votes are tied
    return new Date(a.createAt || 0).getTime() - new Date(b.createAt || 0).getTime();
  });

  console.log('[QueueManager] Queue sorting debug:', {
    originalQueueLength: queue.length,
    sortedQueueLength: sortedQueue.length,
    originalOrder: queue.map(q => ({ id: q.id, title: q.title, votes: q.voteCount })),
    sortedOrder: sortedQueue.map(q => ({ id: q.id, title: q.title, votes: q.voteCount }))
  });

  // Utility function to clean up URLs
  const cleanUrl = (url: string): string => {
    if (!url) return '';
    
    // Remove extra quotes from the beginning and end
    let cleanedUrl = url.trim();
    if (cleanedUrl.startsWith('"') && cleanedUrl.endsWith('"')) {
      cleanedUrl = cleanedUrl.slice(1, -1);
    }
    if (cleanedUrl.startsWith("'") && cleanedUrl.endsWith("'")) {
      cleanedUrl = cleanedUrl.slice(1, -1);
    }
    
    return cleanedUrl;
  };

  const extractYouTubeVideoId = (url: string): string => {
    if (!url) return '';
    
    const cleanedUrl = cleanUrl(url);
    
    // Handle different YouTube URL formats
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = cleanedUrl.match(regExp);
    
    if (match && match[7].length === 11) {
      return match[7];
    }
    
    // If it's already just a video ID, return it
    if (cleanedUrl.length === 11 && /^[a-zA-Z0-9_-]+$/.test(cleanedUrl)) {
      return cleanedUrl;
    }
    
    console.warn('Could not extract YouTube video ID from:', cleanedUrl);
    return cleanedUrl; // Return as-is if we can't parse it
  };

  // Monitor WebSocket connection status
  useEffect(() => {
    if (!socket) {
      setConnectionStatus('disconnected');
      return;
    }

    const updateConnectionStatus = () => {
      switch (socket.readyState) {
        case WebSocket.CONNECTING:
          setConnectionStatus('connecting');
          break;
        case WebSocket.OPEN:
          setConnectionStatus('connected');
          break;
        case WebSocket.CLOSING:
        case WebSocket.CLOSED:
          setConnectionStatus('disconnected');
          break;
        default:
          setConnectionStatus('disconnected');
      }
    };

    updateConnectionStatus();

    // Listen for connection state changes
    const handleOpen = () => setConnectionStatus('connected');
    const handleClose = () => setConnectionStatus('disconnected');
    const handleError = () => setConnectionStatus('disconnected');

    socket.addEventListener('open', handleOpen);
    socket.addEventListener('close', handleClose);
    socket.addEventListener('error', handleError);

    return () => {
      socket.removeEventListener('open', handleOpen);
      socket.removeEventListener('close', handleClose);
      socket.removeEventListener('error', handleError);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      const { type, data } = JSON.parse(event.data);
      console.log('🎵 QueueManager received message:', { type, data });
      
      switch (type) {
        case 'queue-update':
          console.log('📋 Queue update received:', data.queue);
          setQueue(data.queue || []);
          break;
        case 'current-song-update':
          console.log('🎶 Current song update:', data.song);
          console.log('🎶 Current audioCurrentSong:', audioCurrentSong);
          console.log('🎶 Current isPlaying state:', useAudioStore.getState().isPlaying);
          setCurrentPlaying(data.song || null);
          
          // Actually start playing the new current song
          if (data.song) {
            console.log('🎵 Starting playback of new current song:', data.song.title);
            
            // Check if this song is already playing to avoid restarting
            const isSameSong = audioCurrentSong?.id === data.song.id;
            const { isPlaying } = useAudioStore.getState();
            
            console.log('🎵 Is same song?', isSameSong, 'audioCurrentSong.id:', audioCurrentSong?.id, 'data.song.id:', data.song.id);
            console.log('🎵 Is currently playing?', isPlaying);
            
            // Only skip if it's the same song AND it's currently playing
            if (isSameSong && isPlaying) {
              console.log('🎵 Same song already playing, skipping playback restart');
              
              // Even if same song, apply pending sync if available (for new users)
              const { pendingSync } = useAudioStore.getState();
              if (pendingSync) {
                console.log('🔄 Applying pending sync for existing song');
                const { handleRoomSync } = useAudioStore.getState();
                const youtubeVideoId = extractYouTubeVideoId(data.song.youtubeUrl || data.song.url);
                const existingAudioSong = {
                  id: data.song.id,
                  name: data.song.title,
                  url: cleanUrl(data.song.youtubeUrl || data.song.url),
                  artistes: {
                    primary: [{
                      id: 'unknown',
                      name: data.song.artist || 'Unknown Artist',
                      role: 'primary_artist',
                      image: [] as any,
                      type: 'artist' as const,
                      url: ''
                    }]
                  },
                  image: [
                    { quality: 'high', url: cleanUrl(data.song.bigImg || data.song.smallImg || '') },
                    { quality: 'medium', url: cleanUrl(data.song.smallImg || data.song.bigImg || '') }
                  ],
                  addedBy: data.song.addedByUser?.username || 'Unknown',
                  downloadUrl: youtubeVideoId ? 
                    [{ quality: 'auto', url: youtubeVideoId }] : 
                    [{ quality: 'auto', url: cleanUrl(data.song.url) }],
                  addedByUser: data.song.addedByUser,
                  voteCount: data.song.voteCount || 0,
                  isVoted: false,
                  source: data.song.type === 'Youtube' ? 'youtube' as const : undefined,
                  video: true
                };
                setTimeout(() => {
                  handleRoomSync(pendingSync.timestamp, pendingSync.isPlaying, existingAudioSong);
                }, 500);
              }
              break;
            }
            
            // Convert queue item format to audio store format
            const youtubeVideoId = extractYouTubeVideoId(data.song.youtubeUrl || data.song.url);
            
            const audioSong: any = {
              id: data.song.id,
              name: data.song.title,
              url: cleanUrl(data.song.youtubeUrl || data.song.url),
              artistes: {
                primary: [{
                  id: 'unknown',
                  name: data.song.artist || 'Unknown Artist',
                  role: 'primary_artist',
                  image: [] as any,
                  type: 'artist' as const,
                  url: ''
                }]
              },
              image: [
                { quality: 'high', url: cleanUrl(data.song.bigImg || data.song.smallImg || '') },
                { quality: 'medium', url: cleanUrl(data.song.smallImg || data.song.bigImg || '') }
              ],
              addedBy: data.song.addedByUser?.username || 'Unknown',
              downloadUrl: youtubeVideoId ? 
                [{ quality: 'auto', url: youtubeVideoId }] : // Use video ID, not full URL
                [{ quality: 'auto', url: cleanUrl(data.song.url) }],
              addedByUser: data.song.addedByUser,
              voteCount: data.song.voteCount || 0,
              isVoted: false,
              source: data.song.type === 'Youtube' ? 'youtube' as const : undefined,
              video: true
            };
            
            console.log('🎵 Formatted song for audio player:', audioSong);
            console.log('🎵 Video ID extracted:', youtubeVideoId);
            console.log('🎵 Original YouTube URL:', data.song.youtubeUrl);
            console.log('🎵 downloadUrl being passed:', audioSong.downloadUrl);
            
            // Start playing the song
            play(audioSong);
            
            // For new users who requested current song, check if there's pending sync to apply
            // We'll give the player time to initialize before applying any pending sync
            setTimeout(() => {
              const { pendingSync, youtubePlayer } = useAudioStore.getState();
              if (pendingSync) {
                console.log('🔄 Applying pending sync after song load for new user');
                console.log('🔄 Pending sync data:', pendingSync);
                console.log('🔄 YouTube player available:', !!youtubePlayer);
                
                // If YouTube player is ready, apply sync directly
                if (youtubePlayer && youtubePlayer.seekTo) {
                  console.log('🔄 YouTube player ready, applying sync directly');
                  youtubePlayer.seekTo(pendingSync.timestamp, true);
                  if (pendingSync.isPlaying) {
                    youtubePlayer.playVideo();
                  } else {
                    youtubePlayer.pauseVideo();
                  }
                  // Clear pending sync
                  const { handleRoomSync } = useAudioStore.getState();
                  handleRoomSync(pendingSync.timestamp, pendingSync.isPlaying, audioSong);
                } else {
                  console.log('🔄 YouTube player not ready yet, pending sync will be applied when ready');
                  // The PlayerCover component will handle this when onPlayerReady is called
                }
              }
            }, 1500); // Give more time for the player to be ready
          } else {
            console.log('🛑 No current song to play');
          }
          break;
        case 'song-added':
          console.log('➕ Song added to queue:', { 
            song: data.song, 
            autoPlay: data.autoPlay, 
            currentPlaying: !!currentPlaying,
            isAdmin 
          });
          // Add new song to queue
          setQueue(prev => {
            const newQueue = [...prev, data.song];
            console.log('📋 Updated queue length:', newQueue.length);
            return newQueue;
          });
          
          // Auto-play logic is handled by backend via play-next event
          break;
        case 'vote-updated':
          console.log('👍 Vote updated:', { streamId: data.streamId, voteCount: data.voteCount });
          // Update vote count for specific song
          setQueue(prev => prev.map(item => 
            item.id === data.streamId 
              ? { ...item, voteCount: data.voteCount, upvotes: data.upvotes }
              : item
          ));
          break;
        case 'timestamp-sync':
          console.log('🕐 Timestamp sync received:', { 
            currentTime: data.currentTime, 
            isPlaying: data.isPlaying, 
            timestamp: data.timestamp,
            songId: data.songId,
            isInitialSync: data.isInitialSync
          });
          
          // If we have a songId but no currentPlaying, request the current song
          if (data.songId && !currentPlaying) {
            console.log('🎵 Timestamp sync has songId but no currentPlaying - requesting current song');
            sendMessage('get-current-song', { spaceId });
            
            // Store the sync data to apply once we get the song
            // This will be handled by the audioStore's pending sync mechanism
            const { handleRoomSync } = useAudioStore.getState();
            handleRoomSync(data.currentTime, data.isPlaying, null);
            return;
          }
          
          // Convert currentPlaying to audioStore format if it exists
          let audioStoreSong = null;
          if (currentPlaying) {
            const youtubeVideoId = extractYouTubeVideoId(currentPlaying.youtubeUrl || currentPlaying.url);
            audioStoreSong = {
              id: currentPlaying.id,
              name: currentPlaying.title,
              url: cleanUrl(currentPlaying.youtubeUrl || currentPlaying.url),
              artistes: {
                primary: [{
                  id: 'unknown',
                  name: currentPlaying.artist || 'Unknown Artist',
                  role: 'primary_artist',
                  image: [] as any,
                  type: 'artist' as const,
                  url: ''
                }]
              },
              image: [
                { quality: 'high', url: cleanUrl(currentPlaying.bigImg || currentPlaying.smallImg || '') },
                { quality: 'medium', url: cleanUrl(currentPlaying.smallImg || currentPlaying.bigImg || '') }
              ],
              downloadUrl: youtubeVideoId ? 
                [{ quality: 'auto', url: youtubeVideoId }] : 
                [{ quality: 'auto', url: cleanUrl(currentPlaying.url) }],
              source: currentPlaying.type === 'Youtube' ? 'youtube' as const : undefined,
              video: true
            };
          }
          
          // Use audioStore to handle synchronization
          const { handleRoomSync } = useAudioStore.getState();
          handleRoomSync(data.currentTime, data.isPlaying, audioStoreSong);
          
          // Show sync notification for initial sync (new user joining)
          if (data.isInitialSync) {
            console.log('🔄 Initial sync for new user');
            if (typeof window !== 'undefined') {
              const event = new CustomEvent('show-sync-toast', {
                detail: { 
                  message: `Synced to room playback at ${Math.floor(data.currentTime)}s`, 
                  type: 'info' 
                }
              });
              window.dispatchEvent(event);
            }
          }
          break;
        case 'play':
          console.log('▶️ Playback play command received');
          const { handlePlaybackResume } = useAudioStore.getState();
          handlePlaybackResume();
          break;
        case 'pause':
          console.log('⏸️ Playback pause command received');
          const { handlePlaybackPause } = useAudioStore.getState();
          handlePlaybackPause();
          break;
        case 'seek':
          console.log('⏩ [QueueManager] Playback seek command received:', {
            currentTime: data.currentTime,
            spaceId: data.spaceId,
            triggeredBy: data.triggeredBy,
            forceSync: data.forceSync,
            fullData: data
          });
          
          const { handlePlaybackSeek, isSeeking } = useAudioStore.getState();
          
          // If this is a forced sync (from admin seek), apply immediately regardless of seeking state
          if (data.forceSync) {
            console.log('⏩ [QueueManager] Applying forced seek sync (forceSync=true)');
            handlePlaybackSeek(data.currentTime);
            
            // Show sync notification for forced seek
            if (typeof window !== 'undefined') {
              const event = new CustomEvent('show-sync-toast', {
                detail: { 
                  message: `Admin seeked to ${Math.floor(data.currentTime)}s`, 
                  type: 'info' 
                }
              });
              window.dispatchEvent(event);
            }
          } else {
            console.log('⏩ [QueueManager] Applying regular seek');
            handlePlaybackSeek(data.currentTime);
          }
          
          console.log('⏩ [QueueManager] Seek command processed by handlePlaybackSeek');
          break;
        case 'error':
          console.error('❌ Queue error received:', data);
          // You could add user-facing error notifications here
          // For example, show a toast notification
          break;
        default:
          console.log('❓ Unknown message type in QueueManager:', type);
      }
    };

    socket.addEventListener('message', handleMessage);
    
    // Request initial queue
    console.log('📋 Requesting initial queue for space:', spaceId);
    sendMessage('get-queue', { spaceId });

    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket, sendMessage, spaceId, currentPlaying, isAdmin]);

  const handleVote = (streamId: string, vote: 'upvote' | 'downvote') => {
    voteOnSong(streamId, vote);
  };

  const handlePlayNext = () => {
    if (!isAdmin) {
      console.warn('🚫 Non-admin tried to play next');
      return;
    }
    
    console.log('⏭️ Admin playing next song for space:', spaceId);
    sendMessage('play-next', { spaceId });
  };

  const handleRemoveSong = (streamId: string) => {
    if (!isAdmin) {
      console.warn('🚫 Non-admin tried to remove song');
      return;
    }
    
    console.log('🗑️ Admin removing song:', streamId);
    sendMessage('remove-song', { 
      spaceId, 
      streamId 
    });
  };

  const handleEmptyQueue = () => {
    if (!isAdmin) {
      console.warn('🚫 Non-admin tried to empty queue');
      return;
    }
    
    console.log('🗑️ Admin emptying queue for space:', spaceId);
    sendMessage('empty-queue', { spaceId });
  };

  const hasUserVoted = (item: QueueItem) => {
    return item.upvotes?.some(vote => vote.userId === user?.id) || false;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Music Queue</h2>
        {isAdmin && (
          <div className="space-x-2">
            <Button 
              onClick={handlePlayNext}
              className="bg-green-600 hover:bg-green-700"
            >
              <SkipForward className="w-4 h-4 mr-2" />
              Play Next
            </Button>
            <Button 
              onClick={handleEmptyQueue}
              variant="destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Empty Queue
            </Button>
          </div>
        )}
      </div>

      {/* Currently Playing */}
      {currentPlaying && (
        <Card className="border-green-500 border-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Play className="w-5 h-5 text-green-500" />
              Now Playing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <img 
                src={currentPlaying.smallImg} 
                alt={currentPlaying.title}
                className="w-16 h-16 rounded-md object-cover"
              />
              <div className="flex-1">
                <h3 className="font-semibold">{currentPlaying.title}</h3>
                {currentPlaying.artist && (
                  <p className="text-sm text-gray-600">{currentPlaying.artist}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={currentPlaying.type === 'Spotify' ? 'default' : 'secondary'}>
                    {currentPlaying.type === 'Spotify' ? 'Spotify → YouTube' : currentPlaying.type}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    Added by @{currentPlaying.addedByUser?.username || 'Unknown User'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Queue */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">
          Up Next ({queue.length} songs)
        </h3>
        
        {queue.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No songs in queue. Add some music to get started!
            </CardContent>
          </Card>
        ) : (
          queue.map((item, index) => (
            <Card key={item.id} className="transition-all hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="text-lg font-bold text-gray-400 w-8">
                    {index + 1}
                  </div>
                  
                  <img 
                    src={item.smallImg} 
                    alt={item.title}
                    className="w-12 h-12 rounded-md object-cover"
                  />
                  
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.title}</h4>
                    {item.artist && (
                      <p className="text-sm text-gray-600">{item.artist}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={item.type === 'Spotify' ? 'default' : 'secondary'}>
                        {item.type === 'Spotify' ? 'Spotify → YouTube' : item.type}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        Added by @{item.addedByUser?.username || 'Unknown User'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* Vote Count */}
                    <div className="flex items-center space-x-1">
                      <ThumbsUp className="w-4 h-4" />
                      <span className="font-semibold">{item.voteCount}</span>
                    </div>
                    
                    {/* Vote Buttons */}
                    {!isAdmin && (
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant={hasUserVoted(item) ? "default" : "outline"}
                          onClick={() => handleVote(item.id, 'upvote')}
                          disabled={hasUserVoted(item)}
                          className="px-2"
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVote(item.id, 'downvote')}
                          className="px-2"
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    
                    {/* Admin Controls */}
                    {isAdmin && (
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          onClick={() => handleRemoveSong(item.id)}
                          variant="destructive"
                          className="px-2"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
