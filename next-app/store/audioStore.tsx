"use client";

import { searchResults } from "@/types";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { useRef, useEffect } from "react";
import getURL from "@/lib/utils";
import { toast } from "sonner";
import { useUserStore } from "./userStore";

// Define the store state interface
interface AudioState {
  
  isPlaying: boolean;
  isMuted: boolean;
  currentSong: searchResults | null;
  currentProgress: number;
  currentDuration: number;
  currentVolume: number;
  background: boolean;
  youtubePlayer: any; // Add YouTube player to the store state

  // Actions
  setIsPlaying: (isPlaying: boolean) => void;
  setIsMuted: (isMuted: boolean) => void;
  setCurrentSong: (song: searchResults | null) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number, save?: boolean) => void;
  setBackground: (background: boolean) => void;
  setYoutubePlayer: (player: any) => void; // Add action to set YouTube player
}

export const useAudioStore = create<AudioState>()(
  devtools(
    persist(
      (set, get) => ({
        isPlaying: false,
        isMuted: false,
        currentSong: null,
        currentProgress: 0,
        currentDuration: 0,
        currentVolume: 1,
        background: true,
        youtubePlayer: null,

        // Actions
        setIsPlaying: (isPlaying) => set({ isPlaying }),
        setIsMuted: (isMuted) => set({ isMuted }),
        setCurrentSong: (currentSong) => set({ currentSong }),
        setProgress: (currentProgress) => set({ currentProgress }),
        setDuration: (currentDuration) => set({ currentDuration }),
        setVolume: (currentVolume, save) => {
          if (save) {
            localStorage.setItem("volume", String(currentVolume));
          }
          set({ currentVolume });
        },
        setBackground: (background) => {
          localStorage.setItem("background", JSON.stringify(background));
          set({ background });
        },
        setYoutubePlayer: (youtubePlayer) => {
          console.log("[AudioStore] Setting YouTube player in store:", !!youtubePlayer);
          set({ youtubePlayer });
        },
      }),
      {
        name: "audio-storage",
        partialize: (state) => ({ 
          currentVolume: state.currentVolume,
          background: state.background
          // Don't persist youtubePlayer
        }),
      }
    )
  )
);

