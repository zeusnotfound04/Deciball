import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from '@/context/socket-context';
import { useUserStore } from '@/store/userStore';
import { useAudio, useAudioStore } from '@/store/audioStore';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { PiArrowFatLineUpFill } from "react-icons/pi";
import { LuArrowBigUpDash } from "react-icons/lu";
import { 
  PlayIcon, 
  DeleteIcon, 
  NextIcon,
  UsersIcon,
  TimeIcon,
  PlayListIcon,
  SearchIcon
} from '@/components/icons';

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
  createAt?: string;
  addedByUser: {
    id: string;
    username: string;
  };
  upvotes: Array<{
    userId: string;
  }>;
  spotifyId?: string;
  spotifyUrl?: string;
  youtubeId?: string;
  youtubeUrl?: string;
}

interface QueueManagerProps {
  spaceId: string;
  isAdmin?: boolean;
}

// Playing animation component for the now playing song
const PlayingAnimation = () => {
  return (
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-xl flex items-center justify-center">
      <div className="flex items-center space-x-1">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="w-1 bg-blue-400 rounded-full"
            animate={{
              height: [4, 16, 8, 20, 4],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.1,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Single upvote button component
const UpvoteButton = ({ 
  onClick, 
  isVoted = false,
  voteCount = 0
}: { 
  onClick: (e?: any) => void;
  isVoted?: boolean;
  voteCount?: number;
}) => {
  console.log('🔍 UpvoteButton render:', { isVoted, voteCount });
  
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all duration-300 backdrop-blur-xl border-2 shadow-xl ${
        isVoted 
          ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-lg shadow-blue-500/20 ring-1 ring-blue-400/30' 
          : 'bg-white/10 text-gray-300 border-white/20 hover:bg-white/15 hover:border-white/30 hover:text-white hover:shadow-2xl hover:ring-1 hover:ring-white/20'
      }`}
    >
      <motion.div
        animate={isVoted ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-center"
        style={{ minWidth: '16px', minHeight: '16px' }}
      >
        {isVoted ? (
          <PiArrowFatLineUpFill 
            size={16} 
            style={{ color: '#60a5fa', display: 'block' }} 
            className="text-blue-400"
          />
        ) : (
          <LuArrowBigUpDash 
            size={16} 
            style={{ color: 'currentColor', display: 'block' }} 
            className="text-gray-300"
          />
        )}
      </motion.div>
      <motion.span 
        className="font-bold text-sm"
        animate={isVoted ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        {voteCount}
      </motion.span>
    </motion.button>
  );
};

// Song card component
const SongCard = ({ 
  item, 
  index, 
  isCurrentlyPlaying, 
  isAdmin, 
  hasUserVoted,
  onVote, 
  onRemove, 
  onPlayInstant 
}: {
  item: QueueItem;
  index: number;
  isCurrentlyPlaying: boolean;
  isAdmin: boolean;
  hasUserVoted: boolean;
  onVote: () => void;
  onRemove: () => void;
  onPlayInstant: () => void;
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={{ 
        layout: { duration: 0.8, ease: [0.23, 1, 0.32, 1] },
        opacity: { duration: 0.4 },
        y: { duration: 0.4 }
      }}
      className="group"
    >
      <Card
        onClick={!isCurrentlyPlaying ? onPlayInstant : undefined}
        className={`transition-all duration-500 backdrop-blur-xl  shadow-xl ${
          isCurrentlyPlaying 
            ? 'border-blue-500/40 bg-blue-900/20 shadow-2xl shadow-blue-500/25 ring-1 ring-blue-500/20' 
            : 'bg-[#1C1E1F]   cursor-pointer hover:shadow-2xl hover:shadow-black/30  hover:ring-white/10'
        }`}
        role={!isCurrentlyPlaying ? "button" : undefined}
        tabIndex={!isCurrentlyPlaying ? 0 : undefined}
      >
        <CardContent className="p-2">
          <div className="flex items-center space-x-4">
      
            
            {/* Album Art with Animation */}
            <motion.div 
              className="relative flex-shrink-0"
              layout
              transition={{ duration: 0.6 }}
            >
              <motion.img 
                src={item.smallImg} 
                alt={item.title}
                className={`rounded-xl object-cover shadow-2xl   ${
                  isCurrentlyPlaying ? 'w-16 h-16' : 'w-16 h-16'
                }`}
                whileHover={!isCurrentlyPlaying ? { scale: 1.05 } : {}}
                transition={{ duration: 0.3 }}
              />
              {isCurrentlyPlaying && <PlayingAnimation />}
            </motion.div>
            
            {/* Song Info */}
            <motion.div 
              className="flex-1 min-w-0" 
              layout
              transition={{ duration: 0.6 }}
            >
              <motion.h4 
                className={`font-semibold text-white truncate ${
                  isCurrentlyPlaying ? 'text-lg' : 'text-base'
                }`}
                layout
              >
                {item.title}
              </motion.h4>
              {item.artist && (
                <motion.p 
                  className="text-sm text-gray-400 truncate"
                  layout
                >
                  {item.artist}
                </motion.p>
              )}
             
            </motion.div>
            
            {/* Actions */}
            <motion.div 
              className="flex items-center space-x-3"
              layout
              transition={{ duration: 0.6 }}
            >
              {/* Upvote Button - Only show for queue items, not currently playing */}
              {!isCurrentlyPlaying && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                >
                  <UpvoteButton
                    onClick={(e: any) => {
                      e?.stopPropagation?.();
                      onVote();
                    }}
                    isVoted={hasUserVoted}
                    voteCount={item.voteCount}
                  />
                </motion.div>
              )}
              
              {/* Vote Count Display for Currently Playing */}
              {isCurrentlyPlaying && (
                <motion.div 
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-xl border-2 border-white/20 shadow-xl ring-1 ring-white/10"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <PiArrowFatLineUpFill size={16} className="text-blue-400" style={{ color: '#60a5fa' }} />
                  <span className="font-bold text-white text-sm">{item.voteCount}</span>
                </motion.div>
              )}
              
              {/* Admin Delete Button */}
              {isAdmin && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove();
                    }}
                    className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border-2 border-red-500/30 hover:border-red-500/50 backdrop-blur-xl shadow-xl ring-1 ring-red-500/20 hover:ring-red-500/30"
                  >
                    <div className="text-current">
                      <DeleteIcon width={14} height={14} />
                    </div>
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const QueueManager: React.FC<QueueManagerProps> = ({ spaceId, isAdmin = false }) => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentPlaying, setCurrentPlaying] = useState<QueueItem | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const { sendMessage, socket } = useSocket();
  const { user } = useUserStore();
  const { voteOnSong, addToQueue, play, currentSong: audioCurrentSong } = useAudio();

  // Sort queue by vote count (descending) and then by creation time (ascending)
  const sortedQueue = useMemo(() => {
    return [...queue].sort((a, b) => {
      // First sort by vote count (highest first)
      if (b.voteCount !== a.voteCount) {
        return b.voteCount - a.voteCount;
      }
      
      // If vote counts are equal, sort by creation time (oldest first)
      return new Date(a.createAt || 0).getTime() - new Date(b.createAt || 0).getTime();
    });
  }, [queue]);

  // Utility function to clean up URLs
  const cleanUrl = (url: string): string => {
    if (!url) return '';
    
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
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = cleanedUrl.match(regExp);
    
    if (match && match[7].length === 11) {
      return match[7];
    }
    
    if (cleanedUrl.length === 11 && /^[a-zA-Z0-9_-]+$/.test(cleanedUrl)) {
      return cleanedUrl;
    }
    
    console.warn('Could not extract YouTube video ID from:', cleanedUrl);
    return cleanedUrl;
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
          setCurrentPlaying(data.song || null);
          
          if (data.song) {
            console.log('🎵 Starting playback of new current song:', data.song.title);
            
            const isSameSong = audioCurrentSong?.id === data.song.id;
            const { isPlaying } = useAudioStore.getState();
            
            if (isSameSong && isPlaying) {
              console.log('🎵 Same song already playing, skipping playback restart');
              
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
                  handleRoomSync(pendingSync.timestamp, pendingSync.isPlaying, existingAudioSong, true);
                }, 500);
              }
              break;
            }
            
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
                [{ quality: 'auto', url: youtubeVideoId }] : 
                [{ quality: 'auto', url: cleanUrl(data.song.url) }],
              addedByUser: data.song.addedByUser,
              voteCount: data.song.voteCount || 0,
              isVoted: false,
              source: data.song.type === 'Youtube' ? 'youtube' as const : undefined,
              video: true
            };
            
            play(audioSong);
            
            setTimeout(() => {
              const { pendingSync, youtubePlayer } = useAudioStore.getState();
              if (pendingSync) {
                console.log('🔄 Applying pending sync after song load for new user');
                
                if (youtubePlayer && youtubePlayer.seekTo) {
                  console.log('🔄 YouTube player ready, applying sync directly');
                  youtubePlayer.seekTo(pendingSync.timestamp, true);
                  if (pendingSync.isPlaying) {
                    youtubePlayer.playVideo();
                  } else {
                    youtubePlayer.pauseVideo();
                  }
                  const { handleRoomSync } = useAudioStore.getState();
                  handleRoomSync(pendingSync.timestamp, pendingSync.isPlaying, audioSong, true);
                } else {
                  console.log('🔄 YouTube player not ready yet, pending sync will be applied when ready');
                }
              }
            }, 1500);
          } else {
            console.log('🛑 No current song to play');
          }
          break;
        case 'song-added':
          console.log('➕ Song added to queue:', data.song);
          setQueue(prev => {
            const newQueue = [...prev, data.song];
            console.log('📋 Updated queue length:', newQueue.length);
            return newQueue;
          });
          break;
        case 'vote-updated':
          console.log('👍 Vote updated:', { streamId: data.streamId, voteCount: data.voteCount });
          setQueue(prev => prev.map(item => 
            item.id === data.streamId 
              ? { ...item, voteCount: data.voteCount, upvotes: data.upvotes }
              : item
          ));
          break;
        // ... other cases remain the same
      }
    };

    socket.addEventListener('message', handleMessage);
    
    console.log('📋 Requesting initial queue for space:', spaceId);
    sendMessage('get-queue', { spaceId });

    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket, sendMessage, spaceId, currentPlaying, isAdmin]);

  const handleVote = (streamId: string) => {
    // Toggle vote - if already voted, remove vote; if not voted, add upvote
    const item = queue.find(q => q.id === streamId);
    const hasVoted = item?.upvotes?.some(vote => vote.userId === user?.id) || false;
    
    console.log('🗳️ Vote action:', { 
      streamId, 
      hasVoted, 
      action: hasVoted ? 'downvote' : 'upvote',
      userId: user?.id,
      currentUpvotes: item?.upvotes 
    });
    
    if (hasVoted) {
      voteOnSong(streamId, 'downvote'); // Remove vote
    } else {
      voteOnSong(streamId, 'upvote'); // Add vote
    }
  };

  const handlePlayInstant = (songId: string) => {
    sendMessage("play-instant", { spaceId, songId });
  };

  const handlePlayNext = () => {
    if (!isAdmin) return;
    console.log('⏭️ Admin playing next song for space:', spaceId);
    sendMessage('play-next', { spaceId });
  };

  const handleRemoveSong = (streamId: string) => {
    if (!isAdmin) return;
    console.log('🗑️ Admin removing song:', streamId);
    sendMessage('remove-song', { spaceId, streamId });
  };

  const handleEmptyQueue = () => {
    if (!isAdmin) return;
    console.log('🗑️ Admin emptying queue for space:', spaceId);
    sendMessage('empty-queue', { spaceId });
  };

  const hasUserVoted = (item: QueueItem) => {
    const voted = item.upvotes?.some(vote => vote.userId === user?.id) || false;
    console.log('🔍 hasUserVoted check:', { 
      songId: item.id, 
      songTitle: item.title,
      voted, 
      userId: user?.id, 
      upvotes: item.upvotes 
    });
    return voted;
  };

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <motion.div 
        className="flex items-center justify-between"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: 5, scale: 1.1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-white">
              <PlayListIcon width={28} height={28} className="text-white" />
            </div>
          </motion.div>
          <h2 className="text-2xl font-bold text-white">Music Queue</h2>
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="px-3 py-1 rounded-full bg-blue-500/20 backdrop-blur-xl border border-blue-500/30 shadow-lg ring-1 ring-blue-500/20"
          >
            <span className="text-sm text-blue-300 font-medium">
              {queue.length} songs
            </span>
          </motion.div>
        </div>
        
       
      </motion.div>

      {/* Currently Playing */}
      <AnimatePresence mode="wait">
        {currentPlaying && (
          <motion.div
            key="currently-playing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
          >
            <div className="mb-4">
              <motion.h3 
                className="text-lg font-semibold text-white mb-3 flex items-center gap-2"
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
              >
                <div className="text-green-400">
                  <PlayIcon width={20} height={20} className="text-green-400" />
                </div>
                Now Playing
              </motion.h3>
              
              <SongCard
                item={currentPlaying}
                index={0}
                isCurrentlyPlaying={true}
                isAdmin={isAdmin}
                hasUserVoted={hasUserVoted(currentPlaying)}
                onVote={() => handleVote(currentPlaying.id)}
                onRemove={() => handleRemoveSong(currentPlaying.id)}
                onPlayInstant={() => {}}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Queue */}
      <div className="space-y-4">
        <motion.h3 
          className="text-lg font-semibold text-white flex items-center gap-2"
          initial={{ x: -10, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Up Next
          <motion.span 
            className="text-sm font-normal text-gray-400"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ({sortedQueue.length} songs)
          </motion.span>
        </motion.h3>
        
        <AnimatePresence mode="popLayout">
          {sortedQueue.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="bg-[#1C1E1F] border-[#424244] ">
                <CardContent className="py-12 text-center text-gray-400">
                  <motion.div 
                    className="flex flex-col items-center gap-4"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <motion.div
                      animate={{ 
                        rotate: [0, 5, -5, 0],
                        scale: [1, 1.05, 1]
                      }}
                      transition={{ 
                        duration: 4, 
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <div className="text-gray-600">
                        <PlayListIcon width={64} height={64} className="text-gray-600" />
                      </div>
                    </motion.div>
                    <div>
                      <p className="text-lg font-medium mb-2">No songs in queue</p>
                      <p className="text-sm">Add some music to get the party started!</p>
                    </div>
                    <motion.div 
                      className="flex items-center gap-2 text-sm"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <div className="text-current">
                        <SearchIcon width={16} height={16} />
                      </div>
                      <span>Search and add your favorite tracks</span>
                    </motion.div>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {sortedQueue.map((item, index) => (
                <SongCard
                  key={item.id}
                  item={item}
                  index={index}
                  isCurrentlyPlaying={false}
                  isAdmin={isAdmin}
                  hasUserVoted={hasUserVoted(item)}
                  onVote={() => handleVote(item.id)}
                  onRemove={() => handleRemoveSong(item.id)}
                  onPlayInstant={() => handlePlayInstant(item.id)}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
      
      <style jsx>{`
        .text-current svg path {
          stroke: currentColor !important;
        }
        .text-green-400 svg path {
          stroke: #4ade80 !important;
        }
        .text-gray-500 svg path {
          stroke: #6b7280 !important;
        }
        .text-gray-600 svg path {
          stroke: #4b5563 !important;
        }
        .text-white svg path {
          stroke: #ffffff !important;
        }
        .text-blue-400 svg path {
          stroke: #60a5fa !important;
        }
        button:hover .text-current svg path {
          stroke: currentColor !important;
        }
        button:hover .text-white svg path {
          stroke: #ffffff !important;
        }
      `}</style>
    </motion.div>
  );
};