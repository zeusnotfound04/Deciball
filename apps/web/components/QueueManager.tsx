import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from "framer-motion";

import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSocket } from '@/context/socket-context';
import { useUserStore } from '@/store/userStore';
import { useAudio, useAudioStore } from '@/store/audioStore';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { PiArrowFatLineUpFill } from "react-icons/pi";
import { LuArrowBigUpDash } from "react-icons/lu";
import { Link, Plus, Loader2, MessageCircle, Trash2 } from 'lucide-react';
import { Chat } from './Chat';
import { PlayListIcon } from '@/components/icons';
import StablePixelBlast from '@/components/ui/StablePixelBlast';
import axios from 'axios';

// Drag zone identifiers
const DRAG_ZONES = {
  QUEUE: 'queue',
  PLAYER: 'player'
} as const;

// Spotify Logo Component
const SpotifyLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg 
    className={className}
    viewBox="0 0 24 24" 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.959-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.361 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.840c.361.181.48.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.301.421-1.02.599-1.559.3z"/>
  </svg>
);

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
  className?: string;
}

const PlayingAnimation = () => {
  return (
    <div className="absolute inset-0 bg-void-black/40 rounded-xl flex items-center justify-center">
      <div className="flex items-center space-x-1">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="w-1 bg-electric-cyan rounded-full"
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

// Suggestion type from API
interface SuggestionTrack {
  title: string;
  artist: string;
  img: string;
  smallImg: string;
  spotifyId: string;
  spotifyUrl: string;
  album: string;
  duration_ms: number;
  source: 'spotify' | 'youtube' | 'fallback';
}

// Static fallback in case API fails
const FALLBACK_SUGGESTIONS: SuggestionTrack[] = [
  { title: "After Hours", artist: "The Weeknd", img: "", smallImg: "", spotifyId: "", spotifyUrl: "", album: "", duration_ms: 0, source: "fallback" },
  { title: "DAMN.", artist: "Kendrick Lamar", img: "", smallImg: "", spotifyId: "", spotifyUrl: "", album: "", duration_ms: 0, source: "fallback" },
  { title: "Utopia", artist: "Travis Scott", img: "", smallImg: "", spotifyId: "", spotifyUrl: "", album: "", duration_ms: 0, source: "fallback" },
  { title: "Tere Bina", artist: "A.R. Rahman", img: "", smallImg: "", spotifyId: "", spotifyUrl: "", album: "", duration_ms: 0, source: "fallback" },
  { title: "I Wonder", artist: "Kanye West", img: "", smallImg: "", spotifyId: "", spotifyUrl: "", album: "", duration_ms: 0, source: "fallback" },
];

// Personalized Empty Queue Message Component
const PersonalizedEmptyMessage = ({ userName, onSuggestionClick, suggestions }: { userName?: string; onSuggestionClick?: (song: SuggestionTrack) => void; suggestions: SuggestionTrack[] }) => {
  const displayName = userName || "Music Lover";
  const message = `What's in your mind, ${displayName}?`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4 }}
      className="h-full flex flex-col min-h-[200px] relative overflow-hidden rounded-xl"
    >
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <StablePixelBlast
          variant="circle"
          pixelSize={2}
          color="#19d0e8"
          speed={0.3}
          patternDensity={0.3}
          edgeFade={0.4}
          enableRipples={false}
        />
      </div>

      {/* Message */}
      <div className="relative z-10 text-center px-6 pt-8 pb-4">
        <div className="flex flex-col items-center gap-3">
          <div className="text-steel-gray">
            <PlayListIcon width={40} height={40} className="text-steel-gray" />
          </div>
          <div>
            <p className="font-satoshi text-lg text-ghost-gray mb-1">
              {message}
            </p>
            <p className="font-mono text-[11px] text-paper-white/30 flex items-center justify-center gap-2 mt-2">
              Press
              <kbd className="px-1.5 py-0.5 bg-paper-white/10 border border-paper-white/15 rounded text-[10px] text-paper-white/50">⌘ K</kbd>
              to search &amp; add songs
            </p>
          </div>
        </div>
      </div>

      {/* Horizontal song suggestions */}
      <div className="relative z-10 mt-auto px-2 pb-4">
        <p className="font-mono text-[10px] tracking-[0.05em] uppercase text-steel-gray mb-3 px-2">
          Popular right now
        </p>
        <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
          {suggestions.map((song, i) => (
            <motion.div
              key={i}
              className="flex-shrink-0 w-[100px] group cursor-pointer"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              onClick={() => onSuggestionClick?.(song)}
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-[100px] h-[100px] rounded-xl overflow-hidden mb-1.5 bg-graphite">
                <img
                  src={song.img}
                  alt={song.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  draggable={false}
                />
              </div>
              <p className="font-satoshi text-[11px] text-ghost-gray truncate group-hover:text-paper-white transition-colors">
                {song.title}
              </p>
              <p className="font-mono text-[9px] text-steel-gray truncate">
                {song.artist}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const UpvoteButton = ({
  onClick,
  isVoted = false,
  voteCount = 0
}: {
  onClick: (e?: any) => void;
  isVoted?: boolean;
  voteCount?: number;
}) => {
  // Simple click handler that works on both desktop and mobile
  const handleVoteClick = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    onClick(e);
  };

  return (
    <motion.button
      onClick={handleVoteClick}
      whileTap={{ scale: 0.95 }}
      style={{ touchAction: 'manipulation' }}
      className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg transition-colors font-mono text-xs min-w-[44px] min-h-[44px] ${
        isVoted
          ? 'bg-electric-cyan/10 border border-electric-cyan/30 text-electric-cyan'
          : 'bg-transparent border border-graphite text-steel-gray hover:border-slate-custom hover:text-paper-white'
      }`}
    >
      <div className="flex items-center justify-center" style={{ minWidth: '16px', minHeight: '16px' }}>
        {isVoted ? (
          <PiArrowFatLineUpFill
            size={14}
            className="sm:w-4 sm:h-4"
          />
        ) : (
          <LuArrowBigUpDash
            size={14}
            className="sm:w-4 sm:h-4"
          />
        )}
      </div>
      <span className="font-mono text-xs">
        {voteCount}
      </span>
    </motion.button>
  );
};

// Draggable Song Card Component
const DraggableSongCard = ({ 
  item, 
  index, 
  isCurrentlyPlaying, 
  isAdmin, 
  hasUserVoted,
  onVote, 
  onRemove, 
  onPlayInstant,
  isDragging = false
}: {
  item: QueueItem;
  index: number;
  isCurrentlyPlaying: boolean;
  isAdmin: boolean;
  hasUserVoted: boolean;
  onVote: () => void;
  onRemove: () => void;
  onPlayInstant: () => void;
  isDragging?: boolean;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ 
    id: item.id,
    data: {
      type: 'song',
      song: item
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Simple click handlers that work on both desktop and mobile
  const handleCardClick = (e: any) => {
    // Don't trigger click if we're dragging
    if (isSortableDragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (!isCurrentlyPlaying && isAdmin) {
      e.preventDefault();
      e.stopPropagation();
      onPlayInstant();
    }
  };

  const handleRemoveClick = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove();
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isDragging || isSortableDragging ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={{
        layout: { duration: 0.8, ease: [0.23, 1, 0.32, 1] },
        opacity: { duration: 0.4 },
        y: { duration: 0.4 }
      }}
      className="group cursor-grab active:cursor-grabbing"
    >
      <div
        onClick={handleCardClick}
        className={`flex items-center gap-3 p-2.5 rounded-xl group hover:bg-paper-white/[0.03] transition-all duration-200 w-full max-w-full queue-card relative ${
          isCurrentlyPlaying
            ? 'bg-paper-white/[0.04] border border-electric-cyan/15'
            : isAdmin
              ? 'cursor-pointer'
              : 'cursor-not-allowed opacity-75'
        } ${(isDragging || isSortableDragging) ? 'opacity-50 z-50' : ''}`}
        role={!isCurrentlyPlaying && isAdmin ? "button" : undefined}
        tabIndex={!isCurrentlyPlaying && isAdmin ? 0 : undefined}
        title={
          !isCurrentlyPlaying
            ? (isAdmin ? "Drag to player or click to play instantly (Admin only)" : "Play instantly (Admin only)")
            : undefined
        }
      >
        <span className="font-mono text-[11px] text-steel-gray/50 w-5 text-right flex-shrink-0">
          {index + 1}
        </span>
        <div className="relative flex-shrink-0">
          <img
            src={item.smallImg}
            alt={item.title}
            className="w-11 h-11 rounded-lg object-cover"
          />
          {isCurrentlyPlaying && <PlayingAnimation />}
        </div>
        <div className="flex-1 min-w-0 max-w-full overflow-hidden">
          <h4 className="font-satoshi text-[13px] font-medium text-paper-white truncate w-full queue-text">
            {item.title}
          </h4>
          {item.artist && (
            <p className="font-mono text-[11px] text-steel-gray truncate w-full queue-text">
              {item.artist}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
          {!isCurrentlyPlaying && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="pointer-events-auto"
            >
              <UpvoteButton
                onClick={onVote}
                isVoted={hasUserVoted}
                voteCount={item.voteCount}
              />
            </div>
          )}

          {isAdmin && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="pointer-events-auto"
            >
              <button
                onClick={handleRemoveClick}
                className="text-steel-gray hover:text-red-400 p-1.5 rounded-lg hover:bg-charcoal transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Remove song from queue"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

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
  const handleCardClick = (e: any) => {
    if (!isCurrentlyPlaying && isAdmin) {
      e.preventDefault();
      e.stopPropagation();
      onPlayInstant();
    }
  };

  const handleRemoveClick = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove();
  };

  // Height-based responsive logic (exclude sm/md)
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 900);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Height-based scaling only for lg and above (width >= 1024px)
  const isLargeScreen = windowWidth >= 1024;
  let albumArtSize = 64;
  let titleFontSize = '1.5rem';
  let artistFontSize = '1.125rem';
  let verticalGap = '0.75rem';
  if (isLargeScreen) {
    if (windowHeight < 700) {
      albumArtSize = 36;
      titleFontSize = '0.95rem';
      artistFontSize = '0.7rem';
      verticalGap = '0.25rem';
    } else if (windowHeight < 800) {
      albumArtSize = 48;
      titleFontSize = '1.1rem';
      artistFontSize = '0.85rem';
      verticalGap = '0.5rem';
    } else if (windowHeight < 900) {
      albumArtSize = 56;
      titleFontSize = '1.25rem';
      artistFontSize = '1rem';
      verticalGap = '0.75rem';
    }
  }

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
      
    </motion.div>
  );
};

export const QueueManager: React.FC<QueueManagerProps> = ({ spaceId, isAdmin = false, className = "" }) => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentPlaying, setCurrentPlaying] = useState<QueueItem | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [showChatOverlay, setShowChatOverlay] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionTrack[]>(FALLBACK_SUGGESTIONS);

  // Fetch real suggestion data from Spotify/YouTube on mount
  useEffect(() => {
    fetch('/api/suggestions')
      .then(res => res.json())
      .then(data => {
        if (data.suggestions?.length > 0) {
          setSuggestions(data.suggestions);
        }
      })
      .catch(() => {}); // silently fall back to static data
  }, []);

  // Prevent body scroll when chat overlay is open
  useEffect(() => {
    if (showChatOverlay) {
      // Store current scroll position
      const scrollY = window.scrollY;
      
      // Lock scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    
    return () => {
      // Cleanup on unmount
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [showChatOverlay]);
  
  // State for Clear Queue confirmation
  const [showClearQueueDialog, setShowClearQueueDialog] = useState(false);
  
  // New state for direct link and playlist features
  const [directUrl, setDirectUrl] = useState('');
  const [isAddingDirectUrl, setIsAddingDirectUrl] = useState(false);
  const [showDirectUrlDialog, setShowDirectUrlDialog] = useState(false);
  
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [isProcessingPlaylist, setIsProcessingPlaylist] = useState(false);
  const [showPlaylistDialog, setShowPlaylistDialog] = useState(false);
  const [playlistProgress, setPlaylistProgress] = useState<{
    current: number;
    total: number;
    percentage: number;
    currentTrack: string;
    status: string;
  } | null>(null);
  
  const { sendMessage, socket } = useSocket();
  const { user, isAdmin: userIsAdmin } = useUserStore();
  const { voteOnSong, addToQueue, play, currentSong: audioCurrentSong } = useAudio();

  // Use admin status from user store, fallback to prop for backward compatibility
  const adminStatus = userIsAdmin || isAdmin;

  const sortedQueue = useMemo(() => {
    return [...queue].sort((a, b) => {
      if (b.voteCount !== a.voteCount) {
        return b.voteCount - a.voteCount;
      }
      
      return new Date(a.createAt || 0).getTime() - new Date(b.createAt || 0).getTime();
    });
  }, [queue]);

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
    
    return cleanedUrl;
  };

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
      
      switch (type) {
        case 'queue-update':
        case 'current-queue':
          setQueue(data.queue || []);
          break;
        case 'current-song-update':
          setCurrentPlaying(data.song || null);
          
          if (data.song) {
            const isSameSong = audioCurrentSong?.id === data.song.id;
            const { isPlaying } = useAudioStore.getState();
            
            if (isSameSong && isPlaying) {
              const { pendingSync } = useAudioStore.getState();
              if (pendingSync) {
                const { handleRoomSync } = useAudioStore.getState();
                const youtubeVideoId = extractYouTubeVideoId(data.song.youtubeUrl || data.song.url);
                const existingAudioSong = {
                  id: data.song.id,
                  name: data.song.title,
                  url: cleanUrl(data.song.youtubeUrl || data.song.url),
                  artistes: {
                    primary: [{
                      id: 'youtube',
                      name: data.song.artist || (data.song.type === 'Youtube' ? ' YouTube' : 'Unknown Artist'),
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
                  addedBy: data.song.addedByUser?.username || (data.song.type === 'Youtube' ? 'YouTube User' : 'Anonymous'),
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
                  id: 'youtube',
                  name: data.song.artist || (data.song.type === 'Youtube' ? '📺 YouTube' : 'Unknown Artist'),
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
              addedBy: data.song.addedByUser?.username || (data.song.type === 'Youtube' ? 'YouTube User' : 'Anonymous'),
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
                if (youtubePlayer && youtubePlayer.seekTo) {
                  youtubePlayer.seekTo(pendingSync.timestamp, true);
                  if (pendingSync.isPlaying) {
                    youtubePlayer.playVideo();
                  } else {
                    youtubePlayer.pauseVideo();
                  }
                  const { handleRoomSync } = useAudioStore.getState();
                  handleRoomSync(pendingSync.timestamp, pendingSync.isPlaying, audioSong, true);
                }
              }
            }, 1500);
          }
          break;
        case 'song-added':
          setQueue(prev => {
            const newQueue = [...prev, data.song];
            return newQueue;
          });
          break;
        case 'vote-updated':
          setQueue(prev => prev.map(item => 
            item.id === data.streamId 
              ? { ...item, voteCount: data.voteCount, upvotes: data.upvotes }
              : item
          ));
          break;
      }
    };

    socket.addEventListener('message', handleMessage);
    sendMessage('get-queue', { spaceId });

    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket, sendMessage, spaceId, currentPlaying, adminStatus]);

  const handleVote = (streamId: string) => {
    const item = queue.find(q => q.id === streamId);
    const hasVoted = item?.upvotes?.some(vote => vote.userId === user?.id) || false;
    
    if (hasVoted) {
      voteOnSong(streamId, 'downvote');
    } else {
      voteOnSong(streamId, 'upvote');
    }
  };

  const handlePlayInstant = (songId: string) => {
    if (!adminStatus) {
      return;
    }
    sendMessage("play-instant", { spaceId, songId });
  };

  const handlePlayNext = () => {
    if (!adminStatus) return;
    sendMessage('play-next', { spaceId });
  };

  const handleRemoveSong = (streamId: string) => {
    if (!adminStatus) {
      return;
    }
    const success = sendMessage('remove-song', { spaceId, streamId });
  }

  const handleEmptyQueue = () => {
    if (!adminStatus) return;
    sendMessage('empty-queue', { spaceId });
    setShowClearQueueDialog(false);
  };

  const handleClearQueueClick = () => {
    setShowClearQueueDialog(true);
  };

  const hasUserVoted = (item: QueueItem) => {
    return item.upvotes?.some(vote => vote.userId === user?.id) || false;
  };

  // Direct URL/Link adding functionality
  const isValidYouTubeUrl = (url: string): boolean => {
    const patterns = [
      /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/,
      /^(https?:\/\/)?(www\.)?youtube\.com\/embed\/[a-zA-Z0-9_-]{11}/,
      /^[a-zA-Z0-9_-]{11}$/ // Direct video ID
    ];
    return patterns.some(pattern => pattern.test(url.trim()));
  };

  const isValidSpotifyUrl = (url: string): boolean => {
    const patterns = [
      /^(https?:\/\/)?(open\.)?spotify\.com\/track\/[a-zA-Z0-9]+/,
      /^spotify:track:[a-zA-Z0-9]+$/
    ];
    return patterns.some(pattern => pattern.test(url.trim()));
  };

  const handleAddDirectUrl = async () => {
    if (!directUrl.trim()) return;
    if (!adminStatus) {
      return;
    }

    setIsAddingDirectUrl(true);
    try {
      const trimmedUrl = directUrl.trim();
      
      if (isValidYouTubeUrl(trimmedUrl) || isValidSpotifyUrl(trimmedUrl)) {
        const success = sendMessage('add-to-queue', {
          spaceId,
          url: trimmedUrl,
          userId: user?.id,
          autoPlay: false
        });

        if (success) {
          setDirectUrl('');
          setShowDirectUrlDialog(false);
        } else {
          throw new Error('Failed to send URL to server');
        }
      } else {
        throw new Error('Invalid URL format. Please provide a valid YouTube or Spotify link.');
      }
    } catch (error: any) {
      // Error handling without toast
    } finally {
      setIsAddingDirectUrl(false);
    }
  };

  // Spotify Playlist processing functionality
  const isValidSpotifyPlaylistUrl = (url: string): boolean => {
    const patterns = [
      /^(https?:\/\/)?(open\.)?spotify\.com\/playlist\/[a-zA-Z0-9]+/,
      /^spotify:playlist:[a-zA-Z0-9]+$/,
      /^[a-zA-Z0-9]+$/ // Direct playlist ID
    ];
    return patterns.some(pattern => pattern.test(url.trim()));
  };

  const handleProcessSpotifyPlaylist = async () => {
    if (!playlistUrl.trim()) return;
    if (!adminStatus) {
      return;
    }

    setIsProcessingPlaylist(true);
    setPlaylistProgress({ current: 0, total: 0, percentage: 0, currentTrack: '', status: 'Initializing...' });

    try {
      const trimmedUrl = playlistUrl.trim();
      
      if (!isValidSpotifyPlaylistUrl(trimmedUrl)) {
        throw new Error('Invalid Spotify playlist URL. Please provide a valid Spotify playlist link.');
      }
      
      // Step 1: Get playlist tracks
      setPlaylistProgress(prev => prev ? { ...prev, status: 'Fetching playlist tracks...' } : null);
      
      const response = await axios.get(`/api/spotify/playlist?url=${encodeURIComponent(trimmedUrl)}`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch playlist');
      }

      const tracks = response.data.data.tracks;

      if (tracks.length === 0) {
        throw new Error('No tracks found in playlist');
      }

      // Step 2: Convert tracks to simplified format for backend worker pool processing
      setPlaylistProgress(prev => prev ? { 
        ...prev, 
        total: tracks.length, 
        status: 'Preparing tracks for worker pool processing...' 
      } : null);

      const songsForBatch = tracks.map((track: any, index: number) => ({
        // Send minimal data - let backend worker pool handle YouTube search
        title: track.name,
        artist: track.artists.map((a: any) => a.name).join(', '),
        album: track.album.name,
        spotifyId: track.id,
        spotifyUrl: `https://open.spotify.com/track/${track.id}`,
        smallImg: track.album.images?.[track.album.images.length - 1]?.url || '',
        bigImg: track.album.images?.[0]?.url || '',
        duration: track.duration_ms,
        source: 'Spotify' // Source is Spotify, backend will convert to YouTube
      }));

      // Step 3: Send batch request with worker pool processing
      setPlaylistProgress(prev => prev ? { 
        ...prev, 
        status: 'Sending to optimized processing system...' 
      } : null);

      const success = sendMessage('add-batch-to-queue', {
        spaceId,
        songs: songsForBatch,
        userId: user?.id,
        autoPlay: false
      });

      if (success) {
        setPlaylistProgress(prev => prev ? { 
          ...prev, 
          status: 'Processing playlist with worker pool...',
          percentage: 0
        } : null);
      } else {
        throw new Error('Failed to send playlist to processing system');
      }
      
    } catch (error: any) {
      setPlaylistProgress(prev => prev ? { 
        ...prev, 
        status: `Error: ${error.message}` 
      } : null);
      setTimeout(() => {
        setIsProcessingPlaylist(false);
        setPlaylistProgress(null);
      }, 3000);
    }
  };

  // Listen for playlist processing progress updates
  useEffect(() => {
    if (!socket || !isProcessingPlaylist) return;

    const handleProgressUpdate = (event: MessageEvent) => {
      const { type, data } = JSON.parse(event.data);
      
      if (type === 'processing-progress') {
        setPlaylistProgress({
          current: data.current || 0,
          total: data.total || 0,
          percentage: data.percentage || 0,
          currentTrack: data.currentTrack || '',
          status: data.status || 'Processing...'
        });
      } else if (type === 'batch-processing-result') {
        const successCount = data.successful || 0;
        const failedCount = data.failed || 0;
        
        setPlaylistProgress(prev => prev ? {
          ...prev,
          percentage: 100,
          status: `Completed! ${successCount} tracks added successfully.`
        } : null);
        
        setTimeout(() => {
          setIsProcessingPlaylist(false);
          setPlaylistProgress(null);
          setPlaylistUrl('');
          setShowPlaylistDialog(false);
        }, 2000);
      }
    };

    socket.addEventListener('message', handleProgressUpdate);
    return () => socket.removeEventListener('message', handleProgressUpdate);
  }, [socket, isProcessingPlaylist]);

  return (
    <>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #363636;
          border-radius: 3px;
          border: none;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3f3f3f;
        }
        .custom-scrollbar::-webkit-scrollbar-button {
          display: none;
        }
        .custom-scrollbar::-webkit-scrollbar-corner {
          background: transparent;
        }
        
        /* Responsive height increase for sm and md devices */
        @media (min-width: 640px) and (max-width: 1023px) {
          .queue-container-height {
            max-height: calc(100vh - 300px) !important;
          }
        }
      `}</style>
      <div className={`h-full w-full max-w-full flex flex-col min-h-0 relative ${className}`}>
      <motion.div 
        className={`flex flex-col h-full min-h-0 p-2 sm:p-3 ${showChatOverlay ? 'pointer-events-none' : ''}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header - Fixed */}
        <div className="flex items-center justify-between flex-shrink-0 mb-4">
          <div className="flex items-baseline gap-2">
            <h2 className="font-satoshi font-bold text-lg text-paper-white">Queue</h2>
            <span className="font-mono text-[11px] text-steel-gray">{sortedQueue.length} tracks</span>
          </div>

          {adminStatus && (
            <div className="flex items-center gap-1.5">
                {/* Direct URL/Link Button */}
                <Dialog open={showDirectUrlDialog} onOpenChange={setShowDirectUrlDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 p-0 text-steel-gray hover:text-paper-white hover:bg-charcoal rounded-lg"
                  >
                    <Link className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-midnight-surface border border-graphite rounded-cards p-0 max-w-md">
                  <div className="p-8">
                    <DialogHeader className="mb-8">
                      <DialogTitle className="text-2xl font-bold text-electric-cyan mb-3 text-center font-serif">
                        Add Direct Link
                      </DialogTitle>
                      <p className="text-steel-gray text-base leading-relaxed text-center font-satoshi">
                        Paste a YouTube video or Spotify track URL to add it instantly to the queue
                      </p>
                    </DialogHeader>
                    <div className="space-y-6">
                      <Input
                        value={directUrl}
                        onChange={(e) => setDirectUrl(e.target.value)}
                        placeholder="Paste YouTube video URL or Spotify track URL..."
                        className={`w-full py-3 px-4 bg-graphite border border-slate-custom hover:bg-charcoal transition-all duration-300 text-paper-white placeholder-steel-gray text-base h-12 rounded-xl focus:border-electric-cyan/50 focus:ring-1 focus:ring-electric-cyan/20 font-satoshi `}
                        disabled={isAddingDirectUrl}
                      />
                      <div className="flex justify-end gap-3">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowDirectUrlDialog(false);
                            setDirectUrl('');
                          }}
                          disabled={isAddingDirectUrl}
                          className={`bg-graphite border border-slate-custom hover:bg-charcoal transition-all duration-300 text-paper-white hover:text-paper-white text-base h-12 rounded-xl px-6 font-satoshi `}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleAddDirectUrl}
                          disabled={!directUrl.trim() || isAddingDirectUrl}
                          className="bg-graphite hover:bg-charcoal text-paper-white font-mono text-sm rounded-full h-12 px-6 transition-colors"
                        >
                          {isAddingDirectUrl && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Add to Queue
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Spotify Playlist Button */}
              <Dialog open={showPlaylistDialog} onOpenChange={setShowPlaylistDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 p-0 text-steel-gray hover:text-paper-white hover:bg-charcoal rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-midnight-surface border border-graphite rounded-cards p-0 max-w-md">
                  <div className="p-8">
                    <DialogHeader className="mb-8">
                      <div className="flex items-center justify-center mb-4">
                        <div className="p-3 bg-green-500/10 rounded-full border border-green-500/20">
                          <SpotifyLogo className="w-8 h-8 text-green-500" />
                        </div>
                      </div>
                      <DialogTitle className="text-2xl font-bold text-electric-cyan mb-3 text-center font-serif">
                        Add Spotify Playlist
                      </DialogTitle>
                      <p className="text-steel-gray text-base leading-relaxed text-center font-satoshi">
                        Import an entire Spotify playlist to the queue with optimized processing
                      </p>
                    </DialogHeader>
                    <div className="space-y-6">
                      <Input
                        value={playlistUrl}
                        onChange={(e) => setPlaylistUrl(e.target.value)}
                        placeholder="Paste Spotify playlist URL..."
                        className={`w-full py-3 px-4 bg-graphite border border-slate-custom hover:bg-charcoal transition-all duration-300 text-paper-white placeholder-steel-gray text-base h-12 rounded-xl focus:border-electric-cyan/50 focus:ring-1 focus:ring-electric-cyan/20 font-satoshi `}
                        disabled={isProcessingPlaylist}
                      />
                      
                      {/* Progress Display */}
                      {playlistProgress && (
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-ghost-gray font-satoshi">{playlistProgress.status}</span>
                            <span className="text-steel-gray font-mono">
                              {playlistProgress.total > 0 && 
                                `${playlistProgress.current}/${playlistProgress.total}`
                              }
                            </span>
                          </div>
                          {playlistProgress.total > 0 && (
                            <div className="w-full bg-graphite rounded-full h-2 overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300 shadow-lg"
                                style={{ width: `${playlistProgress.percentage}%` }}
                              />
                            </div>
                          )}
                          {playlistProgress.currentTrack && (
                            <div className="w-full min-w-0">
                              <p className="text-xs text-steel-gray truncate font-mono">
                                Processing: {playlistProgress.currentTrack}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex justify-end gap-3">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowPlaylistDialog(false);
                            setPlaylistUrl('');
                            setPlaylistProgress(null);
                          }}
                          disabled={isProcessingPlaylist}
                          className={`bg-graphite border border-slate-custom hover:bg-charcoal transition-all duration-300 text-paper-white hover:text-paper-white text-base h-12 rounded-xl px-6 font-satoshi `}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleProcessSpotifyPlaylist}
                          disabled={!playlistUrl.trim() || isProcessingPlaylist}
                          className="bg-graphite hover:bg-charcoal text-paper-white font-mono text-sm rounded-full h-12 px-6 transition-colors"
                        >
                          {isProcessingPlaylist && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Process Playlist
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Clear Queue Button */}
              {sortedQueue.length > 0 && (
                <Dialog open={showClearQueueDialog} onOpenChange={setShowClearQueueDialog}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-8 h-8 p-0 text-steel-gray hover:text-red-400 hover:bg-charcoal rounded-lg"
                      disabled={sortedQueue.length === 0}
                      title="Clear entire queue (Admin only)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-midnight-surface border border-red-500/30 rounded-cards p-0 max-w-md">
                    <div className="p-8">
                      <DialogHeader className="mb-8">
                        <div className="flex items-center justify-center mb-4">
                          <div className="p-3 bg-red-500/10 rounded-full border border-red-500/20">
                            <Trash2 className="w-8 h-8 text-red-500" />
                          </div>
                        </div>
                        <DialogTitle className="text-2xl font-bold text-red-400 mb-3 text-center font-serif">
                          Clear Queue
                        </DialogTitle>
                        <p className="text-steel-gray text-base leading-relaxed text-center font-satoshi">
                          Are you sure you want to remove all {sortedQueue.length} songs from the queue? This action cannot be undone.
                        </p>
                      </DialogHeader>
                      <div className="flex justify-center gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setShowClearQueueDialog(false)}
                          className="bg-graphite border border-slate-custom hover:bg-charcoal transition-all duration-300 text-paper-white hover:text-paper-white text-base h-12 rounded-xl px-6 font-satoshi"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleEmptyQueue}
                          className="bg-red-500/20 text-red-400 border border-red-500/30 font-mono text-sm rounded-full h-12 px-6 transition-colors hover:bg-red-500/30"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Clear Queue
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </div>

        {/* Scrollable Content Area with Enhanced Height Control */}
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Currently Playing - Fixed */}
          <AnimatePresence mode="wait">
          {currentPlaying && (
            <motion.div
              key="currently-playing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="flex-shrink-0 mb-4"
            >
              <div className="mb-2">
                <span className="font-mono text-[10px] tracking-[0.05em] uppercase text-electric-cyan flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-electric-cyan animate-pulse" /> now playing
                </span>
              </div>
              
              <SongCard
                item={currentPlaying}
                index={0}
                isCurrentlyPlaying={true}
                isAdmin={adminStatus}
                hasUserVoted={hasUserVoted(currentPlaying)}
                onVote={() => handleVote(currentPlaying.id)}
                onRemove={() => handleRemoveSong(currentPlaying.id)}
                onPlayInstant={() => {}}
              />
            </motion.div>
          )}
          </AnimatePresence>

          {/* Up Next Header - Fixed */}
          <h3 className="text-base font-semibold text-paper-white flex items-center gap-2 flex-shrink-0 mb-2 font-satoshi">
            <span>Up Next</span>
            <span className="font-mono text-[11px] text-steel-gray">
              ({sortedQueue.length} songs)
            </span>
          </h3>
          
          {/* Enhanced Scrollable Queue Songs Container */}
          <div 
            className="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar queue-container-height"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#363636 transparent',
              maxHeight: 'calc(100vh - 440px)',
            }}
          >
            <AnimatePresence mode="popLayout">
              {sortedQueue.length === 0 ? (
                <PersonalizedEmptyMessage
                  userName={user?.name || user?.username}
                  suggestions={suggestions}
                  onSuggestionClick={(song) => {
                    sendMessage('add-to-queue', {
                      spaceId,
                      userId: user?.id,
                      autoPlay: true,
                      trackData: {
                        title: song.title,
                        artist: song.artist,
                        artistes: {
                          all: song.artist.split(', ').map(name => ({ name })),
                          primary: song.artist.split(', ').map(name => ({ name, id: song.spotifyId || 'suggestion', role: 'primary_artist', image: [], type: 'artist', url: '' })),
                        },
                        smallImg: song.smallImg || song.img,
                        bigImg: song.img,
                        spotifyId: song.spotifyId,
                        spotifyUrl: song.spotifyUrl,
                        album: song.album,
                        duration: song.duration_ms,
                        source: song.source === 'youtube' ? 'Youtube' : 'Spotify',
                      },
                      url: song.spotifyUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(song.title + ' ' + song.artist)}`,
                    });
                  }}
                />
              ) : (
                <SortableContext items={sortedQueue.map(item => item.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1 pb-4">
                    {sortedQueue.map((item, index) => (
                      <DraggableSongCard
                        key={item.id}
                        item={item}
                        index={index}
                        isCurrentlyPlaying={false}
                        isAdmin={adminStatus}
                        hasUserVoted={hasUserVoted(item)}
                        onVote={() => handleVote(item.id)}
                        onRemove={() => handleRemoveSong(item.id)}
                        onPlayInstant={() => handlePlayInstant(item.id)}
                        isDragging={false}
                      />
                    ))}
                  </div>
                </SortableContext>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Floating Chat FAB */}
      <motion.button
        onClick={() => setShowChatOverlay(true)}
        className="absolute bottom-4 right-4 z-20 w-12 h-12 bg-electric-cyan text-void-black rounded-full flex items-center justify-center hover:bg-sky-signal transition-colors shadow-lg"
        whileTap={{ scale: 0.9 }}
      >
        <MessageCircle className="w-5 h-5" />
      </motion.button>

      {/* Chat Overlay */}
      {showChatOverlay && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ 
            overflow: 'hidden',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }}
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-void-black/50"
            onClick={() => setShowChatOverlay(false)}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          
          {/* Chat Container */}
          <div 
            className="relative w-full max-w-md h-full max-h-[90vh] mx-4"
            style={{ 
              position: 'relative',
              zIndex: 10000
            }}
          >
            <Chat 
              spaceId={spaceId} 
              className="w-full h-full"
              isOverlay={true}
              onClose={() => setShowChatOverlay(false)}
            />
          </div>
        </div>
      )}
    </div>
    </>
  );
};