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
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { PiArrowFatLineUpFill } from "react-icons/pi";
import { LuArrowBigUpDash } from "react-icons/lu";
import { Link, Plus, Loader2, MessageCircle, X, Trash2, Music } from 'lucide-react';
import { Chat } from './Chat';
import { 
  PlayIcon, 
  DeleteIcon, 
  NextIcon,
  UsersIcon,
  TimeIcon,
  PlayListIcon,
  SearchIcon
} from '@/components/icons';
import { inter, outfit, manrope, spaceGrotesk } from '@/lib/font';
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

// Personalized Empty Queue Message Component
const PersonalizedEmptyMessage = ({ userName }: { userName?: string }) => {
  const displayName = userName || "Music Lover";
  const message = `What's in your mind, ${displayName}?`;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4 }}
      className="h-full flex items-center justify-center min-h-[200px]"
    >
      <Card className="bg-[#1C1E1F] border-[#424244] w-full">
        <CardContent className="py-8 sm:py-12 text-center text-gray-400">
          <motion.div 
            className="flex flex-col items-center gap-3 sm:gap-4"
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
                <PlayListIcon width={48} height={48} className="sm:w-16 sm:h-16 text-gray-600" />
              </div>
            </motion.div>
            
            {/* Animated Personalized Message */}
            <div>
              <motion.p 
                className="text-base sm:text-lg font-medium mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
                animate={{ 
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {message}
              </motion.p>
              <motion.p 
                className="text-sm"
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
              >
                Add some music to get the party started!
              </motion.p>
            </div>
            
            <motion.div 
              className="flex items-center gap-2 text-xs sm:text-sm"
              animate={{ 
                opacity: [0.4, 0.8, 0.4],
                y: [0, -2, 0]
              }}
              transition={{ 
                duration: 2.2, 
                repeat: Infinity,
                delay: 1
              }}
            >
              <div className="text-current">
                <SearchIcon width={14} height={14} className="sm:w-4 sm:h-4" />
              </div>
              <span className="text-center">Search and add your favorite tracks</span>
            </motion.div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Floating heart/upvote particles animation
const FloatingParticles = ({ trigger }: { trigger: boolean }) => {
  const particles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    delay: i * 0.1,
    angle: (i * 45) * (Math.PI / 180), // Convert to radians
  }));

  if (!trigger) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute top-1/2 left-1/2 text-blue-400"
          initial={{ 
            opacity: 0, 
            scale: 0, 
            x: -8, 
            y: -8,
            rotate: 0 
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.2, 0.8],
            x: Math.cos(particle.angle) * 30 - 8,
            y: Math.sin(particle.angle) * 30 - 8,
            rotate: 360,
          }}
          transition={{
            duration: 1.2,
            delay: particle.delay,
            ease: "easeOut"
          }}
        >
          <PiArrowFatLineUpFill size={12} />
        </motion.div>
      ))}
    </div>
  );
};

