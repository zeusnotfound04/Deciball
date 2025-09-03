import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Heart,
  MoreHorizontal,
  Volume2,
  VolumeX
} from 'lucide-react';
import { 
  PlayIcon, 
  PauseIcon, 
  PreviousIcon, 
  NextIcon, 
  ForwardTenSecondIcon,
  BackTenSecondIcon,
  MuteIcon,
  MoreVolumeIcon,
  LessVolumeIcon
} from '@/components/icons';
import { useAudio } from '@/store/audioStore';
import { useUserStore } from '@/store/userStore';
import VolumeBar from '@/components/VolumeBar';
import { inter, outfit } from '@/lib/font';
import { useSocket } from '@/context/socket-context';

interface AudioControllerProps {
  customTogglePlayPause?: () => void;
  spaceId?: string;
  userId?: string;
}

const AudioController: React.FC<AudioControllerProps> = ({ 
  customTogglePlayPause,
  spaceId,
  userId
}) => {
  const {
    isPlaying,
    isMuted,
    volume,
    progress,
    duration,
    currentSong,
    togglePlayPause,
    mute,
    unmute,
    playNext,
    playPrev,
    seek,
    setVolume
  } = useAudio();
  const { isAdmin } = useUserStore();
  const { socket, sendMessage } = useSocket();
  const playerRef = useRef<any>(null);
  console.log("IS Playing :::>>", isPlaying)

  // Enhanced progress bar interaction state with seek protection
  const [isDragging, setIsDragging] = useState(false);
  const [tempProgress, setTempProgress] = useState(0);
  const [isSeeking, setIsLocalSeeking] = useState(false);
  const [lastSeekTime, setLastSeekTime] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [seekingProgress, setSeekingProgress] = useState<number | null>(null);
  const [ignoreSync, setIgnoreSync] = useState(false);
  const [lastUserSeekTime, setLastUserSeekTime] = useState(0);
  const [userSeekValue, setUserSeekValue] = useState<number | null>(null);

  // Additional state for desktop features
  const [isLiked, setIsLiked] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState(0);
  const [isProgressActive, setIsProgressActive] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // Debounced seeking for smoother drag experience
  const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized values to prevent unnecessary recalculations
  const displayProgress = useMemo(() => {
    if (isDragging) {
      return tempProgress;
    }
    if (seekingProgress !== null) {
      return (seekingProgress / duration) * 100;
    }
    return (progress / duration) * 100;
  }, [isDragging, tempProgress, seekingProgress, duration, progress]);

  const displayTime = useMemo(() => {
    if (isDragging) {
      return (tempProgress / 100) * duration;
    }
    if (seekingProgress !== null) {
      return seekingProgress;
    }
    return progress;
  }, [isDragging, tempProgress, seekingProgress, duration, progress]);

  // Memoized format time function
  const formatTime = useCallback((seconds: any) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    // Round to avoid glitchy decimal seconds in display
    const roundedSeconds = Math.floor(seconds);
    const mins = Math.floor(roundedSeconds / 60);
    const secs = roundedSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Debounced seek function for smoother seeking during drag
  const debouncedSeek = useCallback((newTime: number) => {
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
    }
    
    seekTimeoutRef.current = setTimeout(() => {
      const currentTime = Date.now();
      if (currentTime - lastSeekTime > 100) {
        seek(newTime);
        setLastSeekTime(currentTime);
      }
    }, 50); // 50ms debounce for smooth seeking
  }, [seek, lastSeekTime]);

  // Cleanup debounced seek on unmount
  useEffect(() => {
    return () => {
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
      }
    };
  }, []);

  // Enhanced WebSocket message handling with seek protection - optimized with useCallback
  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'playback-sync':
          // Enhanced ignore logic for recent user seek operations
          const timeSinceUserSeek = Date.now() - lastUserSeekTime;
          const shouldIgnoreSync = ignoreSync || 
                                 isSeeking || 
                                 isDragging || 
                                 timeSinceUserSeek < 8000; // Ignore syncs for 8 seconds after user seek
          
          if (shouldIgnoreSync) {
            console.log('[Sync] Ignoring sync - recent user interaction:', {
              ignoreSync,
              isSeeking,
              isDragging,
              timeSinceUserSeek,
              lastUserSeekTime
            });
            return;
          }
          
          const { currentTime, isPlaying: serverPlaying } = message.data;
          
          // If we recently seeked, use our seek value instead of server time
          let expectedTime = currentTime;
          if (userSeekValue !== null && timeSinceUserSeek < 10000) {
            expectedTime = userSeekValue + (timeSinceUserSeek / 1000);
            console.log('[Sync] Using user seek value for sync calculation:', {
              userSeekValue,
              timeSinceUserSeek,
              calculatedTime: expectedTime
            });
          }
          
          const timeDiff = Math.abs(expectedTime - progress);
          
          // Only sync if drift is significant and we're not in a user-controlled state
          if (timeDiff > 8) { // Increased threshold to reduce sync conflicts
            console.log('[Sync] Correcting time drift:', { 
              expected: expectedTime, 
              current: progress, 
              diff: timeDiff,
              serverTime: currentTime,
              userSeekValue
            });
            
            setIsSyncing(true);
            seek(expectedTime);
            setTimeout(() => setIsSyncing(false), 500);
          }
          break;

        case 'playback-play':
          if (!isPlaying && !isSeeking && !isDragging) {
            if (customTogglePlayPause) {
              customTogglePlayPause();
            } else {
              togglePlayPause();
            }
          }
          break;

        case 'playback-pause':
          if (isPlaying && !isSeeking && !isDragging) {
            if (customTogglePlayPause) {
              customTogglePlayPause();
            } else {
              togglePlayPause();
            }
          }
          break;

        case 'playback-seek':
          // Only process external seek commands if we're not currently seeking
          // and it's not from our own seek operation
          const timeSinceOurSeek = Date.now() - lastUserSeekTime;
          const isOurSeek = timeSinceOurSeek < 2000; // Within 2 seconds of our seek
          
          if (!isSeeking && !isDragging && !isOurSeek) {
            const { seekTime, triggeredBy } = message.data;
            console.log('[Sync] Processing external seek command:', {
              seekTime,
              triggeredBy,
              isOurSeek,
              timeSinceOurSeek
            });
            
            setSeekingProgress(seekTime);
            seek(seekTime);
            
            // Clear the seeking progress after a short delay
            setTimeout(() => {
              setSeekingProgress(null);
            }, 1000);
          } else {
            console.log('[Sync] Ignoring external seek - currently seeking or recent user seek:', {
              isSeeking,
              isDragging,
              isOurSeek,
              timeSinceOurSeek
            });
          }
          break;

        case 'request-current-timestamp':
          // Admin is being asked for their current timestamp to sync a new joiner
          if (isAdmin && message.data.spaceId === spaceId) {
            console.log('[AdminSync] Received request for current timestamp:', message.data);
            
            // Get our current exact playback position
            const currentPlaybackTime = progress; // This is our real current time
            const isCurrentlyPlaying = isPlaying;
            
            // Send response back to server with our exact timestamp
            if (sendMessage) {
              sendMessage("admin-timestamp-response", {
                spaceId: message.data.spaceId,
                requestId: message.data.requestId,
                currentTime: currentPlaybackTime,
                isPlaying: isCurrentlyPlaying,
                userId: userId,
                respondedAt: Date.now()
              });
              
              console.log('[AdminSync] Sent timestamp response:', {
                currentTime: currentPlaybackTime,
                isPlaying: isCurrentlyPlaying,
                requestId: message.data.requestId
              });
            }
          }
          break;

        case 'admin-timestamp-sync':
          // New joiner receiving exact timestamp from admin
          if (message.data.isInitialSync && message.data.syncSource === 'admin-realtime') {
            console.log('[NewJoiner] Received admin real-time sync:', message.data);
            
            const { currentTime: adminTime, isPlaying: adminIsPlaying } = message.data;
            
            // Apply the admin's exact timestamp
            setSeekingProgress(adminTime);
            seek(adminTime);
            
            // Sync playing state if different
            if (adminIsPlaying !== isPlaying) {
              console.log('[NewJoiner] Syncing play state to admin:', adminIsPlaying);
              if (customTogglePlayPause) {
                customTogglePlayPause();
              } else {
                togglePlayPause();
              }
            }
            
            setTimeout(() => {
              setSeekingProgress(null);
            }, 1000);
          }
          break;
      }
    } catch (error) {
      console.error('[Controller] Error parsing WebSocket message:', error);
    }
  }, [ignoreSync, isSeeking, isDragging, progress, isPlaying, seek, togglePlayPause, lastUserSeekTime, userSeekValue, isAdmin, spaceId, userId, sendMessage, customTogglePlayPause]);

  useEffect(() => {
    if (!socket) return;
    socket.addEventListener('message', handleWebSocketMessage);
    return () => socket.removeEventListener('message', handleWebSocketMessage);
  }, [socket, handleWebSocketMessage]);

  // Optimized control handlers with useCallback
  const handleTogglePlayPause = useCallback(() => {
    console.log('[AudioController] handleTogglePlayPause called');
    console.log('[AudioController] customTogglePlayPause provided:', !!customTogglePlayPause);
    console.log('[AudioController] isAdmin:', isAdmin);
    
    // Always use customTogglePlayPause if available (contains admin/listener logic)
    // Otherwise fall back to direct audio store function
    if (customTogglePlayPause) {
      customTogglePlayPause();
    } else {
      // This should only happen if customTogglePlayPause is not provided
      // In that case, only admin should be able to control playback
      if (isAdmin) {
        togglePlayPause();
      } else {
        console.log('[AudioController] No customTogglePlayPause provided and user is not admin - ignoring');
      }
    }
  }, [isAdmin, customTogglePlayPause, togglePlayPause]);

  const handlePlayNext = useCallback(() => {
    if (!isAdmin) {
      console.log('[AudioController] Play Next action denied - user is not admin');
      return;
    }
    playNext();
  }, [isAdmin, playNext]);

  const handlePlayPrev = useCallback(() => {
    if (!isAdmin) {
      console.log('[AudioController] Play Previous action denied - user is not admin');
      return;
    }
    playPrev();
  }, [isAdmin, playPrev]);

  const handlePlayPauseClick = useCallback((e: any) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[AudioController] Play/Pause button clicked/touched');
    handleTogglePlayPause();
  }, [handleTogglePlayPause]);

  const handleClick = useCallback((callback: () => void) => (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    callback();
  }, []);

  const progressBarRef = useRef<HTMLDivElement>(null);

  // Memoized event position handler
  const getEventPosition = useCallback((e: any) => {
    // Handle both mouse and touch events
    if (e.touches && e.touches.length > 0) {
      return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
    }
    return { clientX: e.clientX, clientY: e.clientY };
  }, []);

  // Memoized progress calculation
  const calculateProgress = useCallback((e: any) => {
    if (!progressBarRef.current) return 0;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const position = getEventPosition(e);
    const percent = ((position.clientX - rect.left) / rect.width) * 100;
    return Math.max(0, Math.min(100, percent));
  }, [getEventPosition]);

  // Optimized progress handlers with useCallback
  const handleProgressStart = useCallback((e: any) => {
    if (!isAdmin) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Set seeking state immediately to prevent sync conflicts
    setIgnoreSync(true);
    setIsDragging(true);
    setIsProgressActive(true);
    
    const percent = calculateProgress(e);
    setTempProgress(percent);
    setSeekingProgress((percent / 100) * duration);
  }, [isAdmin, calculateProgress, duration]);

  const handleProgressMove = useCallback((e: any) => {
    if (!isDragging || !progressBarRef.current || !isAdmin) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const percent = calculateProgress(e);
    setTempProgress(percent);
    
    // Only update visual seeking progress, don't actually seek during drag
    const newTime = (percent / 100) * duration;
    setSeekingProgress(newTime);
  }, [isDragging, isAdmin, calculateProgress, duration]);

  const handleProgressEnd = useCallback((e?: any) => {
    if (!isDragging || !isAdmin) return;
    
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const newTime = (tempProgress / 100) * duration;
    const currentTime = Date.now();
    
    // Enhanced seeking with better state management
    if (currentTime - lastSeekTime > 200) {
      setIsLocalSeeking(true);
      setIgnoreSync(true);
      
      // Store the seek information for sync coordination
      setLastUserSeekTime(currentTime);
      setUserSeekValue(newTime);
      
      console.log('[Seek] User drag seek to:', newTime, 'seconds');
      
      // Store current playing state to restore after seek
      const wasPlaying = isPlaying;
      
      // Perform the actual seek
      seek(newTime);
      setLastSeekTime(currentTime);
      
      // Send seek command to server for coordination
      if (sendMessage && spaceId && userId) {
        sendMessage("seek-playback", {
          spaceId,
          userId,
          seekTime: newTime,
          timestamp: currentTime
        });
      }
      
      // Clear seeking states with optimized timing
      setTimeout(() => {
        setIsLocalSeeking(false);
        setSeekingProgress(null);
        
        // Ensure playback resumes if it was playing before seek
        if (wasPlaying && !isPlaying) {
          setTimeout(() => {
            if (customTogglePlayPause) {
              customTogglePlayPause();
            } else {
              togglePlayPause();
            }
          }, 100);
        }
      }, 500);
      
      // Extended ignore period for sync messages
      setTimeout(() => {
        setIgnoreSync(false);
        console.log('[Seek] Re-enabling sync after user seek operation');
      }, 10000); // 10 second ignore period
      
      // Clear user seek tracking after extended period
      setTimeout(() => {
        setUserSeekValue(null);
        console.log('[Seek] Cleared user seek value tracking');
      }, 15000); // 15 second tracking period
    } else {
      // If throttled, still clear the states quickly
      setTimeout(() => {
        setIgnoreSync(false);
        setSeekingProgress(null);
      }, 300);
    }
    
    setIsDragging(false);
    setIsProgressActive(false);
  }, [isDragging, isAdmin, tempProgress, duration, lastSeekTime, seek, isPlaying, customTogglePlayPause, togglePlayPause, sendMessage, spaceId, userId]);

  const handleProgressClick = useCallback((e: any) => {
    if (!isAdmin || isDragging) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const percent = calculateProgress(e);
    const newTime = (percent / 100) * duration;
    const currentTime = Date.now();
    
    // Enhanced click seeking with better state management
    setIgnoreSync(true);
    setSeekingProgress(newTime);
    setLastUserSeekTime(currentTime);
    setUserSeekValue(newTime);
    
    console.log('[Seek] User click seek to:', newTime, 'seconds');
    
    // Throttle seeking for clicks with optimized timing
    if (currentTime - lastSeekTime > 200) {
      setIsLocalSeeking(true);
      
      // Store current playing state
      const wasPlaying = isPlaying;
      
      seek(newTime);
      setLastSeekTime(currentTime);
      
      // Send seek command to server for coordination
      if (sendMessage && spaceId && userId) {
        sendMessage("seek-playback", {
          spaceId,
          userId,
          seekTime: newTime,
          timestamp: currentTime
        });
      }
      
      // Visual feedback for click with reduced duration
      setTempProgress(percent);
      setTimeout(() => setTempProgress(0), 50);
      
      // Clear seeking states with optimized timing
      setTimeout(() => {
        setIsLocalSeeking(false);
        setSeekingProgress(null);
        
        // Restore playback if needed
        if (wasPlaying && !isPlaying) {
          setTimeout(() => {
            if (customTogglePlayPause) {
              customTogglePlayPause();
            } else {
              togglePlayPause();
            }
          }, 100);
        }
      }, 500);
      
      // Extended ignore period for sync messages
      setTimeout(() => {
        setIgnoreSync(false);
        console.log('[Seek] Re-enabling sync after user click seek');
      }, 10000); // 10 second ignore period
      
      // Clear user seek tracking after extended period
      setTimeout(() => {
        setUserSeekValue(null);
        console.log('[Seek] Cleared user seek value tracking');
      }, 15000); // 15 second tracking period
    } else {
      // If throttled, clear states quickly
      setTimeout(() => {
        setIgnoreSync(false);
        setSeekingProgress(null);
      }, 300);
    }
  }, [isAdmin, isDragging, calculateProgress, duration, lastSeekTime, seek, isPlaying, customTogglePlayPause, togglePlayPause, sendMessage, spaceId, userId]);

  // Optimized toggle mute with useCallback
  const toggleMute = useCallback(() => {
    if (isMuted) {
      unmute();
    } else {
      mute();
    }
  }, [isMuted, unmute, mute]);

  // Optimized keyboard handler with useCallback
  const handleKeyPress = useCallback((e: any) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    switch (e.key) {
      case ' ':
        e.preventDefault();
        handleTogglePlayPause();
        break;
      case 'ArrowLeft':
        if (e.ctrlKey) {
          e.preventDefault();
          handlePlayPrev();
        } else {
          if (isAdmin) {
            const newTime = Math.max(0, displayTime - 10);
            const currentTime = Date.now();
            
            setIgnoreSync(true);
            setSeekingProgress(newTime);
            setLastUserSeekTime(currentTime);
            setUserSeekValue(newTime);
            
            console.log('[Seek] Keyboard left arrow seek to:', newTime, 'seconds');
            debouncedSeek(newTime);
            
            // Send seek command to server
            if (sendMessage && spaceId && userId) {
              sendMessage("seek-playback", {
                spaceId,
                userId,
                seekTime: newTime,
                timestamp: currentTime
              });
            }
            
            setTimeout(() => {
              setSeekingProgress(null);
            }, 500);
            
            setTimeout(() => {
              setIgnoreSync(false);
            }, 10000); // Extended ignore period
            
            setTimeout(() => {
              setUserSeekValue(null);
            }, 15000); // Clear tracking
          }
        }
        break;
      case 'ArrowRight':
        if (e.ctrlKey) {
          e.preventDefault();
          handlePlayNext();
        } else {
          if (isAdmin) {
            const newTime = Math.min(duration, displayTime + 10);
            const currentTime = Date.now();
            
            setIgnoreSync(true);
            setSeekingProgress(newTime);
            setLastUserSeekTime(currentTime);
            setUserSeekValue(newTime);
            
            console.log('[Seek] Keyboard right arrow seek to:', newTime, 'seconds');
            debouncedSeek(newTime);
            
            // Send seek command to server
            if (sendMessage && spaceId && userId) {
              sendMessage("seek-playback", {
                spaceId,
                userId,
                seekTime: newTime,
                timestamp: currentTime
              });
            }
            
            setTimeout(() => {
              setSeekingProgress(null);
            }, 500);
            
            setTimeout(() => {
              setIgnoreSync(false);
            }, 10000); // Extended ignore period
            
            setTimeout(() => {
              setUserSeekValue(null);
            }, 15000); // Clear tracking
          }
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        setVolume(Math.min(1, volume + 0.1));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setVolume(Math.max(0, volume - 0.1));
        break;
      case 'm':
        toggleMute();
        break;
    }
  }, [handleTogglePlayPause, handlePlayNext, handlePlayPrev, debouncedSeek, displayTime, duration, volume, toggleMute, setVolume, isAdmin, sendMessage, spaceId, userId]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Memoized like toggle handler
  const handleLikeToggle = useCallback(() => {
    setIsLiked(prev => !prev);
  }, []);

  // Volume control functions
  const toggleVolumeSlider = useCallback(() => {
    setShowVolumeSlider(prev => !prev);
  }, []);

  // Close volume slider when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showVolumeSlider && !target.closest('.volume-control-container')) {
        setShowVolumeSlider(false);
      }
    };

    if (showVolumeSlider) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showVolumeSlider]);

  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        handleProgressMove(e);
      };
      const handleMouseUp = (e: MouseEvent) => {
        e.preventDefault();
        handleProgressEnd(e);
      };
      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault(); // Prevent scrolling
        handleProgressMove(e);
      };
      const handleTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        handleProgressEnd(e);
      };
      
      // Add both pointer and touch events for better mobile support
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp, { passive: false });
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd, { passive: false });
      
      // Also handle when touch goes outside the viewport
      document.addEventListener('touchcancel', handleTouchEnd, { passive: false });
      
      // Prevent context menu on mobile
      const preventContextMenu = (e: Event) => e.preventDefault();
      document.addEventListener('contextmenu', preventContextMenu);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('touchcancel', handleTouchEnd);
        document.removeEventListener('contextmenu', preventContextMenu);
      };
    }
  }, [isDragging, tempProgress, duration, isAdmin, seek]);

  if (!currentSong) {
    return (
      <div className="bg-[#1C1E1F] border-t border-[#424244] p-4">
        <div className="text-center text-gray-500">No song playing</div>
      </div>
    );
  }

  // Calculate the display progress with proper seeking state handling
  const getDisplayProgress = () => {
    if (isDragging) {
      return tempProgress;
    }
    if (seekingProgress !== null) {
      return (seekingProgress / duration) * 100;
    }
    return (progress / duration) * 100;
  };

  // Calculate the display time for the progress label
  const getDisplayTime = () => {
    if (isDragging) {
      return (tempProgress / 100) * duration;
    }
    if (seekingProgress !== null) {
      return seekingProgress;
    }
    return progress;
  };

  return (
    <div className="bg-gradient-to-r from-[#1C1E1F] via-[#1C1E1F] to-[#1C1E1F] border-t border-[#424244] rounded-xl p-3 sm:p-4 shadow-2xl">
      <div className="max-w-6xl mx-auto">
        <div className="mb-3 sm:mb-4">
          <div className="flex items-center gap-1 sm:gap-2 text-xs text-gray-400 mb-1">
            <span className="text-xs sm:text-sm">{formatTime(displayTime)}</span>
            <div 
              ref={progressBarRef}
              data-progress-bar
              className={`flex-1 bg-gray-600 rounded-full relative group select-none ${
                isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
              } ${
                isSyncing ? 'ring-2 ring-blue-400 ring-opacity-70' : ''
              } ${
                isDragging || isProgressActive ? 'ring-2 ring-white ring-opacity-30' : ''
              }`}
              style={{
                height: '4px',
                touchAction: 'none', // Prevent default touch behaviors
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none'
              }}
              onMouseDown={handleProgressStart}
              onTouchStart={handleProgressStart}
              onClick={handleProgressClick}
              title={
                isSyncing ? 'Syncing with other users...' :
                isSeeking ? 'Seeking...' : 
                isAdmin ? 'Drag to seek (Admin only)' : 'Only admin can seek'
              }
            >
              <div 
                className={`bg-gradient-to-r from-gray-300 to-white rounded-full relative ${
                  isDragging ? '' : ''
                } ${
                  isSeeking ? '' : ''
                } ${
                  isSyncing ? 'bg-gradient-to-r from-blue-300 to-blue-100' : ''
                } ${
                  isProgressActive ? 'shadow-lg' : ''
                }`}
                style={{ 
                  height: '100%',
                  width: `${displayProgress}%`,
                }}
              >
                {/* Enhanced progress thumb for mobile */}
                <div 
                  className={`absolute right-0 top-1/2 transform -translate-y-1/2 bg-white rounded-full shadow-lg ${
                    isDragging || isSeeking || (isAdmin && displayProgress > 0) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  } ${
                    isDragging || isProgressActive ? '' : ''
                  } `}
                  style={{
                    width: '12px',
                    height: '12px',
                    marginRight: '-6px',
                    touchAction: 'none',
                  }}
                />
              </div>
              
              {/* Mobile touch area enhancement */}
              {isAdmin && (
                <div 
                  className="absolute inset-0 -top-2 -bottom-2 bg-transparent"
                  style={{ 
                    touchAction: 'none',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                />
              )}
            </div>
            <span className="text-xs sm:text-sm">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="flex flex-col gap-3 sm:hidden">
          {/* Main Controls Row */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={handleClick(handlePlayPrev)}
              style={{ touchAction: 'manipulation' }}
              className={`p-2 transition-colors rounded-full hover:bg-gray-700 active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center ${inter.className} ${
                isAdmin ? 'text-gray-300 hover:text-white cursor-pointer' : 'text-gray-600 cursor-not-allowed opacity-50'
              }`}
              title={isAdmin ? "Previous" : "Previous (Admin only)"}
              disabled={!isAdmin}
            >
              <div className="text-current">
                <PreviousIcon width={16} height={16} />
              </div>
            </button>

            <button
              onClick={handleClick(() => {
                if (isAdmin) {
                  const newTime = Math.max(0, displayTime - 10);
                  setIgnoreSync(true);
                  setSeekingProgress(newTime);
                  debouncedSeek(newTime);
                  
                  setTimeout(() => {
                    setSeekingProgress(null);
                  }, 400);
                  
                  setTimeout(() => {
                    setIgnoreSync(false);
                  }, 800);
                }
              })}
              style={{ touchAction: 'manipulation' }}
              className={`p-1 transition-colors rounded-full hover:bg-gray-700 active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center ${inter.className} ${
                isAdmin ? 'text-gray-400 hover:text-white cursor-pointer' : 'text-gray-600 cursor-not-allowed opacity-50'
              }`}
              title={isAdmin ? "Back 10s" : "Back 10s (Admin only)"}
              disabled={!isAdmin}
            >
              <div className="text-current">
                <BackTenSecondIcon width={14} height={14} />
              </div>
            </button>

            <button
              onClick={handleClick(handleTogglePlayPause)}
              style={{ touchAction: 'manipulation' }}
              className={`p-1 rounded-full hover:scale-105 transition-transform shadow-lg flex items-center justify-center min-w-[48px] min-h-[48px] active:scale-95 ${outfit.className} font-medium text-black cursor-pointer`}
              title={
                isAdmin 
                  ? (isPlaying ? "Pause" : "Play")
                  : (isPlaying ? "Pause (Local)" : "Play (Local)")
              }
            >
              {isPlaying ? (
                <div className="text-black">
                  <PauseIcon width={32} className='w-8' height={32} />
                </div>
              ) : (
                <div className="text-black">
                  <PlayIcon width={32} className='w-8' height={32} />
                </div>
              )}
            </button>

            <button
              onClick={handleClick(() => {
                if (isAdmin) {
                  const newTime = Math.min(duration, displayTime + 10);
                  setIgnoreSync(true);
                  setSeekingProgress(newTime);
                  debouncedSeek(newTime);
                  
                  setTimeout(() => {
                    setSeekingProgress(null);
                  }, 400);
                  
                  setTimeout(() => {
                    setIgnoreSync(false);
                  }, 800);
                }
              })}
              style={{ touchAction: 'manipulation' }}
              className={`p-1 transition-colors rounded-full hover:bg-gray-700 active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center ${inter.className} ${
                isAdmin ? 'text-gray-400 hover:text-white cursor-pointer' : 'text-gray-600 cursor-not-allowed opacity-50'
              }`}
              title={isAdmin ? "Forward 10s" : "Forward 10s (Admin only)"}
              disabled={!isAdmin}
            >
              <div className="text-current">
                <ForwardTenSecondIcon width={14} height={14} />
              </div>
            </button>

            <button
              onClick={handleClick(handlePlayNext)}
              style={{ touchAction: 'manipulation' }}
              className={`p-2 transition-colors rounded-full hover:bg-gray-700 active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center ${inter.className} ${
                isAdmin ? 'text-gray-300 hover:text-white cursor-pointer' : 'text-gray-600 cursor-not-allowed opacity-50'
              }`}
              title={isAdmin ? "Next" : "Next (Admin only)"}
              disabled={!isAdmin}
            >
              <div className="text-current">
                <NextIcon width={16} height={16} />
              </div>
            </button>

            {/* Volume Control for Mobile - Inline */}
            <div className="volume-control-container relative">
              <button
                onClick={toggleVolumeSlider}
                className="p-2 transition-colors rounded-full hover:bg-gray-700 active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center"
                title={isMuted ? "Unmute" : `Volume ${Math.round(volume * 100)}%`}
                style={{ touchAction: 'manipulation' }}
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-gray-400" />
                ) : (
                  <Volume2 className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* Horizontal Volume Slider Popup for Mobile */}
              {showVolumeSlider && (
                <div className="absolute bottom-full right-0 mb-2 bg-[#1C1E1F] backdrop-blur-sm rounded-lg border border-gray-600/50 px-8 py-5 shadow-xl z-50">
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-400 font-medium min-w-[2rem] max-lg:hidden">
                      {Math.round(volume * 100)}%
                    </div>
                    <div className="w-24">
                      <VolumeBar
                        defaultValue={volume * 100}
                        startingValue={0}
                        maxValue={100}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => setIsLiked(!isLiked)}
              className={`p-1 rounded-full transition-colors ${inter.className} ${
                isLiked ? 'text-red-500 hover:text-red-400' : 'text-gray-400 hover:text-white'
              }`}
              style={{ 
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
                userSelect: 'none'
              }}
            >
              <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-2 mx-6 justify-center">
            <button
              onClick={handleClick(handlePlayPrev)}
              style={{ touchAction: 'manipulation' }}
              className={`p-2 transition-colors rounded-full hover:bg-gray-700 active:scale-95 ${inter.className} ${
                isAdmin ? 'text-gray-300 hover:text-white cursor-pointer' : 'text-gray-600 cursor-not-allowed opacity-50'
              }`}
              title={isAdmin ? "Previous (Ctrl + ←)" : "Previous (Admin only)"}
              disabled={!isAdmin}
            >
              <div className="text-current">
                <PreviousIcon width={20} height={20} />
              </div>
            </button>

            <button
              onClick={handleClick(() => {
                if (isAdmin) {
                  const newTime = Math.max(0, displayTime - 10);
                  setIgnoreSync(true);
                  setSeekingProgress(newTime);
                  debouncedSeek(newTime);
                  
                  setTimeout(() => {
                    setSeekingProgress(null);
                  }, 400);
                  
                  setTimeout(() => {
                    setIgnoreSync(false);
                  }, 800);
                }
              })}
              style={{ touchAction: 'manipulation' }}
              className={`p-1 transition-colors rounded-full hover:bg-gray-700 active:scale-95 ${inter.className} ${
                isAdmin ? 'text-gray-400 hover:text-white cursor-pointer' : 'text-gray-600 cursor-not-allowed opacity-50'
              }`}
              title={isAdmin ? "Back 10 seconds" : "Back 10 seconds (Admin only)"}
              disabled={!isAdmin}
            >
              <div className="text-current">
                <BackTenSecondIcon width={16} height={16} />
              </div>
            </button>

            <button
              onClick={handleClick(handleTogglePlayPause)}
              style={{ touchAction: 'manipulation' }}
              className={`p-1 rounded-full hover:scale-105 transition-transform shadow-lg flex items-center justify-center min-w-[56px] min-h-[56px] active:scale-95 ${outfit.className} font-medium text-black cursor-pointer`}
              title={
                isAdmin 
                  ? (isPlaying ? "Pause (Space)" : "Play (Space)")
                  : (isPlaying ? "Pause (Local)" : "Play (Local)")
              }
            >
              {isPlaying ? (
                <div className="text-black">
                  <PauseIcon width={40} className='w-10' height={40} />
                </div>
              ) : (
                <div className="text-black">
                  <PlayIcon width={40} className='w-10' height={40} />
                </div>
              )}
            </button>

            <button
              onClick={handleClick(() => {
                if (isAdmin) {
                  const newTime = Math.min(duration, displayTime + 10);
                  setIgnoreSync(true);
                  setSeekingProgress(newTime);
                  seek(newTime);
                  
                  setTimeout(() => {
                    setSeekingProgress(null);
                  }, 800);
                  
                  setTimeout(() => {
                    setIgnoreSync(false);
                  }, 1200);
                }
              })}
              style={{ touchAction: 'manipulation' }}
              className={`p-1 transition-colors rounded-full hover:bg-gray-700 active:scale-95 ${inter.className} ${
                isAdmin ? 'text-gray-400 hover:text-white cursor-pointer' : 'text-gray-600 cursor-not-allowed opacity-50'
              }`}
              title={isAdmin ? "Forward 10 seconds" : "Forward 10 seconds (Admin only)"}
              disabled={!isAdmin}
            >
              <div className="text-current">
                <ForwardTenSecondIcon width={16} height={16} />
              </div>
            </button>

            <button
              onClick={handleClick(handlePlayNext)}
              style={{ touchAction: 'manipulation' }}
              className={`p-2 transition-colors rounded-full hover:bg-gray-700 active:scale-95 ${inter.className} ${
                isAdmin ? 'text-gray-300 hover:text-white cursor-pointer' : 'text-gray-600 cursor-not-allowed opacity-50'
              }`}
              title={isAdmin ? "Next (Ctrl + →)" : "Next (Admin only)"}
              disabled={!isAdmin}
            >
              <div className="text-current">
                <NextIcon width={20} height={20} />
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
            {/* Volume Controls - Unified Button + Popup Approach for All Devices */}
            <div className="volume-control-container relative">
              <button
                onClick={toggleVolumeSlider}
                className="p-2 transition-colors rounded-full hover:bg-gray-700 active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center"
                title={isMuted ? "Unmute" : `Volume ${Math.round(volume * 100)}%`}
                style={{ touchAction: 'manipulation' }}
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-gray-400" />
                ) : (
                  <Volume2 className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* Horizontal Volume Slider Popup for All Devices */}
              {showVolumeSlider && (
                <div className="absolute bottom-full right-0 mb-2 bg-[#1C1E1F] backdrop-blur-md rounded-xl border border-gray-600/50 p-5 sm:p-6 shadow-2xl z-[60] min-w-[180px] sm:min-w-[220px] md:min-w-[240px] max-w-[90vw]"
                     style={{
                       left: 'auto',
                       right: '0',
                       transform: 'translateX(0)'
                     }}>
                  <div className="flex items-center gap-4">
                    <div className="w-40 sm:w-48 md:w-52 max-w-full">
                      <VolumeBar
                        defaultValue={volume * 100}
                        startingValue={0}
                        maxValue={100}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        /* Enhanced mobile optimizations for progress bar */
        [data-progress-bar] {
          -webkit-tap-highlight-color: transparent !important;
          -webkit-touch-callout: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
          touch-action: none !important;
        }
        
        /* Smooth progress bar animations */
        [data-progress-bar] > div {
          backface-visibility: hidden !important;
          -webkit-backface-visibility: hidden !important;
          transform: translateZ(0) !important;
          -webkit-transform: translateZ(0) !important;
        }
        
        /* Enhanced touch targets for mobile */
        @media (max-width: 640px) {
          [data-progress-bar] {
            min-height: 20px !important;
            padding: 8px 0 !important;
            margin: -8px 0 !important;
            cursor: pointer !important;
          }
          
          [data-progress-bar]:active {
            /* Removed animation */
          }
        }
        
        /* Button optimizations */
        button {
          -webkit-tap-highlight-color: transparent !important;
          -webkit-touch-callout: none !important;
          touch-action: manipulation !important;
          user-select: none !important;
          transform: translateZ(0) !important;
          -webkit-transform: translateZ(0) !important;
        }
        
        /* Enhanced mobile feedback with better performance */
        button:active {
          /* Removed scale animation */
        }
        
        /* Icon color fixes */
        .text-black svg path {
          stroke: #000000 !important;
        }
        .text-current svg path {
          stroke: currentColor !important;
        }
        .text-gray-300 svg path,
        .text-gray-400 svg path {
          stroke: currentColor !important;
        }
        button:hover .text-current svg path {
          stroke: currentColor !important;
        }
        
        /* Minimum touch targets */
        @media (max-width: 640px) {
          button {
            min-height: 44px !important;
            min-width: 44px !important;
            position: relative !important;
          }
        }

        /* Admin-only button states */
        button:disabled {
          cursor: not-allowed !important;
          opacity: 0.5 !important;
          pointer-events: auto !important;
        }
        
        button:disabled:hover {
          transform: none !important;
          background-color: transparent !important;
        }
        
        button:disabled:active {
          transform: none !important;
        }

        /* Disable text selection and highlight */
        * {
          -webkit-tap-highlight-color: transparent !important;
        }
        
        /* Hardware acceleration for smooth performance */
        [data-progress-bar], button {
          transform: translateZ(0) !important;
          -webkit-transform: translateZ(0) !important;
          backface-visibility: hidden !important;
          -webkit-backface-visibility: hidden !important;
        }
        
      
        
        /* Improved mobile progress thumb */
        @media (max-width: 640px) {
          [data-progress-bar] .progress-thumb {
            width: 20px !important;
            height: 20px !important;
            margin-right: -10px !important;
          }
        }

        /* Volume slider container positioning */
        .volume-control-container .absolute {
          z-index: 50 !important;
        }
      `}</style>
    </div>
  );
};

export default AudioController;