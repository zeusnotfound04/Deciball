'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDroppable } from '@dnd-kit/core';
import { useAudio } from '@/store/audioStore';
import { useUserStore } from '@/store/userStore';
import { useSocket } from '@/context/socket-context';
import { toast } from 'sonner';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';
import { 
  Music, 
  Download
} from 'lucide-react';

import PLayerCover from '@/app/components/PlayerCover';
import AudioController from '@/app/components/Controller';
import { CommandShortcut } from '@/app/components/ui/command';
import { DownloadModal } from './DownloadModal';

interface PlayerProps {
  spaceId: string;
  isAdmin?: boolean;
  userCount?: number;
  userDetails?: any[];
  className?: string;
}

export const Player: React.FC<PlayerProps> = ({ 
  spaceId, 
  isAdmin = false, 
  userCount = 0,
  userDetails = [],
  className = ""
}) => {
  const { 
    currentSong, 
    isPlaying, 
    isMuted, 
    volume,
    togglePlayPause: audioTogglePlayPause,
    mute,
    unmute,
    playNext,
    playPrev,
    play
  } = useAudio();
  
  const { socket, sendMessage } = useSocket();
  const { user } = useUserStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadData, setDownloadData] = useState<any>(null);
  const [showListeners, setShowListeners] = useState(false);
  const [activeTab, setActiveTab] = useState<'cover'>('cover');
  const [isDragOverWithUrl, setIsDragOverWithUrl] = useState(false);

  // YouTube URL extraction function
  const extractYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;
    
    const cleanedUrl = url.trim();
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = cleanedUrl.match(regExp);
    
    if (match && match[7].length === 11) {
      return match[7];
    }
    
    // Check if it's already a video ID
    if (cleanedUrl.length === 11 && /^[a-zA-Z0-9_-]+$/.test(cleanedUrl)) {
      return cleanedUrl;
    }
    
    return null;
  };

  // Function to check if text contains YouTube URL
  const containsYouTubeUrl = (text: string): boolean => {
    return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/i.test(text);
  };

  // Function to fetch YouTube video metadata
  const fetchYouTubeMetadata = async (videoId: string) => {
    try {
      // Use YouTube oEmbed API to get video metadata
      const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch YouTube metadata');
      }
      
      const data = await response.json();
      return {
        title: data.title,
        author: data.author_name
      };
    } catch (error) {
      console.error('Error fetching YouTube metadata:', error);
      return null;
    }
  };

  // Function to play YouTube video instantly with real metadata
  const playYouTubeInstantly = async (url: string) => {
    
    
    const videoId = extractYouTubeVideoId(url);
    
    if (!videoId) {
      console.error('[Player] Invalid YouTube URL - could not extract video ID');
      toast.error('Invalid YouTube URL');
      return;
    }

    

    if (!sendMessage || !spaceId || !user?.id) {
      console.error('[Player] Missing required connection data:', { sendMessage: !!sendMessage, spaceId, userId: user?.id });
      toast.error('Unable to play - not connected');
      return;
    }

    try {
      // Show loading toast
      toast.loading('🔍 Fetching YouTube video details...');

      // Fetch real YouTube metadata
      const metadata = await fetchYouTubeMetadata(videoId);
      
      if (!metadata) {
        toast.error('Failed to fetch video details');
        return;
      }

      // Create a song object with real YouTube video data
      const realSong = {
        id: `youtube_${videoId}_${Date.now()}`,
        name: metadata.title,
        url: url,
        image: [{ 
          quality: 'high', 
          url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        }],
        downloadUrl: [{ quality: 'auto', url: videoId }],
        addedBy: user.id,
        source: 'youtube' as const,
        artistes: {
          primary: [{ 
            id: 'youtube', 
            name: metadata.author || '📺 YouTube Creator', 
            role: 'artist', 
            image: [] as [], 
            type: 'artist' as const, 
            url: '' 
          }]
        },
        voteCount: 0,
        isVoted: false
      };

      
      
      // Set current song with real data and start playing
      await play(realSong);

      
      
      // Send to backend for processing and room synchronization
      sendMessage("add-to-queue", {
        spaceId,
        url: url,
        userId: user.id,
        autoPlay: true
      });

      toast.success(`🎵 Now playing: ${metadata.title}`);
    } catch (error) {
      console.error('Error playing YouTube video:', error);
      toast.error('Failed to play YouTube video');
    }
  };

  // Function to download current song
  const downloadCurrentSong = async () => {
    if (!currentSong) {
      toast.error('No song is currently playing');
      return;
    }

    if (isDownloading) {
      toast.error('Download already in progress');
      return;
    }

    let videoUrl = '';
    let videoId: string | null = '';

    // Check if it's a YouTube song
    if (currentSong.source === 'youtube' && currentSong.url) {
      videoUrl = currentSong.url;
      videoId = extractYouTubeVideoId(currentSong.url);
    } else if (currentSong.downloadUrl?.[0]?.url) {
      // For songs with YouTube video IDs in downloadUrl
      const possibleId = currentSong.downloadUrl[0].url;
      if (possibleId.length === 11 && /^[a-zA-Z0-9_-]+$/.test(possibleId)) {
        videoId = possibleId;
        videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      }
    }

    if (!videoId || !videoUrl) {
      toast.error('This song cannot be downloaded (no YouTube source available)');
      return;
    }

    try {
      setIsDownloading(true);
      toast.loading('🔄 Checking download options...');

      // Call the download API with just the video ID
      const response = await fetch(`/api/download?videoId=${videoId}`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get download info');
      }

      // Check if we got a valid download response
      if (data.link && data.status === 'ok') {
        // Direct download using the returned link
        const link = document.createElement('a');
        link.href = data.link;
        link.download = data.title ? `${data.title}.mp3` : `${currentSong.name || 'audio'}.mp3`;
        link.target = '_blank'; // Open in new tab for cross-origin downloads
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success(`🎵 Download started: ${data.title || currentSong.name}`);
      } else {
        throw new Error('Invalid download response');
      }

    } catch (error) {
      console.error('Error downloading:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to download');
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle native drag and drop events for URLs
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if the dragged item contains text/URL
    const types = Array.from(e.dataTransfer.types);
    if (types.includes('text/plain') || types.includes('text/uri-list')) {
      setIsDragOverWithUrl(true);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set to false if we're leaving the entire component
    if (e.currentTarget === e.target) {
      setIsDragOverWithUrl(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverWithUrl(false);

    try {
      // Get the dropped data
      const url = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/uri-list');
      
      
      
      if (!url) {
        toast.error('No URL detected in dropped content');
        return;
      }

      // Check if it's a YouTube URL
      if (containsYouTubeUrl(url)) {
        
        // Only allow admin to drop YouTube links for instant play
        if (!isAdmin) {
          toast.error('Only admins can play YouTube videos instantly');
          return;
        }
        await playYouTubeInstantly(url);
      } else {
        
        toast.error('Please drop a valid YouTube URL');
      }
    } catch (error) {
      console.error('Error handling drop:', error);
      toast.error('Failed to process dropped content');
    }
  };

  // Droppable functionality for drag and drop
  const { isOver, setNodeRef } = useDroppable({
    id: 'player',
    data: {
      type: 'player',
    },
  });
  useEffect(() => {
    const songEndedCallback = () => {
      
      if (sendMessage && spaceId && user?.id) {
        sendMessage("songEnded", { spaceId, userId: user.id });
      } else {
        console.warn("[Player] Cannot send songEnded - missing spaceId or userId");
      }
    };

    (window as any).__songEndedCallback = songEndedCallback;

    return () => {
      delete (window as any).__songEndedCallback;
    };
  }, [sendMessage, spaceId, user?.id]);

  // WebSocket listener for YouTube song updates
  useEffect(() => {
    if (!sendMessage) return;

    const handleSongUpdated = (data: any) => {
      
      
      if (data.song && currentSong && data.song.id === currentSong.id) {
        
        // Update the current song with new metadata
        play(data.song);
        toast.success(`✅ ${data.song.name} loaded successfully!`);
      }
    };

    // Listen for song updates
    if (typeof window !== 'undefined' && (window as any).socket) {
      (window as any).socket.on('song-updated', handleSongUpdated);
      
      return () => {
        (window as any).socket.off('song-updated', handleSongUpdated);
      };
    }
  }, [sendMessage, currentSong, play]);

  const togglePlayPause = () => {
    
    
    
    const willBePlaying = !isPlaying;
    const message = willBePlaying ? 'play' : 'pause';
    
    
    
    // Always toggle locally
    audioTogglePlayPause();
    
    // Only send to server if admin (to broadcast to other users)
    if (isAdmin && sendMessage && spaceId && user?.id) {
      setTimeout(() => {
        
        sendMessage(message, { spaceId, userId: user.id });
      }, 100);
    } else if (!isAdmin) {
      
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowRight':
          if (e.ctrlKey) {
            e.preventDefault();
            playNext();
          }
          break;
        case 'ArrowLeft':
          if (e.ctrlKey) {
            e.preventDefault();
            playPrev();
          }
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          isMuted ? unmute() : mute();
          break;
        case 'l':
        case 'L':
          if (e.ctrlKey) {
            e.preventDefault();
            setShowListeners(!showListeners);
          }
          break;
        case 'd':
        case 'D':
          if (e.ctrlKey) {
            e.preventDefault();
            downloadCurrentSong();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [togglePlayPause, playNext, playPrev, isMuted, mute, unmute, showListeners, downloadCurrentSong]);

  if (!currentSong) {
    return (
      <Card className={`w-full bg-midnight-surface border-graphite rounded-cards ${className}`}>
        <CardContent className="p-4 sm:p-6">
          <div className="text-center py-6 sm:py-8">
            <span className="block font-serif italic text-[36px] sm:text-[48px] text-paper-white/10 leading-none mb-4 select-none">Deciball</span>
            <h3 className="text-base sm:text-lg font-semibold text-ghost-gray font-serif italic mb-2">No music playing</h3>
            <p className="text-sm sm:text-base text-steel-gray font-satoshi mb-4">Add some songs to the queue to get started!</p>
            <p className="font-mono text-[11px] text-paper-white/30 flex items-center justify-center gap-2">
              Press
              <kbd className="px-1.5 py-0.5 bg-paper-white/10 border border-paper-white/15 rounded text-[10px] text-paper-white/50">⌘ K</kbd>
              to search songs &amp; start playing
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
 
  return (
    <motion.div
      ref={setNodeRef}
      className={`w-full h-full flex flex-col space-y-4 ${className} ${isOver ? 'ring-2 ring-electric-cyan/50' : ''} ${
        isDragOverWithUrl ? 'bg-deep-teal/20 ring-2 ring-electric-cyan/50' : ''
      }`}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <motion.div
        className={`w-full flex-1 overflow-hidden bg-midnight-surface border border-graphite rounded-cards min-h-0 relative`}
        initial={{ scale: 0.98 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      >
        {/* Drop Zone Overlay for Queue Items */}
        {isOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-electric-cyan/10 rounded-cards border-2 border-electric-cyan/30 flex items-center justify-center z-10"
          >
            <div className="text-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-electric-cyan mb-2"
              >
                <Music className="w-12 h-12 mx-auto" />
              </motion.div>
              <p className="text-paper-white font-satoshi font-semibold text-lg">Drop to Play Instantly!</p>
              <p className="text-steel-gray font-mono text-xs mt-1">Release to start playing this track</p>
            </div>
          </motion.div>
        )}

        {/* Drop Zone Overlay for YouTube URLs */}
        {isDragOverWithUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-electric-cyan/10 rounded-cards border-2 border-electric-cyan/30 flex items-center justify-center z-10"
          >
            <div className="text-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-electric-cyan mb-2"
              >
                <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </motion.div>
              <p className="text-paper-white font-satoshi font-semibold text-lg">Drop YouTube URL!</p>
              <p className="text-steel-gray font-mono text-xs mt-1">{isAdmin ? 'Release to play instantly' : 'Admin only feature'}</p>
            </div>
          </motion.div>
        )}
        <CardContent className="p-0 bg-midnight-surface h-full relative">
          {/* Download Icon in Left Corner */}
          <div className="absolute top-4 left-4 z-20">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={downloadCurrentSong}
                      disabled={isDownloading}
                      variant="ghost"
                      size="sm"
                      className="w-10 h-10 p-0 bg-graphite hover:bg-charcoal border border-graphite hover:border-slate-custom text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
                    >
                      {isDownloading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-graphite border-t-electric-cyan rounded-full"
                        />
                      ) : (
                        <Download className="w-4 h-4 text-paper-white" />
                      )}
                    </Button>
                  </motion.div>
                </TooltipTrigger>
              </Tooltip>
            </TooltipProvider>
          </div>
          <motion.div
            className={`transition-all duration-300 bg-midnight-surface h-full flex flex-col ${isExpanded ? 'min-h-0' : 'min-h-0'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="rounded-xl p-3 sm:p-4 bg-midnight-surface flex-1 flex flex-col min-h-0 h-full">
              <div className={`grid gap-4 sm:gap-6 flex-1 min-h-0 h-full overflow-hidden ${isExpanded ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
                {activeTab === 'cover' && (
                  <div className="flex flex-col items-center h-full justify-center w-full overflow-hidden">
                    <motion.div
                      className="w-auto flex items-center justify-center"
                      initial={{ scale: 0.95, boxShadow: '0 0 0 0 #0000' }}
                      animate={{ scale: 1, }}
                      transition={{ duration: 0.6, ease: 'easeInOut' }}
                      whileHover={{ scale: 1.03, boxShadow: '0 12px 40px 0 rgba(0,0,0,0.4)' }}
                    >
                      <PLayerCover spaceId={spaceId} userId={user?.id} />
                    </motion.div>
                    <motion.div
                      className="mt-4 sm:mt-6 text-center px-2 max-md:hidden flex-shrink-0"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.7, delay: 0.3 }}
                      whileInView={{ opacity: 1, y: 0 }}
                    >
                      <motion.h1
                        className="text-lg sm:text-xl lg:text-2xl font-bold text-paper-white font-satoshi mb-2 line-clamp-2"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.7, delay: 0.4 }}
                      >
                        {currentSong.name}
                      </motion.h1>
                      {currentSong.artistes?.primary?.[0]?.name && (
                        <motion.p
                          className="text-sm sm:text-base lg:text-lg text-steel-gray font-mono mb-3 line-clamp-1"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.7, delay: 0.5 }}
                        >
                          {currentSong.artistes.primary[0].name}
                        </motion.p>
                      )}
                    </motion.div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </CardContent>
      </motion.div>

      <motion.div
        className="flex-shrink-0"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4 }}
      >
        <AudioController 
          customTogglePlayPause={togglePlayPause}
          spaceId={spaceId}
          userId={user?.id}
          // isAdmin={isAdmin}
        />
      </motion.div>

      {/* Download Modal */}
      {downloadData && (
        <DownloadModal
          isOpen={showDownloadModal}
          onClose={() => setShowDownloadModal(false)}
          songData={downloadData}
        />
      )}
    </motion.div>
  );
};