// Ripple effect animation
const RippleEffect = ({ trigger }: { trigger: boolean }) => {
  if (!trigger) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
      {[0, 0.2, 0.4].map((delay, index) => (
        <motion.div
          key={index}
          className="absolute inset-0 border-2 border-blue-400/50 rounded-xl"
          initial={{ scale: 0, opacity: 0.8 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{
            duration: 0.8,
            delay,
            ease: "easeOut"
          }}
        />
      ))}
    </div>
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
  const [animationTrigger, setAnimationTrigger] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Simple click handler that works on both desktop and mobile
  const handleVoteClick = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Trigger particle animation
    setAnimationTrigger(true);
    setShowSuccess(true);
    
    // Reset animation trigger
    setTimeout(() => setAnimationTrigger(false), 1200);
    setTimeout(() => setShowSuccess(false), 2000);
    
    onClick(e);
  };
  
  return (
    <motion.div className="relative">
      {/* Success message */}
      <AnimatePresence>
        {showSuccess && !isVoted && (
          <motion.div
            className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-green-500/20 text-green-400 px-3 py-1 rounded-lg text-xs font-bold backdrop-blur-xl border border-green-500/30 shadow-lg z-10"
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            Upvoted! 🎵
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={handleVoteClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        style={{ touchAction: 'manipulation' }}
        className={`relative flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-all duration-300 backdrop-blur-xl border-2 shadow-xl overflow-hidden min-w-[44px] min-h-[44px] ${outfit.className} font-medium ${
          isVoted 
            ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-lg shadow-blue-500/20 ring-1 ring-blue-400/30' 
            : 'bg-white/10 text-gray-300 border-white/20 hover:bg-white/15 hover:border-white/30 hover:text-white hover:shadow-2xl hover:ring-1 hover:ring-white/20'
        }`}
      >
        {/* Ripple effect */}
        <RippleEffect trigger={animationTrigger} />
        
        {/* Floating particles */}
        <FloatingParticles trigger={animationTrigger} />
        
        {/* Glow effect when clicked */}
        <AnimatePresence>
          {animationTrigger && (
            <motion.div
              className="absolute inset-0 bg-blue-400/20 rounded-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            />
          )}
        </AnimatePresence>

        {/* Icon with enhanced animation */}
        <motion.div
          animate={
            isVoted 
              ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] } 
              : animationTrigger 
                ? { scale: [1, 1.4, 1], rotate: [0, 15, 0] }
                : {}
          }
          transition={{ duration: isVoted ? 0.4 : 0.6, ease: "easeOut" }}
          className="flex items-center justify-center relative z-10"
          style={{ minWidth: '16px', minHeight: '16px' }}
        >
          {isVoted ? (
            <motion.div
              animate={{ 
                filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"],
              }}
              transition={{ duration: 0.5, repeat: 2 }}
            >
              <PiArrowFatLineUpFill 
                size={14} 
                className="sm:w-4 sm:h-4 text-blue-400"
                style={{ color: '#60a5fa', display: 'block' }} 
              />
            </motion.div>
          ) : (
            <LuArrowBigUpDash 
              size={14} 
              className="sm:w-4 sm:h-4 text-gray-300"
              style={{ color: 'currentColor', display: 'block' }} 
            />
          )}
        </motion.div>

        {/* Vote count with enhanced animation */}
        <motion.span 
          className="font-bold text-xs sm:text-sm relative z-10"
          animate={
            isVoted 
              ? { scale: [1, 1.2, 1], color: ["#60a5fa", "#93c5fd", "#60a5fa"] } 
              : animationTrigger 
                ? { scale: [1, 1.3, 1] }
                : {}
          }
          transition={{ duration: isVoted ? 0.4 : 0.6 }}
        >
          {voteCount}
        </motion.span>

        {/* Sparkle effect */}
        <AnimatePresence>
          {animationTrigger && (
            <>
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-blue-400 rounded-full"
                  style={{
                    top: `${20 + Math.random() * 60}%`,
                    left: `${20 + Math.random() * 60}%`,
                  }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                    rotate: 360
                  }}
                  transition={{
                    duration: 1,
                    delay: i * 0.1,
                    ease: "easeOut"
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>
      </motion.button>
    </motion.div>
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
      <Card
        onClick={handleCardClick}
        className={`transition-all duration-500 backdrop-blur-xl shadow-xl w-full max-w-full queue-card relative ${
          isCurrentlyPlaying 
            ? 'border-blue-500/40 bg-blue-900/20 shadow-2xl shadow-blue-500/25 ring-1 ring-blue-500/20' 
            : isAdmin 
              ? 'bg-[#1C1E1F] cursor-pointer hover:shadow-2xl hover:shadow-black/30 hover:ring-white/10 hover:border-blue-400/30'
              : 'bg-[#1C1E1F] cursor-not-allowed opacity-75'
        } ${(isDragging || isSortableDragging) ? 'shadow-2xl shadow-blue-500/50 ring-2 ring-blue-400/50 z-50' : ''}`}
        role={!isCurrentlyPlaying && isAdmin ? "button" : undefined}
        tabIndex={!isCurrentlyPlaying && isAdmin ? 0 : undefined}
        title={
          !isCurrentlyPlaying 
            ? (isAdmin ? "Drag to player or click to play instantly (Admin only)" : "Play instantly (Admin only)")
            : undefined
        }
      >
        <CardContent className="p-2 sm:p-3 w-full max-w-full">
          <div className="flex items-center w-full max-w-full min-w-0" style={{ gap: verticalGap }}>
            <motion.div 
              className="relative flex-shrink-0"
              layout
              transition={{ duration: 0.6 }}
            >
              <motion.img 
                src={item.smallImg} 
                alt={item.title}
                style={{ width: albumArtSize, height: albumArtSize }}
                className="rounded-xl object-cover shadow-2xl"
                whileHover={!isCurrentlyPlaying ? { scale: 1.05 } : {}}
                transition={{ duration: 0.3 }}
              />
              {isCurrentlyPlaying && <PlayingAnimation />}
            </motion.div>
            <motion.div 
              className="flex-1 min-w-0 max-w-full overflow-hidden" 
              layout
              transition={{ duration: 0.6 }}
            >
              <motion.h4 
                style={{ fontSize: titleFontSize }}
                className="font-semibold text-white truncate w-full queue-text"
                layout
              >
                {item.title}
              </motion.h4>
              {item.artist && (
                <motion.p 
                  style={{ fontSize: artistFontSize }}
                  className="text-gray-400 truncate w-full queue-text"
                  layout
                >
                  {item.artist}
                </motion.p>
              )}
            </motion.div>
            
            <motion.div 
              className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0"
              layout
              transition={{ duration: 0.6 }}
            >
              {!isCurrentlyPlaying && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
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
                </motion.div>
              )}
              
              {isAdmin && (
                <motion.div
                  initial={{ opacity: 1, scale: 1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="pointer-events-auto"
                >
                  <Button
                    size="sm"
                    onClick={handleRemoveClick}
                    className={`px-2 sm:px-3 py-1.5 sm:py-2 bg-red-500/20 hover:bg-red-500/30 border-2 border-red-500/30 hover:border-red-500/50 backdrop-blur-xl shadow-xl ring-1 ring-red-500/20 hover:ring-red-500/30 min-w-[44px] min-h-[44px] flex items-center justify-center ${outfit.className} font-medium`}
                    title="Remove song from queue"
                  >
                    <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-400" />
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
          background: #6b7280;
          border-radius: 3px;
          border: none;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
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
      <div className={`h-full w-full max-w-full flex flex-col min-h-0 ${className}`}>
      <motion.div 
        className={`flex flex-col h-full min-h-0 p-2 sm:p-3 ${showChatOverlay ? 'pointer-events-none' : ''}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header - Fixed */}
        <motion.div 
          className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-4 xl:gap-6 flex-shrink-0 mb-2 relative z-10"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0">
            <motion.div
              whileHover={{ rotate: 5, scale: 1.1 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0"
            >
              <div className="text-white">
                <PlayListIcon width={24} height={24} className="sm:w-7 sm:h-7 text-white" />
              </div>
            </motion.div>
            <div className="flex flex-col">
              <h2 className="text-xl sm:text-2xl font-bold text-white truncate">Music Queue</h2>
            </div>
          </div>
          
          {/* Admin Action Buttons - Add Direct URL and Playlist */}
          <div className="flex items-center gap-2 flex-shrink-0 w-full lg:w-auto justify-center lg:justify-end transition-all duration-300 ease-in-out relative z-10">
            {/* Chat Button - Available to all users */}
            <Button
              onClick={() => setShowChatOverlay(true)}
              variant="outline"
              size="sm"
              className="bg-cyan-500/20 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30 hover:text-cyan-200 transition-all duration-200"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat
            </Button>
            
            {/* Admin Only Buttons */}
            {adminStatus && (
              <>                
                {/* Direct URL/Link Button */}
                <Dialog open={showDirectUrlDialog} onOpenChange={setShowDirectUrlDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-green-500/20 border-green-500/30 text-green-300 hover:bg-green-500/30 hover:text-green-200 transition-all duration-200"
                  >
                    <Link className="w-4 h-4 mr-2" />
                    Add Link
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl p-0 max-w-md">
                  <div className="p-8">
                    <DialogHeader className="mb-8">
                      <DialogTitle className={`text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-3 text-center ${spaceGrotesk.className}`}>
                        Add Direct Link
                      </DialogTitle>
                      <p className={`text-white/70 text-base leading-relaxed text-center ${spaceGrotesk.className}`}>
                        Paste a YouTube video or Spotify track URL to add it instantly to the queue
                      </p>
                    </DialogHeader>
                    <div className="space-y-6">
                      <Input
                        value={directUrl}
                        onChange={(e) => setDirectUrl(e.target.value)}
                        placeholder="Paste YouTube video URL or Spotify track URL..."
                        className={`w-full py-3 px-4 bg-white/5 backdrop-blur-sm border border-white/20 hover:bg-white/10 transition-all duration-300 text-white placeholder-white/50 text-base h-12 rounded-xl focus:border-green-400/50 focus:ring-1 focus:ring-green-400/20 ${spaceGrotesk.className}`}
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
                          className={`bg-white/5 backdrop-blur-sm border border-white/20 hover:bg-white/10 transition-all duration-300 text-white hover:text-white text-base h-12 rounded-xl px-6 ${spaceGrotesk.className}`}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleAddDirectUrl}
                          disabled={!directUrl.trim() || isAddingDirectUrl}
                          className={`bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-base h-12 rounded-xl px-6 transition-all duration-300 shadow-lg hover:shadow-green-500/25 ${spaceGrotesk.className}`}
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
                    variant="outline"
                    size="sm"
                    className="bg-purple-500/20 border-purple-500/30 text-purple-300 hover:bg-purple-500/30 hover:text-purple-200 transition-all duration-200"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Playlist
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl p-0 max-w-md">
                  <div className="p-8">
                    <DialogHeader className="mb-8">
                      <div className="flex items-center justify-center mb-4">
                        <div className="p-3 bg-green-500/10 rounded-full border border-green-500/20">
                          <SpotifyLogo className="w-8 h-8 text-green-500" />
                        </div>
                      </div>
                      <DialogTitle className={`text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-3 text-center ${spaceGrotesk.className}`}>
                        Add Spotify Playlist
                      </DialogTitle>
                      <p className={`text-white/70 text-base leading-relaxed text-center ${spaceGrotesk.className}`}>
                        Import an entire Spotify playlist to the queue with optimized processing
                      </p>
                    </DialogHeader>
                    <div className="space-y-6">
                      <Input
                        value={playlistUrl}
                        onChange={(e) => setPlaylistUrl(e.target.value)}
                        placeholder="Paste Spotify playlist URL..."
                        className={`w-full py-3 px-4 bg-white/5 backdrop-blur-sm border border-white/20 hover:bg-white/10 transition-all duration-300 text-white placeholder-white/50 text-base h-12 rounded-xl focus:border-green-400/50 focus:ring-1 focus:ring-green-400/20 ${spaceGrotesk.className}`}
                        disabled={isProcessingPlaylist}
                      />
                      
                      {/* Progress Display */}
                      {playlistProgress && (
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className={`text-white/80 ${spaceGrotesk.className}`}>{playlistProgress.status}</span>
                            <span className={`text-white/60 ${spaceGrotesk.className}`}>
                              {playlistProgress.total > 0 && 
                                `${playlistProgress.current}/${playlistProgress.total}`
                              }
                            </span>
                          </div>
                          {playlistProgress.total > 0 && (
                            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300 shadow-lg"
                                style={{ width: `${playlistProgress.percentage}%` }}
                              />
                            </div>
                          )}
                          {playlistProgress.currentTrack && (
                            <div className="w-full min-w-0">
                              <p className={`text-xs text-white/60 truncate ${spaceGrotesk.className}`}>
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
                          className={`bg-white/5 backdrop-blur-sm border border-white/20 hover:bg-white/10 transition-all duration-300 text-white hover:text-white text-base h-12 rounded-xl px-6 ${spaceGrotesk.className}`}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleProcessSpotifyPlaylist}
                          disabled={!playlistUrl.trim() || isProcessingPlaylist}
                          className={`bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-base h-12 rounded-xl px-6 transition-all duration-300 shadow-lg hover:shadow-green-500/25 ${spaceGrotesk.className}`}
                        >
                          {isProcessingPlaylist && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Process Playlist
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              </>
            )}
          </div>
        </motion.div>

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
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <motion.h3 
                  className="text-base sm:text-lg font-semibold text-white flex items-center gap-2"
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                >
                  <div className="text-green-400">
                    <PlayIcon width={18} height={18} className="sm:w-5 sm:h-5 text-green-400" />
                  </div>
                  Now Playing
                </motion.h3>
                
                {/* Clear Queue Button - Next to Now Playing */}
                {adminStatus && sortedQueue.length > 0 && (
                  <Dialog open={showClearQueueDialog} onOpenChange={setShowClearQueueDialog}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30 hover:text-red-200 transition-all duration-200 shadow-lg hover:shadow-red-500/20"
                        disabled={sortedQueue.length === 0}
                        title="Clear entire queue (Admin only)"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear All ({sortedQueue.length})
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-black/90 backdrop-blur-xl border border-red-500/30 rounded-2xl p-0 max-w-md">
                      <div className="p-8">
                        <DialogHeader className="mb-8">
                          <div className="flex items-center justify-center mb-4">
                            <div className="p-3 bg-red-500/10 rounded-full border border-red-500/20">
                              <Trash2 className="w-8 h-8 text-red-500" />
                            </div>
                          </div>
                          <DialogTitle className={`text-2xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent mb-3 text-center ${spaceGrotesk.className}`}>
                            Clear Queue
                          </DialogTitle>
                          <p className={`text-white/70 text-base leading-relaxed text-center ${spaceGrotesk.className}`}>
                            Are you sure you want to remove all {sortedQueue.length} songs from the queue? This action cannot be undone.
                          </p>
                        </DialogHeader>
                        <div className="flex justify-center gap-3">
                          <Button
                            variant="outline"
                            onClick={() => setShowClearQueueDialog(false)}
                            className={`bg-white/5 backdrop-blur-sm border border-white/20 hover:bg-white/10 transition-all duration-300 text-white hover:text-white text-base h-12 rounded-xl px-6 ${spaceGrotesk.className}`}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleEmptyQueue}
                            className={`bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white text-base h-12 rounded-xl px-6 transition-all duration-300 shadow-lg hover:shadow-red-500/25 ${spaceGrotesk.className}`}
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
          <motion.h3 
            className="text-base sm:text-lg font-semibold text-white flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 flex-shrink-0 mb-2"
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <span>Up Next</span>
            <motion.span 
              className="text-xs sm:text-sm font-normal text-gray-400"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              ({sortedQueue.length} songs)
            </motion.span>
          </motion.h3>
          
          {/* Enhanced Scrollable Queue Songs Container */}
          <div 
            className="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar queue-container-height"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#6b7280 transparent',
              maxHeight: 'calc(100vh - 440px)',
            }}
          >
            <AnimatePresence mode="popLayout">
              {sortedQueue.length === 0 ? (
                <PersonalizedEmptyMessage userName={user?.name || user?.username} />
              ) : (
                <SortableContext items={sortedQueue.map(item => item.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2 sm:space-y-3 pb-4">
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
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
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