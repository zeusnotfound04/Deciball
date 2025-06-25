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

  // Actions
  setIsPlaying: (isPlaying: boolean) => void;
  setIsMuted: (isMuted: boolean) => void;
  setCurrentSong: (song: searchResults | null) => void;
  setProgress: (progress: number) => void;
  setVolume: (volume: number, save?: boolean) => void;
  setBackground: (background: boolean) => void;
}

export const useAudioStore = create<AudioState>()(
  devtools(
    persist(
      (set) => ({
        isPlaying: false,
        isMuted: false,
        currentSong: null,
        currentProgress: 0,
        currentDuration: 0,
        currentVolume: 1,
        background: true,

        // Actions
        setIsPlaying: (isPlaying) => set({ isPlaying }),
        setIsMuted: (isMuted) => set({ isMuted }),
        setCurrentSong: (currentSong) => set({ currentSong }),
        setProgress: (currentProgress) => set({ currentProgress }),
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
      }),
      {
        name: "audio-storage",
        partialize: (state) => ({ 
          currentVolume: state.currentVolume,
          background: state.background
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
    setIsPlaying,
    setCurrentSong,
    setProgress,
    setVolume
  } = useAudioStore();

  // Play function
  const play = async (song: searchResults) => {
    setCurrentSong(song);
    console.log("Playing Song:: " , song)
    if (audioRef.current) {
      // Clear existing sources
      if (backgroundVideoRef.current) {
        backgroundVideoRef.current.src = "";
      }
      if (videoRef.current) {
        videoRef.current.src = "";
      }
      audioRef.current.src = "";
      
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
        if (e.message.startsWith("Failed to load because no supported")) {
          skipCountRef.current += 1;
          if (skipCountRef.current >= 3) {
            toast.error(
              window.navigator.userAgent.includes("Electron")
                ? "Open youtube on browser and try again"
                : "Maximum skip limit reached. Download vibe desktop app.",
              { style: { background: "#e94625" } }
            );
          } else {
            emitMessage("songEnded", "songEnded");
            toast.error("Song not available on web. Skipping", {
              style: { background: "#e94625" },
            });
          }
        }
        console.error("Error playing audio", e.message);
      }
    }
  };

  // Pause function
  const pause = () => {
    audioRef.current?.pause();
    // Use the ws from useUserStore to send status
    // if (ws && ws.readyState === WebSocket.OPEN) {
    //   ws.send(JSON.stringify({ type: "status", data: false }));
    // }
    setIsPlaying(false);
  };

  const resume = () => {
    if (audioRef.current && currentSong) {
      audioRef.current.play()
        .then(() => {
          // Use the ws from useUserStore to send status
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "status", data: true }));
          }
          setIsPlaying(true);
        })
        .catch((error) => {
          console.error("Error resuming audio:", error);
        });
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      console.log("Stopping the current song!!!  ")
      pause();
    } else if (currentSong) {
      resume();
    }
  };

  const mute = () => {
    if (audioRef.current) {
      audioRef.current.muted = true;
      useAudioStore.setState({ isMuted: true });
    }
  };

 
  const unmute = () => {
    if (audioRef.current) {
      audioRef.current.muted = false;
      useAudioStore.setState({ isMuted: false });
    }
  };

  const seek = (value: number) => {
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
    emitMessage("playNext", "playNext");
  };

  
  const playPrev = () => {
    audioRef.current?.pause();
    emitMessage("playPrev", "playPrev");
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
        setIsPlaying(true);
        videoRef.current?.play();
        backgroundVideoRef.current?.play();
      };
      
      const handlePause = () => {
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
  }, [setMediaSession, emitMessage]);

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
    audioRef,
    videoRef,
    backgroundVideoRef,
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