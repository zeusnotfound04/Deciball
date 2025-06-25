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


const AudioController = () => {
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

  const [isDragging, setIsDragging] = useState(false);
  const [tempProgress, setTempProgress] = useState(0);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState(0); // 0: off, 1: all, 2: one

  // Format time display
  const formatTime = (seconds: any) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle progress bar drag
  const handleProgressMouseDown = (e: any) => {
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    setTempProgress(Math.max(0, Math.min(100, percent)));
  };

  const handleProgressMouseMove = (e : any) => {
    if (!isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    setTempProgress(Math.max(0, Math.min(100, percent)));
  };

  const handleProgressMouseUp = () => {
    if (isDragging) {
      const newTime = (tempProgress / 100) * duration;
      seek(newTime);
      setIsDragging(false);
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
          togglePlayPause();
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
  }, [togglePlayPause, playNext, playPrev, seek, progress, duration, volume, toggleMute, setVolume]);

  // Mouse event listeners for progress bar
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleProgressMouseMove);
      document.addEventListener('mouseup', handleProgressMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleProgressMouseMove);
        document.removeEventListener('mouseup', handleProgressMouseUp);
      };
    }
  }, [isDragging, tempProgress]);

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
              className="flex-1 bg-gray-600 rounded-full h-1 cursor-pointer relative group"
              onMouseDown={handleProgressMouseDown}
            >
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-1 rounded-full transition-all duration-200 relative"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity -mr-1.5" />
              </div>
            </div>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          {/* Song Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-lg overflow-hidden shadow-lg flex-shrink-0">
              {currentSong.image?.[0]?.url ? (
                <img 
                  src={currentSong.image[0].url} 
                  alt="Album art"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-lg">♪</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-white font-medium truncate text-sm">
                {currentSong.name}
              </div>
              <div className="text-gray-400 text-xs truncate">
                {currentSong.artistes?.primary?.[0]?.name || 'Unknown Artist'}
              </div>
            </div>
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
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={togglePlayPause}
              className="bg-white text-black p-3 rounded-full hover:scale-105 transition-transform shadow-lg"
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>

            <button
              onClick={playNext}
              className="p-2 text-gray-300 hover:text-white transition-colors rounded-full hover:bg-gray-700"
              title="Next (Ctrl + →)"
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