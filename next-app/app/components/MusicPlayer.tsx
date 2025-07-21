'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Music,
  Heart,
  MoreHorizontal
} from 'lucide-react';
import { cn } from "@/app/lib/utils";
import { useAudio } from '@/store/audioStore';

interface MusicPlayerProps {
  className?: string;
  compact?: boolean;
}

export default function MusicPlayer({ className = '', compact = false }: MusicPlayerProps) {
  const {
    isPlaying,
    isMuted,
    currentSong,
    volume,
    progress,
    duration,
    togglePlayPause,
    playNext,
    playPrev,
    mute,
    unmute,
    seek,
    setVolume,
    audioRef,
    setProgress
  } = useAudio();

  const [isDragging, setIsDragging] = useState(false);
  const [tempProgress, setTempProgress] = useState(0);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    const updateProgress = () => {
      if (!isDragging && audioElement.duration) {
        const progressPercent = (audioElement.currentTime / audioElement.duration) * 100;
        setProgress(progressPercent);
      }
    };

    audioElement.addEventListener('timeupdate', updateProgress);
    return () => audioElement.removeEventListener('timeupdate', updateProgress);
  }, [isDragging, setProgress]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !audioRef.current?.duration) return;

    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progressPercent = (clickX / rect.width) * 100;
    const newTime = (progressPercent / 100) * audioRef.current.duration;
    
    audioRef.current.currentTime = newTime;
    setProgress(progressPercent);
  };

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleProgressClick(e);
  };

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progressPercent = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    setTempProgress(progressPercent);
  };

  const handleProgressMouseUp = () => {
    if (isDragging && audioRef.current?.duration) {
      const newTime = (tempProgress / 100) * audioRef.current.duration;
      audioRef.current.currentTime = newTime;
      setProgress(tempProgress);
    }
    setIsDragging(false);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume, true);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      unmute();
    } else {
      mute();
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentTime = audioRef.current?.currentTime || 0;
  const totalDuration = audioRef.current?.duration || 0;
  const displayProgress = isDragging ? tempProgress : progress;

  if (!currentSong) {
    return (
      <div className={cn(
        "bg-zinc-900/95 border-t border-zinc-800 backdrop-blur-sm",
        compact ? "p-2" : "p-4",
        className
      )}>
        <div className="flex items-center justify-center text-zinc-500">
          <Music className="w-5 h-5 mr-2" />
          <span className="text-sm">No song selected</span>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn(
        "bg-zinc-900/95 border-t border-zinc-800 backdrop-blur-sm p-3",
        className
      )}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-zinc-800">
              {currentSong.image?.[0]?.url ? (
                <img
                  src={currentSong.image[0].url}
                  alt={currentSong.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-4 h-4 text-zinc-500" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-200 truncate">
                {currentSong.name}
              </p>
              <p className="text-xs text-zinc-400 truncate">
                {currentSong.artistes?.primary?.[0]?.name || 'Unknown Artist'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={playPrev}
              className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={togglePlayPause}
              className="p-2 rounded-full bg-zinc-100 hover:bg-white text-zinc-900 transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={playNext}
              className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-zinc-900/95 border-t border-zinc-800 backdrop-blur-sm",
      className
    )}>
      <div className="px-4 pt-2">
        <div
          ref={progressRef}
          className="relative h-1 bg-zinc-700 rounded-full cursor-pointer group"
          onClick={handleProgressClick}
          onMouseDown={handleProgressMouseDown}
          onMouseMove={handleProgressMouseMove}
          onMouseUp={handleProgressMouseUp}
          onMouseLeave={handleProgressMouseUp}
        >
          <div
            className="absolute left-0 top-0 h-full bg-zinc-200 rounded-full group-hover:bg-white transition-colors"
            style={{ width: `${displayProgress}%` }}
          />
          <div
            className="absolute w-3 h-3 bg-white rounded-full transform -translate-y-1 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${displayProgress}%`, transform: 'translateX(-50%) translateY(-25%)' }}
          />
        </div>
        <div className="flex justify-between text-xs text-zinc-400 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>

      <div className="px-4 pb-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800 shadow-lg">
              {currentSong.image?.[0]?.url ? (
                <img
                  src={currentSong.image[0].url}
                  alt={currentSong.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-6 h-6 text-zinc-500" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-zinc-200 truncate">
                {currentSong.name}
              </h3>
              <p className="text-sm text-zinc-400 truncate">
                {currentSong.artistes?.primary?.[0]?.name || 'Unknown Artist'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
                <Heart className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 mx-8">
            <button
              onClick={playPrev}
              className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              onClick={togglePlayPause}
              className="p-3 rounded-full bg-zinc-100 hover:bg-white text-zinc-900 transition-colors shadow-lg"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
            <button
              onClick={playNext}
              className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <div className="relative">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #f4f4f5 0%, #f4f4f5 ${(isMuted ? 0 : volume) * 100}%, #3f3f46 ${(isMuted ? 0 : volume) * 100}%, #3f3f46 100%)`
                }}
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
          background: #f4f4f5;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #f4f4f5;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}