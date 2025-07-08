'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAudio } from '@/store/audioStore';
import { useUserStore } from '@/store/userStore';
import { useSocket } from '@/context/socket-context';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { 
  Music, 
  Users, 
  Settings, 
  Maximize2, 
  Minimize2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipForward,
  SkipBack
} from 'lucide-react';

// Import the existing components
import PLayerCover from '@/app/components/PlayerCover';
import AudioController from '@/app/components/Controller';
import { CommandShortcut } from '@/app/components/ui/command';

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
    playPrev
  } = useAudio();
  
  const { socket, sendMessage } = useSocket();
  const { user } = useUserStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showListeners, setShowListeners] = useState(false);
  const [activeTab, setActiveTab] = useState<'cover'>('cover');
  useEffect(() => {
    const songEndedCallback = () => {
      console.log("[Player] Song ended, sending songEnded message to backend");
      if (sendMessage && spaceId && user?.id) {
        sendMessage("songEnded", { spaceId, userId: user.id });
      } else {
        console.warn("[Player] Cannot send songEnded - missing spaceId or userId");
      }
    };

    // Set global callback for audioStore to use
    (window as any).__songEndedCallback = songEndedCallback;

    // Cleanup
    return () => {
      delete (window as any).__songEndedCallback;
    };
  }, [sendMessage, spaceId, user?.id]);

  // Custom togglePlayPause that also sends room-wide messages
  const togglePlayPause = () => {
    console.log('[Player] togglePlayPause called, current isPlaying:', isPlaying);
    
    // Determine what action we're about to take
    const willBePlaying = !isPlaying;
    const message = willBePlaying ? 'play' : 'pause';
    
    console.log('[Player] Will be playing:', willBePlaying, 'Sending message:', message);
    
    // Call the audio store function first
    audioTogglePlayPause();
    
    // Send room-wide synchronization message after a brief delay to ensure state is updated
    if (sendMessage && spaceId && user?.id) {
      setTimeout(() => {
        console.log('[Player] Sending room-wide message:', message);
        sendMessage(message, { spaceId, userId: user.id });
      }, 100); // Small delay to ensure the audio store state is updated
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't interfere with input fields
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
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [togglePlayPause, playNext, playPrev, isMuted, mute, unmute, showListeners]);

  if (!currentSong) {
    return (
      <Card className={`w-full ${className}`}>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Music className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No music playing</h3>
            <p className="text-gray-500">Add some songs to the queue to get started!</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
 console.log("[Player] Rendered with currentSong:", currentSong);
  return (
    <motion.div
      className={`w-full space-y-4 ${className}`}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
    >
      {/* Main Player Card - Dark Animated Theme */}
      <motion.div
        className="w-full overflow-hidden bg-gradient-to-br from-[#181c2b] via-[#23263a] to-[#181c2b] shadow-2xl rounded-2xl border border-[#23263a]"
        initial={{ scale: 0.98 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      >
        <CardContent className="p-0">
          <motion.div
            className={`transition-all duration-300 ${isExpanded ? 'min-h-[600px]' : 'min-h-[400px]'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            {/* Player Content */}
            <div className="p-6">
              <div className={`grid gap-6 ${isExpanded ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
                {/* Left Column - Always visible */}
                <div className="space-y-4">
                  {/* Album Cover */}
                  {activeTab === 'cover' && (
                    <div className="flex flex-col items-center">
                      <motion.div
                        className="w-full max-w-sm"
                        initial={{ scale: 0.95, boxShadow: '0 0 0 0 #0000' }}
                        animate={{ scale: 1, boxShadow: '0 8px 32px 0 #0004' }}
                        transition={{ duration: 0.6, ease: 'easeInOut' }}
                        whileHover={{ scale: 1.03, boxShadow: '0 12px 40px 0 #0006' }}
                      >
                        <PLayerCover spaceId={spaceId} userId={user?.id} />
                      </motion.div>
                      {/* Song Name and Artist Name */}
                      <motion.div
                        className="mt-6 text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.3 }}
                        whileInView={{ opacity: 1, y: 0 }}
                      >
                        <motion.h1
                          className="text-2xl font-bold text-white mb-2 drop-shadow-lg"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.7, delay: 0.4 }}
                        >
                          {currentSong.name}
                        </motion.h1>
                        {currentSong.artistes?.primary?.[0]?.name && (
                          <motion.p
                            className="text-lg text-[#b3b8d1] mb-3"
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
            </div>
          </motion.div>
        </CardContent>
      </motion.div>

      {/* Audio Controller - Always at bottom */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4 }}
      >
        <AudioController 
          customTogglePlayPause={togglePlayPause}
          spaceId={spaceId}
          userId={user?.id}
          isAdmin={isAdmin}
        />
      </motion.div>
    </motion.div>
  );
};
