import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart,
  MoreHorizontal
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
import VolumeBar from '@/components/VolumeBar';

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
  isAdmin = false
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
  const [isLiked, setIsLiked] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState(0);
  const [isSeeking, setIsLocalSeeking] = useState(false);

  const formatTime = (seconds: any) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressBarRef = useRef<HTMLDivElement>(null);

  const handleProgressMouseDown = (e: any) => {
    
    e.preventDefault();
    setIsDragging(true);
    
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
      
      const newTime = (tempProgress / 100) * duration;
      
      setIsLocalSeeking(true);
      setTimeout(() => setIsLocalSeeking(false), 3000);
      
      seek(newTime);
      setIsDragging(false);
    }
  };

  const handleProgressClick = (e: any) => {
    
    
    if (progressBarRef.current) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      const newTime = (percent / 100) * duration;
      
      setIsLocalSeeking(true);
      setTimeout(() => setIsLocalSeeking(false), 3000);
      
      seek(newTime);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      unmute();
    } else {
      mute();
    }
  };

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
          } else {
            const newTime = Math.max(0, progress - 10);
            seek(newTime);
          }
          break;
        case 'ArrowRight':
          if (e.ctrlKey) {
            e.preventDefault();
            playNext();
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
      <div className="bg-[#1C1E1F] border-t border-[#424244] p-4">
        <div className="text-center text-gray-500">No song playing</div>
      </div>
    );
  }

  const progressPercent = isDragging ? tempProgress : (progress / duration) * 100;

  return (
    <div className="bg-gradient-to-r from-[#1C1E1F] via-[#1C1E1F] to-[#1C1E1F] border-t border-[#424244] rounded-xl p-4 shadow-2xl">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <span>{formatTime(progress)}</span>
            <div 
              ref={progressBarRef}
              className={`flex-1 bg-gray-600 rounded-full h-1 relative group transition-all duration-200 ${
                isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
              } ${
                isSeeking ? 'ring-2 ring-gray-400 ring-opacity-50' : ''
              }`}
              onMouseDown={handleProgressMouseDown}
              onClick={handleProgressClick}
              title={
                isSeeking ? 'Seeking...' : 
                isAdmin ? 'Drag to seek (Admin only)' : 'Only admin can seek'
              }
            >
              <div 
                className={`bg-gradient-to-r from-gray-400 to-gray-500 h-1 rounded-full transition-all duration-200 relative ${
                  isDragging ? 'transition-none' : ''
                } ${
                  isSeeking ? 'animate-pulse' : ''
                }`}
                style={{ width: `${progressPercent}%` }}
              >
                <div className={`absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg transition-all duration-200 -mr-1.5 ${
                  isDragging || isSeeking || (isAdmin && progressPercent > 0) ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-100'
                } ${
                  isSeeking ? 'ring-2 ring-gray-400 ring-opacity-50' : ''
                }`} />
              </div>
            </div>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
         
            <button
              onClick={() => setIsLiked(!isLiked)}
              className={`p-1 rounded-full transition-colors ${
                isLiked ? 'text-red-500 hover:text-red-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-2 mx-6 justify-center">
          

            <button
              onClick={playPrev}
              className="p-2 text-gray-300 hover:text-white transition-colors rounded-full hover:bg-gray-700"
              title="Previous (Ctrl + ←)"
            >
              <div className="text-current">
                <PreviousIcon width={20} height={20} />
              </div>
            </button>

            <button
              onClick={() => {
                const newTime = Math.max(0, progress - 10);
                seek(newTime);
              }}
              className="p-1 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-700"
              title="Back 10 seconds"
            >
              <div className="text-">
                <BackTenSecondIcon width={16} height={16} />
              </div>
            </button>

            <button
              onClick={handleTogglePlayPause}
              className=" text-black p-1 rounded-full hover:scale-105 transition-transform shadow-lg flex items-center justify-center min-w-[56px] min-h-[56px]"
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
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
              onClick={() => {
                const newTime = Math.min(duration, progress + 10);
                seek(newTime);
              }}
              className="p-1 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-700"
              title="Forward 10 seconds"
            >
              <div className="text-current">
                <ForwardTenSecondIcon width={16} height={16} />
              </div>
            </button>

            <button
              onClick={playNext}
              className="p-2 text-gray-300 hover:text-white transition-colors rounded-full hover:bg-gray-700"
              title="Next (Ctrl + →)"
            >
              <div className="text-current">
                <NextIcon width={20} height={20} />
              </div>
            </button>

    
           
          </div>

          <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
            <div className="w-32 max-w-32 ">
              <VolumeBar
                defaultValue={volume * 100}
                startingValue={0}
                maxValue={100}
                className="w-full"
              />
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
      `}</style>
    </div>
  );
};

export default AudioController;