// Create a hook for audio functionality
export function useAudio() {

  const audioRef = useRef<HTMLAudioElement>(
    typeof window !== "undefined" ? new Audio() : null
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const backgroundVideoRef = useRef<HTMLVideoElement>(null);
  const skipCountRef = useRef(0);
  const lastEmittedTimeRef = useRef(0);
  
  // Get user context
  const { user, isAdminOnline, ws, emitMessage } = useUserStore();
  
  // Get state and actions from the store
  const {
    isPlaying,
    isMuted,
    currentSong,
    currentProgress,
    currentDuration,
    currentVolume,
    youtubePlayer, // Get YouTube player from store
    setIsPlaying,
    setCurrentSong,
    setProgress,
    setDuration,
    setVolume,
    setYoutubePlayer: setYoutubePlayerInStore
  } = useAudioStore();

  // Play function
  const play = async (song: searchResults) => {
    setCurrentSong(song);
    console.log("Playing Song:: " , song)
    
    // Clear existing sources
    if (backgroundVideoRef.current) {
      backgroundVideoRef.current.src = "";
    }
    if (videoRef.current) {
      videoRef.current.src = "";
    }
    if (audioRef.current) {
      audioRef.current.src = "";
    }
    
    // If we have a YouTube player, use it for playback
    if (youtubePlayer && song.downloadUrl?.[0]?.url) {
      try {
        const videoId = song.downloadUrl[0].url;
        console.log("[Audio] Loading YouTube video with ID:", videoId);
        
        youtubePlayer.loadVideoById(videoId, 0);
        
        // Reset tracking on successful play
        lastEmittedTimeRef.current = 0;
        skipCountRef.current = 0;
        
        // Play videos if available
        videoRef.current?.play();
        backgroundVideoRef.current?.play();
        
        console.log("[Audio] YouTube playback initiated");
        // Don't set isPlaying here - let YouTube events handle it
        return;
      } catch (e: any) {
        console.error("Error playing YouTube video:", e);
      }
    }
    
    // Fallback to HTML Audio element if YouTube player not available
    if (audioRef.current) {
      const currentVideoUrl = `https://www.youtube.com/watch?v=${song.downloadUrl[0].url}`
      audioRef.current.src = currentVideoUrl;
      console.log("SOURCE:::" , audioRef.current.src)

      try {
        await audioRef.current.play();
        
        // Reset tracking on successful play
        if (
          audioRef.current &&
          Math.floor(audioRef.current?.currentTime) >=
            Math.floor(audioRef.current.duration * 0.3)
        ) {
          lastEmittedTimeRef.current = 0;
        }
        lastEmittedTimeRef.current = 0;
        skipCountRef.current = 0;
        
        // Play videos if available
        videoRef.current?.play();
        backgroundVideoRef.current?.play();
        
        setIsPlaying(true);
      } catch (e: any) {
        
        console.error("Error playing audio", e.message);
      }
    }
  };

  // Pause function
  const pause = () => {
    console.log("[Audio] pause() called");
    console.log("[Audio] YouTube player available:", !!youtubePlayer);
    console.log("[Audio] YouTube player object:", youtubePlayer);
    
    // Also pause YouTube player if it exists
    if (youtubePlayer) {
      try {
        console.log("[Audio] Calling YouTube pauseVideo()");
        youtubePlayer.pauseVideo();
        console.log("[Audio] YouTube player paused successfully");
        
        // Use the ws from useUserStore to send status
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "status", data: false }));
        }
        
        // Don't set isPlaying here - let YouTube events handle it
        return;
      } catch (error) {
        console.error("Error pausing YouTube player:", error);
      }
    }
    
    // Fallback to HTML audio element
    audioRef.current?.pause();
    
    // Pause other video elements
    videoRef.current?.pause();
    backgroundVideoRef.current?.pause();
    
    // Use the ws from useUserStore to send status
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "status", data: false }));
    }
    
    console.log("[Audio] Setting isPlaying to false (HTML audio fallback)");
    setIsPlaying(false);
  };

  const resume = () => {
    console.log("[Audio] resume() called");
    console.log("[Audio] Current song available:", !!currentSong);
    console.log("[Audio] YouTube player available:", !!youtubePlayer);
    
    if (currentSong) {
      // Try to resume YouTube player first
      if (youtubePlayer) {
        try {
          console.log("[Audio] Calling YouTube playVideo()");
          youtubePlayer.playVideo();
          console.log("[Audio] YouTube player resumed successfully");
          
          // Use the ws from useUserStore to send status
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "status", data: true }));
          }
          // Don't set isPlaying here - let YouTube events handle it
          return;
        } catch (error) {
          console.error("Error resuming YouTube player:", error);
        }
      }
      
      // Fallback to HTML audio element
      if (audioRef.current) {
        audioRef.current.play()
          .then(() => {
            // Use the ws from useUserStore to send status
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "status", data: true }));
            }
            console.log("[Audio] Setting isPlaying to true (HTML audio fallback)");
            setIsPlaying(true);
          })
          .catch((error) => {
            console.error("Error resuming audio:", error);
          });
      }
    }
  };

  const togglePlayPause = () => {
    console.log("[Audio] togglePlayPause called - isPlaying:", isPlaying);
    console.log("[Audio] YouTube player available:", !!youtubePlayer);
    
    // Check actual YouTube player state if available
    if (youtubePlayer) {
      try {
        const playerState = youtubePlayer.getPlayerState();
        console.log("[Audio] YouTube player actual state:", playerState);
        // 1 = playing, 2 = paused, -1 = unstarted, 0 = ended, 3 = buffering, 5 = cued
      } catch (error) {
        console.error("Error getting YouTube player state:", error);
      }
    }
    
    if (isPlaying) {
      console.log("[Audio] Pausing the current song!!!")
      pause();
    } else if (currentSong) {
      console.log("[Audio] Resuming the current song!!!")
      resume();
    } else {
      console.log("[Audio] No current song to play/pause")
    }
  };

  const mute = () => {
    // Mute YouTube player if available
    if (youtubePlayer) {
      try {
        youtubePlayer.mute();
        console.log("[Audio] YouTube player muted");
      } catch (error) {
        console.error("Error muting YouTube player:", error);
      }
    }
    
    // Also mute HTML audio element
    if (audioRef.current) {
      audioRef.current.muted = true;
    }
    
    useAudioStore.setState({ isMuted: true });
  };

 
  const unmute = () => {
    // Unmute YouTube player if available
    if (youtubePlayer) {
      try {
        youtubePlayer.unMute();
        console.log("[Audio] YouTube player unmuted");
      } catch (error) {
        console.error("Error unmuting YouTube player:", error);
      }
    }
    
    // Also unmute HTML audio element
    if (audioRef.current) {
      audioRef.current.muted = false;
    }
    
    useAudioStore.setState({ isMuted: false });
  };

  const seek = (value: number) => {
    // If we have a YouTube player, use it for seeking
    if (youtubePlayer) {
      try {
        const duration = youtubePlayer.getDuration();
        const seekTime = (value / 100) * duration;
        youtubePlayer.seekTo(seekTime, true);
        console.log("[Audio] YouTube player seeked to:", seekTime);
        return;
      } catch (error) {
        console.error("Error seeking YouTube player:", error);
      }
    }
    
    // Fallback to HTML audio element
    if (audioRef.current) {
      if (videoRef.current) {
        videoRef.current.currentTime = value;
      }
      if (backgroundVideoRef.current) {
        backgroundVideoRef.current.currentTime = value;
      }
      
      const currentTime = Math.floor(audioRef.current.currentTime);
      const skipToPosition = (value / 100) * Math.floor(audioRef.current.duration);
      const skipAmount = skipToPosition - currentTime;
      const skipped = Math.abs(currentTime - Math.floor(skipAmount));

      if (skipped > 0 && lastEmittedTimeRef.current !== Number.MAX_SAFE_INTEGER) {
        const skim = lastEmittedTimeRef.current - skipAmount;
        lastEmittedTimeRef.current = skim <= 0 ? 0 : skim;
      }

      audioRef.current.currentTime = value;
    }
  };


  const playNext = () => {
    audioRef.current?.pause();
    // Also pause YouTube player
    if (youtubePlayer) {
      try {
        youtubePlayer.pauseVideo();
      } catch (error) {
        console.error("Error pausing YouTube player for next:", error);
      }
    }
    emitMessage("playNext", "playNext");
  };

  
  const playPrev = () => {
    audioRef.current?.pause();
    // Also pause YouTube player
    if (youtubePlayer) {
      try {
        youtubePlayer.pauseVideo();
      } catch (error) {
        console.error("Error pausing YouTube player for prev:", error);
      }
    }
    emitMessage("playPrev", "playPrev");
  };

  // Function to set YouTube player reference
  const setYouTubePlayer = (player: any) => {
    console.log("[Audio] setYouTubePlayer called with player:", !!player);
    setYoutubePlayerInStore(player);
    
    // Set up basic progress tracking for YouTube player (without state interference)
    if (player) {
      // Clear any existing progress interval
      if ((player as any)._progressInterval) {
        clearInterval((player as any)._progressInterval);
      }
      
      // Set up progress tracking for YouTube player (only progress, not state)
      const updateProgress = () => {
        try {
          if (player.getCurrentTime && player.getDuration) {
            const currentTime = player.getCurrentTime();
            const duration = player.getDuration();
            
            if (duration > 0) {
              setProgress(currentTime);
              setDuration(duration);
            }
          }
        } catch (error) {
          console.error("Error updating YouTube progress:", error);
        }
      };
      
      // Update progress every second (but don't interfere with state)
      const progressInterval = setInterval(() => {
        updateProgress();
      }, 1000);
      
      // Store interval reference to clear it later if needed
      (player as any)._progressInterval = progressInterval;
    }
  };

  // Set media session metadata
  const setMediaSession = () => {
    const handleBlock = () => {
      return;
    };
    
    if ("mediaSession" in navigator && currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong?.name,
        artist: currentSong?.artistes.primary[0].name,
        artwork: currentSong?.image?.map((image : any) => ({
          sizes: image.quality,
          src: image.url,
        })),
      });
      
      navigator.mediaSession.setActionHandler("play", resume);
      navigator.mediaSession.setActionHandler("pause", pause);
      navigator.mediaSession.setActionHandler("previoustrack", playPrev);
      navigator.mediaSession.setActionHandler("nexttrack", playNext);
      navigator.mediaSession.setActionHandler("seekto", (e) => {
        if (e.seekTime && user?.role === "admin") {
          seek(e.seekTime);
          if (videoRef.current) {
            videoRef.current.currentTime = e.seekTime;
          }
          if (backgroundVideoRef.current) {
            backgroundVideoRef.current.currentTime = e.seekTime;
          }
        }
      });
      navigator.mediaSession.setActionHandler("seekbackward", handleBlock);
      navigator.mediaSession.setActionHandler("seekforward", handleBlock);
    }
  };


  useEffect(() => {
    if (!ws) return;
    
    const interval = setInterval(() => {
      if (!audioRef.current || audioRef.current.paused) return;
      
      // Emit progress for admin if WebSocket is connected
      if (isAdminOnline && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ 
          type: "progress", 
          data: audioRef.current.currentTime 
        }));
      }
      
      // Analytics tracking
      if (lastEmittedTimeRef.current === Number.MAX_SAFE_INTEGER) return;
      
      if (audioRef.current.duration && lastEmittedTimeRef.current >= Math.floor(audioRef.current.duration * 0.3)) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ 
            type: "analytics", 
            data: { type: "listening" } 
          }));
        }
        lastEmittedTimeRef.current = Number.MAX_SAFE_INTEGER;
        return;
      }
      
      if (currentVolume === 0) return;
      lastEmittedTimeRef.current += 3;
    }, 3000);
    
    return () => clearInterval(interval);
  }, [currentVolume, isAdminOnline, ws]);

  // Effect for audio element event listeners
  useEffect(() => {
    const audioElement = audioRef.current;

    if (audioElement) {
      const handlePlay = () => {
        // Only set isPlaying if we're not using YouTube player
        if (!youtubePlayer) {
          setIsPlaying(true);
        }
        videoRef.current?.play();
        backgroundVideoRef.current?.play();
      };
      
      const handlePause = () => {
        // Only set isPlaying if we're not using YouTube player
        if (!youtubePlayer) {
          setIsPlaying(false);
        }
        videoRef.current?.pause();
        backgroundVideoRef.current?.pause();
      };
      
      const handleCanPlay = () => {
        setMediaSession();
      };
      
      const handleEnd = () => {
        emitMessage("songEnded", "songEnded");
      };


      audioElement.addEventListener("play", handlePlay);
      audioElement.addEventListener("pause", handlePause);
      audioElement.addEventListener("ended", handleEnd);
      audioElement.addEventListener("canplay", handleCanPlay);

      return () => {
        audioElement.removeEventListener("play", handlePlay);
        audioElement.removeEventListener("pause", handlePause);
        audioElement.removeEventListener("ended", handleEnd);
        audioElement.removeEventListener("canplay", handleCanPlay);
      };
    }
  }, [setMediaSession, emitMessage, youtubePlayer]);

  // Effect for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space bar to toggle play/pause (not in input fields)
      if (
        e.key === " " &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        )
      ) {
        e.preventDefault();
        togglePlayPause();
      }
      
      // Next track
      if ((e.ctrlKey || e.altKey) && e.key === "ArrowRight") {
        e.preventDefault();
        playNext();
      } 
      // Previous track
      else if ((e.ctrlKey || e.altKey) && e.key === "ArrowLeft") {
        e.preventDefault();
        playPrev();
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [togglePlayPause, playNext, playPrev]);

  // Return the API
  return {
    play,
    pause,
    resume,
    togglePlayPause,
    mute,
    unmute,
    playPrev,
    playNext,
    seek,
    setVolume,
    setYouTubePlayer,
    audioRef,
    videoRef,
    backgroundVideoRef,
    youtubePlayer, // Return the YouTube player from store
    isPlaying,
    isMuted: isMuted,
    currentSong,
    volume: currentVolume,
    progress: currentProgress,
    duration: currentDuration,
    setProgress
  };
}


interface AudioProviderProps {
    children: React.ReactNode;
  }

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
    return <>{children}</>;
  };