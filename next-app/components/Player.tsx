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
  const {   user } = useUserStore();
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

    (window as any).__songEndedCallback = songEndedCallback;

    return () => {
      delete (window as any).__songEndedCallback;
    };
  }, [sendMessage, spaceId, user?.id]);

  const togglePlayPause = () => {
    console.log('[Player] togglePlayPause called, current isPlaying:', isPlaying);
    console.log('[Player] isAdmin:', isAdmin);
    
    const willBePlaying = !isPlaying;
    const message = willBePlaying ? 'play' : 'pause';
    
    console.log('[Player] Will be playing:', willBePlaying, 'Sending message:', message);
    
    // Always toggle locally
    audioTogglePlayPause();
    
    // Only send to server if admin (to broadcast to other users)
    if (isAdmin && sendMessage && spaceId && user?.id) {
      setTimeout(() => {
        console.log('[Player] Admin sending room-wide message:', message);
        sendMessage(message, { spaceId, userId: user.id });
      }, 100);
    } else if (!isAdmin) {
      console.log('[Player] Listener local play/pause - no broadcast sent');
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
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [togglePlayPause, playNext, playPrev, isMuted, mute, unmute, showListeners]);

  if (!currentSong) {
    return (
      <Card className={`w-full bg-[#1C1E1F] border-[#424244] ${className}`}>
        <CardContent className="p-4 sm:p-6">
          <div className="text-center py-6 sm:py-8">
            <Music className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-300 mb-2">No music playing</h3>
            <p className="text-sm sm:text-base text-gray-500">Add some songs to the queue to get started!</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
 console.log("[Player] Rendered with currentSong:", currentSong);
  return (
    <motion.div
      className={`w-full h-full flex flex-col space-y-4 ${className}`}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
    >
      <motion.div
        className="w-full flex-1 overflow-hidden bg-[#1C1E1F] shadow-2xl rounded-2xl border border-[#424244] min-h-0"
        initial={{ scale: 0.98 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      >
        <CardContent className="p-0 bg-[#1C1E1F] h-full">
          <motion.div
            className={`transition-all duration-300 bg-[#1C1E1F] h-full flex flex-col ${isExpanded ? 'min-h-0' : 'min-h-0'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="rounded-xl p-3 sm:p-4 bg-[#1C1E1F] backdrop-blur-md flex-1 flex flex-col min-h-0">
              <div className={`grid gap-4 sm:gap-6 flex-1 min-h-0 max-h-full overflow-hidden ${isExpanded ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
                <div className="space-y-3 sm:space-y-4 flex flex-col justify-center min-h-0">
                  {activeTab === 'cover' && (
                    <div className="flex flex-col items-center h-full justify-center sm:h-full sm:w-full max-h-full overflow-hidden">
                      <motion.div
                        className="max-w-md sm:max-w-lg lg:max-w-xl"
                        initial={{ scale: 0.95, boxShadow: '0 0 0 0 #0000' }}
                        animate={{ scale: 1, }}
                        transition={{ duration: 0.6, ease: 'easeInOut' }}
                        whileHover={{ scale: 1.03, boxShadow: '0 12px 40px 0 rgba(0,0,0,0.4)' }}
                      >
                        <PLayerCover spaceId={spaceId} userId={user?.id} />
                      </motion.div>
                      <motion.div
                        className="mt-4 sm:mt-6 text-center px-2 max-md:hidden"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.3 }}
                        whileInView={{ opacity: 1, y: 0 }}
                      >
                        <motion.h1
                          className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-2 drop-shadow-lg line-clamp-2"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.7, delay: 0.4 }}
                        >
                          {currentSong.name}
                        </motion.h1>
                        {currentSong.artistes?.primary?.[0]?.name && (
                          <motion.p
                            className="text-sm sm:text-base lg:text-lg text-gray-400 mb-3 line-clamp-1"
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
    </motion.div>
  );
};