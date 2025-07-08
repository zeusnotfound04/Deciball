import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Volume1,
  Shuffle,
  Repeat,
  Heart,
  MoreHorizontal
} from 'lucide-react';
import { useAudio } from '@/store/audioStore';

interface AudioControllerProps {
  customTogglePlayPause?: () => void;
  spaceId?: string;
  userId?: string;
  isAdmin?: boolean; // Add admin permission check
}

const AudioController: React.FC<AudioControllerProps> = ({ 
  customTogglePlayPause,
  spaceId,
  userId,
  isAdmin = false // Default to false if not provided
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
  const playerRef = useRef<any>(null);
  console.log("IS Playing :::>>", isPlaying)

  // Use custom togglePlayPause if provided, otherwise use the default one
  const handleTogglePlayPause = () => {
    console.log('[AudioController] handleTogglePlayPause called');
    console.log('[AudioController] customTogglePlayPause provided:', !!customTogglePlayPause);
    
    if (customTogglePlayPause) {
      customTogglePlayPause();
    } else {
      togglePlayPause();
    }
  };

  const [isDragging, setIsDragging] = useState(false);
  const [tempProgress, setTempProgress] = useState(0);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState(0); // 0: off, 1: all, 2: one
  const [isSeeking, setIsLocalSeeking] = useState(false); // Local seeking state for UI feedback

  // Format time display
  const formatTime = (seconds: any) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Store the progress bar element reference for calculating position
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Handle progress bar drag
  const handleProgressMouseDown = (e: any) => {
    // Only allow admin to start dragging for seek
    // if (!isAdmin) {
    //   console.log('[AudioController] 🚫 Non-admin user tried to drag timeline - permission denied');
    //   return;
    // }
    
    e.preventDefault();
    setIsDragging(true);
    
    // Calculate initial position
    if (progressBarRef.current) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      setTempProgress(Math.max(0, Math.min(100, percent)));
    }
  };

  const handleProgressMouseMove = (e : any) => {
    if (!isDragging || !progressBarRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    setTempProgress(Math.max(0, Math.min(100, percent)));
  };

  const handleProgressMouseUp = () => {
    if (isDragging) {
      // Only allow admin to seek
      // if (!isAdmin) {
      //   console.log('[AudioController] 🚫 Non-admin user tried to seek - permission denied');
      //   setIsDragging(false);
      //   setTempProgress(0); // Reset temp progress
      //   return;
      // }
      
      const newTime = (tempProgress / 100) * duration;
      
      // Set local seeking state for UI feedback
      setIsLocalSeeking(true);
      setTimeout(() => setIsLocalSeeking(false), 3000); // Clear after 3 seconds
      
      // Apply seek immediately for responsive UI
      seek(newTime);
      setIsDragging(false);
    }
  };

  // Handle progress bar click (for direct jumping)
  const handleProgressClick = (e: any) => {
    
    // if (!isAdmin) {
    //   console.log('[AudioController] 🚫 Non-admin user tried to click timeline - permission denied');
    //   return;
    // }
    
    if (progressBarRef.current) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      const newTime = (percent / 100) * duration;
      
      // Set local seeking state for UI feedback
      setIsLocalSeeking(true);
      setTimeout(() => setIsLocalSeeking(false), 3000); // Clear after 3 seconds
      
      seek(newTime);
    }
  };

  // Handle volume control
  const handleVolumeChange = (e : any) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      unmute();
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      unmute();
    } else {
      mute();
    }
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return VolumeX;
    if (volume < 0.5) return Volume1;
    return Volume2;
  };

  const VolumeIcon = getVolumeIcon();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e : any) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          handleTogglePlayPause();
          break;
        case 'ArrowLeft':
          if (e.ctrlKey) {
            e.preventDefault();
            playPrev();
            // if (isAdmin) {
            //   playPrev();
            // } else {
            //   console.log('🚫 Non-admin user tried to use previous shortcut');
            // }
          } else {
            const newTime = Math.max(0, progress - 10);
            seek(newTime);
          }
          break;
        case 'ArrowRight':
          if (e.ctrlKey) {
            e.preventDefault();
            playNext();
            // if (isAdmin) {
            //   playNext();
            // } else {
            //   console.log('🚫 Non-admin user tried to use next shortcut');
            // }
          } else {
            const newTime = Math.min(duration, progress + 10);
            seek(newTime);
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
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleTogglePlayPause, playNext, playPrev, seek, progress, duration, volume, toggleMute, setVolume]);

  // Mouse event listeners for progress bar
  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => handleProgressMouseMove(e);
      const handleMouseUp = () => handleProgressMouseUp();
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, tempProgress, duration, isAdmin, seek]);

  if (!currentSong) {
    return (
      <div className="bg-gray-900 border-t border-gray-800 p-4">
        <div className="text-center text-gray-500">No song playing</div>
      </div>
    );
  }

  const progressPercent = isDragging ? tempProgress : (progress / duration) * 100;

  return (
    <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-t border-gray-700 p-4 shadow-2xl">
      <div className="max-w-6xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <span>{formatTime(progress)}</span>
            <div 
              ref={progressBarRef}
              className={`flex-1 bg-gray-600 rounded-full h-1 relative group transition-all duration-200 ${
                isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
              } ${
                isSeeking ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
              }`}
              onMouseDown={handleProgressMouseDown}
              onClick={handleProgressClick}
              title={
                isSeeking ? 'Seeking...' : 
                isAdmin ? 'Drag to seek (Admin only)' : 'Only admin can seek'
              }
            >
              <div 
                className={`bg-gradient-to-r from-blue-500 to-purple-500 h-1 rounded-full transition-all duration-200 relative ${
                  isDragging ? 'transition-none' : ''
                } ${
                  isSeeking ? 'animate-pulse' : ''
                }`}
                style={{ width: `${progressPercent}%` }}
              >
                <div className={`absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg transition-all duration-200 -mr-1.5 ${
                  isDragging || isSeeking || (isAdmin && progressPercent > 0) ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-100'
                } ${
                  isSeeking ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
                }`} />
              </div>
            </div>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          {/* Song Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
         
            <button
              onClick={() => setIsLiked(!isLiked)}
              className={`p-1 rounded-full transition-colors ${
                isLiked ? 'text-red-500 hover:text-red-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Main Controls */}
          <div className="flex items-center gap-2 mx-6">
            <button
              onClick={() => setIsShuffled(!isShuffled)}
              className={`p-2 rounded-full transition-colors ${
                isShuffled ? 'text-green-500 hover:text-green-400' : 'text-gray-400 hover:text-white'
              }`}
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              onClick={playPrev}
              className="p-2 text-gray-300 hover:text-white transition-colors rounded-full hover:bg-gray-700"
              title="Previous (Ctrl + ←)"
              // className={`p-2 transition-colors rounded-full ${
              //   isAdmin 
              //     ? 'text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer' 
              //     : 'text-gray-500 cursor-not-allowed opacity-50'
              // }`}
              // title={isAdmin ? "Previous (Ctrl + ←)" : "Previous song not available"}
              // disabled={!isAdmin}
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={handleTogglePlayPause}
              className="bg-white text-black p-3 rounded-full hover:scale-105 transition-transform shadow-lg"
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>

            <button
              onClick={playNext}
              className="p-2 text-gray-300 hover:text-white transition-colors rounded-full hover:bg-gray-700"
              title="Next (Ctrl + →)"
              // className={`p-2 transition-colors rounded-full ${
              //   isAdmin 
              //     ? 'text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer' 
              //     : 'text-gray-500 cursor-not-allowed opacity-50'
              // }`}
              // title={isAdmin ? "Next (Ctrl + →)" : "Only admin can skip to next song"}
              // disabled={!isAdmin}
            >
              <SkipForward className="w-5 h-5" />
            </button>

            <button
              onClick={() => setRepeatMode((repeatMode + 1) % 3)}
              className={`p-2 rounded-full transition-colors ${
                repeatMode > 0 ? 'text-green-500 hover:text-green-400' : 'text-gray-400 hover:text-white'
              }`}
              title={repeatMode === 0 ? 'Repeat Off' : repeatMode === 1 ? 'Repeat All' : 'Repeat One'}
            >
              <Repeat className={`w-4 h-4 ${repeatMode === 2 ? 'text-green-400' : ''}`} />
              {repeatMode === 2 && (
                <span className="absolute -mt-6 -ml-2 text-xs font-bold">1</span>
              )}
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            <div className="relative">
              <button
                onClick={toggleMute}
                onMouseEnter={() => setShowVolumeSlider(true)}
                className="p-2 text-gray-300 hover:text-white transition-colors rounded-full hover:bg-gray-700"
                title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
              >
                <VolumeIcon className="w-5 h-5" />
              </button>
              
              {showVolumeSlider && (
                <div 
                  className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 rounded-lg p-3 shadow-xl border border-gray-700"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(isMuted ? 0 : volume) * 100}%, #4b5563 ${(isMuted ? 0 : volume) * 100}%, #4b5563 100%)`
                    }}
                  />
                  <div className="text-xs text-gray-400 text-center mt-1">
                    {Math.round((isMuted ? 0 : volume) * 100)}%
                  </div>
                </div>
              )}
            </div>

            <button
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-700"
              title="More options"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
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
      `}</style>
    </div>
  );
};

export default AudioController;