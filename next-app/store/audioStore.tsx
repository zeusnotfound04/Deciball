"use client";

import React, { useState, useEffect, useRef, useContext } from "react";
import { searchResults } from "@/types";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import getURL from "@/lib/utils";
import { toast } from "sonner";
import { useUserStore } from "./userStore";
import { useSocket } from "@/context/socket-context";

interface Artist {
    external_urls : string[];
    href : string;
    id : string;
    name : string;
    type : string;
    uri : string
}
interface AudioState {
    isPlaying: boolean;
    isMuted: boolean;
    currentSong: searchResults | null;
    currentProgress: number;
    currentDuration: number;
    currentVolume: number;
    background: boolean;
    youtubePlayer: any;
    spotifyPlayer: any;
    isSpotifyReady: boolean;
    spotifyDeviceId: string | null;
    isSynchronized: boolean;
    lastSyncTimestamp: number;
    pendingSync: { timestamp: number; isPlaying: boolean; song?: searchResults } | null;
    currentSpaceId: string | null;
    isSeeking: boolean;

    setIsPlaying: (isPlaying: boolean) => void;
    setIsMuted: (isMuted: boolean) => void;
    setCurrentSong: (song: searchResults | null) => void;
    setProgress: (progress: number) => void;
    setDuration: (duration: number) => void;
    setVolume: (volume: number, save?: boolean) => void;
    setBackground: (background: boolean) => void;
    setYoutubePlayer: (player: any) => void;
    setSpotifyPlayer: (player: any) => void;
    setSpotifyReady: (ready: boolean) => void;
    setSpotifyDeviceId: (deviceId: string | null) => void;
    setSynchronized: (synchronized: boolean) => void;
    setLastSyncTimestamp: (timestamp: number) => void;
    setCurrentSpaceId: (spaceId: string | null) => void;
    
    syncPlaybackToTimestamp: (timestamp: number) => void;
    handleRoomSync: (currentTime: number, isPlaying: boolean, currentSong: any, isInitialSync: boolean) => void;
    handlePlaybackPause: () => void;
    handlePlaybackResume: () => void;
    handlePlaybackSeek: (seekTime: number) => void;
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
          spotifyPlayer: null,
          isSpotifyReady: false,
          spotifyDeviceId: null,
          isSynchronized: false,
          lastSyncTimestamp: 0,
          pendingSync: null,
          currentSpaceId: null,
          isSeeking: false,

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
            set({ youtubePlayer });
            
            const state = get();
            if (youtubePlayer && state.pendingSync) {
              const { timestamp, isPlaying, song } = state.pendingSync;
              
              if (song && (!state.currentSong || state.currentSong.id !== song.id)) {
                set({ currentSong: song });
              }
              
              state.syncPlaybackToTimestamp(timestamp);
              
              set({ isPlaying, pendingSync: null });
              
              if (isPlaying && youtubePlayer.playVideo) {
                youtubePlayer.playVideo();
              } else if (!isPlaying && youtubePlayer.pauseVideo) {
                youtubePlayer.pauseVideo();
              }
            }
          },
          setSpotifyPlayer: (spotifyPlayer) => {
            set({ spotifyPlayer });
          },
          setSpotifyReady: (isSpotifyReady) => set({ isSpotifyReady }),
          setSpotifyDeviceId: (spotifyDeviceId) => set({ spotifyDeviceId }),
          setSynchronized: (isSynchronized) => set({ isSynchronized }),
          setLastSyncTimestamp: (lastSyncTimestamp) => set({ lastSyncTimestamp }),
          setCurrentSpaceId: (currentSpaceId) => set({ currentSpaceId }),
          
          syncPlaybackToTimestamp: (timestamp) => {
            const state = get();
            
            if (state.isSeeking) {
              return;
            }
            
            if (state.youtubePlayer && state.youtubePlayer.seekTo && state.youtubePlayer.getCurrentTime) {
              try {
                const currentTime = state.youtubePlayer.getCurrentTime();
                const timeDiff = Math.abs(currentTime - timestamp);
                
                if (timeDiff > 3) {
                  state.youtubePlayer.seekTo(timestamp, true);
                  set({ currentProgress: timestamp, isSynchronized: true, lastSyncTimestamp: Date.now() });
                  
                  if (typeof window !== 'undefined') {
                    const event = new CustomEvent('show-sync-toast', {
                      detail: { message: `Synced to ${Math.floor(timestamp)}s (${Math.floor(timeDiff)}s correction)`, type: 'info' }
                    });
                    window.dispatchEvent(event);
                  }
                } else {
                  set({ currentProgress: timestamp, isSynchronized: true, lastSyncTimestamp: Date.now() });
                }
              } catch (error) {
                console.error("[AudioStore] Error syncing YouTube player:", error);
              }
            }
            
            if (state.spotifyPlayer && state.isSpotifyReady) {
              try {
                state.spotifyPlayer.seek(timestamp * 1000);
                set({ currentProgress: timestamp, isSynchronized: true, lastSyncTimestamp: Date.now() });
              } catch (error) {
                console.error("[AudioStore] Error syncing Spotify player:", error);
              }
            }
          },
          
          handleRoomSync: (currentTime, isPlaying, currentSong, isInitialSync = false) => {
            const state = get();

            if (isInitialSync) {
              if (currentSong) {
                set({
                  currentSong,
                  isPlaying: false,
                  currentProgress: 0,
                  isSynchronized: false,
                  lastSyncTimestamp: currentTime,
                  pendingSync: null,
                });

                if (state.youtubePlayer && state.youtubePlayer.cueVideoById && currentSong.downloadUrl?.[0]?.url) {
                  try {
                    const videoId = currentSong.downloadUrl[0].url;
                    state.youtubePlayer.cueVideoById(videoId, 0);
                  } catch (e) {
                    console.error("Error cueing video on initial sync:", e);
                  }
                }
              } else {
                console.log("[AudioStore] Initial sync with no current song, doing nothing.");
              }
              return;
            }

            if (!state.isSynchronized) {
              console.log("[AudioStore] Skipping room sync - user has not yet clicked play.");
              set({ lastSyncTimestamp: currentTime });
              return;
            }

            console.log("[AudioStore] Current seeking state:", state.isSeeking);
            
            if (currentSong && (!state.currentSong || state.currentSong.id !== currentSong.id)) {
              set({ currentSong });
            }
            
            if (state.isSeeking) {
              console.log("[AudioStore] Skipping room sync - currently seeking");
              return;
            }
            
            if (!state.youtubePlayer) {
              console.log("[AudioStore] YouTube player not ready, storing sync as pending");
              set({ 
                pendingSync: { 
                  timestamp: currentTime, 
                  isPlaying, 
                  song: currentSong || state.currentSong || undefined 
                } 
              });
              return;
            }
            
            set({ pendingSync: null });
            
            state.syncPlaybackToTimestamp(currentTime);
            
            if (isPlaying !== state.isPlaying) {
              set({ isPlaying });
              
              if (isPlaying) {
                if (state.youtubePlayer && state.youtubePlayer.playVideo) {
                  state.youtubePlayer.playVideo();
                }
                if (state.spotifyPlayer && state.isSpotifyReady) {
                  state.spotifyPlayer.resume();
                }
              } else {
                if (state.youtubePlayer && state.youtubePlayer.pauseVideo) {
                  state.youtubePlayer.pauseVideo();
                }
                if (state.spotifyPlayer && state.isSpotifyReady) {
                  state.spotifyPlayer.pause();
                }
              }
            }
          },
          
          handlePlaybackPause: () => {
            const state = get();
            console.log("[AudioStore] Handling playback pause");
            
            set({ isPlaying: false });
            
            if (state.youtubePlayer && state.youtubePlayer.pauseVideo) {
              state.youtubePlayer.pauseVideo();
            }
            if (state.spotifyPlayer && state.isSpotifyReady) {
              state.spotifyPlayer.pause();
            }
          },
          
          handlePlaybackResume: () => {
            const state = get();
            console.log("[AudioStore] Handling playback resume");
            
            set({ isPlaying: true });
            
            if (state.youtubePlayer && state.youtubePlayer.playVideo) {
              state.youtubePlayer.playVideo();
            }
            if (state.spotifyPlayer && state.isSpotifyReady) {
              state.spotifyPlayer.resume();
            }
          },
          
          handlePlaybackSeek: (seekTime) => {
            const state = get();
            console.log("[AudioStore] Handling playback seek to:", seekTime);
            
            set({ isSeeking: true });
            
            if (state.youtubePlayer && state.youtubePlayer.seekTo) {
              try {
                console.log("[AudioStore] Applying seek to YouTube player");
                state.youtubePlayer.seekTo(seekTime, true);
                set({ currentProgress: seekTime });
              } catch (error) {
                console.error("[AudioStore] Error seeking YouTube player:", error);
              }
            }
            
            if (state.spotifyPlayer && state.isSpotifyReady) {
              try {
                console.log("[AudioStore] Applying seek to Spotify player");
                state.spotifyPlayer.seek(seekTime * 1000);
                set({ currentProgress: seekTime });
              } catch (error) {
                console.error("[AudioStore] Error seeking Spotify player:", error);
              }
            }
            
            setTimeout(() => {
              console.log("[AudioStore] Seek operation completed, resuming normal sync");
              set({ isSeeking: false });
            }, 2500);
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

  export function useAudio() {
  const audioRef = useRef<HTMLAudioElement>(
    typeof window !== "undefined" ? new Audio() : null
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const backgroundVideoRef = useRef<HTMLVideoElement>(null);
  const skipCountRef = useRef(0);
  const lastEmittedTimeRef = useRef(0);
    
  const { user, isAdminOnline } = useUserStore();
    
  const { socket: wsFromContext, sendMessage: sendMessageFromContext } = useSocket();
    
  const ws = wsFromContext || useUserStore.getState().ws;
    const emitMessage = sendMessageFromContext || useUserStore.getState().emitMessage;
    
    const {
      isPlaying,
      isMuted,
      currentSong,
      currentProgress,
      currentDuration,
      currentVolume,
      youtubePlayer,
      spotifyPlayer,
      isSpotifyReady,
      spotifyDeviceId,
      isSynchronized,
      lastSyncTimestamp,
      currentSpaceId,
      setIsPlaying,
      setCurrentSong,
      setProgress,
      setDuration,
      setVolume: setVolumeInStore,
      setYoutubePlayer: setYoutubePlayerInStore,
      setSpotifyPlayer: setSpotifyPlayerInStore,
      setSpotifyReady,
      setSpotifyDeviceId,
      setSynchronized,
      setLastSyncTimestamp,
      setCurrentSpaceId,
      syncPlaybackToTimestamp,
      handleRoomSync,
      handlePlaybackPause,
      handlePlaybackResume,
      handlePlaybackSeek
    } = useAudioStore();

    const play = async (song: searchResults) => {
      setCurrentSong(song);
      setIsPlaying(false);
      
      if (backgroundVideoRef.current) {
        backgroundVideoRef.current.src = "";
      }
      if (videoRef.current) {
        videoRef.current.src = "";
      }
      if (audioRef.current) {
        audioRef.current.src = "";
      }
      
      const isSpotifyTrack = song.downloadUrl?.[0]?.url?.includes('spotify:track:') || 
                            song.url?.includes('open.spotify.com/track/');
      
      if (isSpotifyTrack && spotifyPlayer && isSpotifyReady) {
        return;
      }
      
      if (youtubePlayer && song.downloadUrl?.[0]?.url && !isSpotifyTrack) {
        try {
          const videoId = song.downloadUrl[0].url;
          
          youtubePlayer.cueVideoById(videoId, 0);

          setIsPlaying(false);
          
          setProgress(0);
          setDuration(0);

          lastEmittedTimeRef.current = 0;
          skipCountRef.current = 0;
          
          console.log("[Audio] YouTube video cued and player state is paused.");
          return;
        } catch (e: any) {
          console.error("Error cueing YouTube video:", e);
          setIsPlaying(false);
        }
      }

    };

    const pause = () => {
      console.log("[Audio] pause() called");
      const { youtubePlayer, spotifyPlayer, isSpotifyReady, currentSpaceId } = useAudioStore.getState();

      setIsPlaying(false);

      if (youtubePlayer) {
        try {
          console.log("[Audio] Calling YouTube pauseVideo()");
          youtubePlayer.pauseVideo();

          if (currentSpaceId && user?.id && emitMessage) {
            console.log("[Audio] Sending pause message to server via emitMessage");
            if (sendMessageFromContext) {
              sendMessageFromContext("pause", {
                spaceId: currentSpaceId,
                userId: user.id,
              });
            } else {
              emitMessage("pause", {
                spaceId: currentSpaceId,
                userId: user.id,
              });
            }
          } else {
            console.warn("[Audio] Cannot send pause message - missing data:", {
              spaceId: currentSpaceId,
              userId: user?.id,
              emitMessage: !!emitMessage
            });
          }
          return;
        } catch (error) {
          console.error("Error pausing YouTube player:", error);
        }
      }

      if (spotifyPlayer && isSpotifyReady) {
        try {
          console.log("[Audio] Calling Spotify pause()");
          spotifyPlayer.pause();
          console.log("[Audio] Spotify player paused successfully");
          
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ 
              type: "spotify-pause", 
              data: { timestamp: Date.now() } 
            }));
          }
          return;
        } catch (error) {
          console.error("Error pausing Spotify player:", error);
        }
      }

      audioRef.current?.pause();
    };

    const resume = () => {
      console.log("[Audio] resume() called");
      const { isSynchronized, currentSong, youtubePlayer, spotifyPlayer, isSpotifyReady, syncPlaybackToTimestamp, lastSyncTimestamp, currentSpaceId } = useAudioStore.getState();

      if (!isSynchronized) {
        console.log("[Audio] Not synchronized. Syncing to room state before resuming.");
        syncPlaybackToTimestamp(lastSyncTimestamp);
        setSynchronized(true);
      }

      setIsPlaying(true);

      if (currentSong) {
        const isSpotifyTrack = currentSong.downloadUrl?.[0]?.url?.includes('spotify:track:') || currentSong.url?.includes('open.spotify.com/track/');

        if (!isSpotifyTrack && youtubePlayer) {
          try {
            console.log("[Audio] Calling YouTube playVideo()");
            youtubePlayer.playVideo();

            if (currentSpaceId && user?.id && emitMessage) {
              console.log("[Audio] Sending play message to server via emitMessage");
              if (sendMessageFromContext) {
                  sendMessageFromContext("play", {
                  spaceId: currentSpaceId,
                  userId: user.id,
                });
              } else {
                  emitMessage("play", {
                  spaceId: currentSpaceId,
                  userId: user.id,
                });
              }
            } else {
              console.warn("[Audio] Cannot send play message - missing data:", {
                spaceId: currentSpaceId,
                userId: user?.id,
                emitMessage: !!emitMessage
              });
            }
            return;
          } catch (error) {
            console.error("Error resuming YouTube player:", error);
          }
        }

        if (isSpotifyTrack && spotifyPlayer && isSpotifyReady) {
          try {
            console.log("[Audio] Calling Spotify resume()");
            spotifyPlayer.resume();
            console.log("[Audio] Spotify player resumed successfully");
            
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ 
                type: "spotify-resume", 
                data: { timestamp: Date.now() } 
              }));
            }
            return;
          } catch (error) {
            console.error("Error resuming Spotify player:", error);
          }
        }

        if (audioRef.current) {
          audioRef.current.play().then(() => {
            console.log("[Audio] HTML audio resumed successfully");
          }).catch((error) => {
            console.error("Error resuming audio:", error);
          });
        }
      }
    };

    const togglePlayPause = () => {
      console.log("[Audio] togglePlayPause called - isPlaying:", isPlaying);
      const { isSynchronized } = useAudioStore.getState();

      if (!isSynchronized) {
        console.log("[Audio] First play click for this user. Triggering sync.");
        resume();
        return;
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
      if (youtubePlayer) {
        try {
          youtubePlayer.mute();
          console.log("[Audio] YouTube player muted");
        } catch (error) {
          console.error("Error muting YouTube player:", error);
        }
      }
      
      if (audioRef.current) {
        audioRef.current.muted = true;
      }
      
      useAudioStore.setState({ isMuted: true });
    };

  
    const unmute = () => {
      if (youtubePlayer) {
        try {
          youtubePlayer.unMute();
          console.log("[Audio] YouTube player unmuted");
        } catch (error) {
          console.error("Error unmuting YouTube player:", error);
        }
      }
      
      if (audioRef.current) {
        audioRef.current.muted = false;
      }
      
      useAudioStore.setState({ isMuted: false });
    };

    const seek = (value: number) => {
      console.log("[Audio] ====================== SEEK FUNCTION CALLED ======================");
      console.log("[Audio] Seek value (in seconds):", value);
      console.log("[Audio] Current song:", currentSong?.name);
      console.log("[Audio] YouTube player available:", !!youtubePlayer);
      console.log("[Audio] Current spaceId:", currentSpaceId);
      console.log("[Audio] WebSocket ready:", ws?.readyState === WebSocket.OPEN);
      console.log("[Audio] emitMessage function available:", !!emitMessage);
      
      if (youtubePlayer) {
        try {
          const duration = youtubePlayer.getDuration();
          const seekTime = value;
          console.log("[Audio] YouTube seek - Duration:", duration, "SeekTime:", seekTime);
          
          youtubePlayer.seekTo(seekTime, true);
          
          const currentState = useAudioStore.getState();
          const currentSpaceId = currentState.currentSpaceId;
          
          if (currentSpaceId && emitMessage) {
            const seekData = { 
              spaceId: currentSpaceId,
              seekTime: seekTime,
              timestamp: Date.now() 
            };
            console.log("[Audio] Sending seek message to server via emitMessage:", seekData);
            try {
                if (sendMessageFromContext) {
                  sendMessageFromContext("seek-playback", seekData);
              } else {
                  emitMessage("seek-playback", seekData);
              }
              console.log("[Audio] Seek message sent successfully via emitMessage");
            } catch (error) {
              console.error("[Audio] Error sending seek message via emitMessage:", error);
            }
          } else {
            console.warn("[Audio] Cannot send seek message - no spaceId or emitMessage function:", {
              spaceId: currentSpaceId,
              emitMessageAvailable: !!emitMessage
            });
          }
          
          console.log("[Audio] YouTube player seeked to:", seekTime);
          return;
        } catch (error) {
          console.error("Error seeking YouTube player:", error);
        }
      }
      
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
        
        const currentState = useAudioStore.getState();
        const currentSpaceId = currentState.currentSpaceId;
        
        if (ws && ws.readyState === WebSocket.OPEN && currentSpaceId) {
          const seekMessage = {
            type: "seek-playback", 
            data: { 
              spaceId: currentSpaceId,
              seekTime: value,
              timestamp: Date.now() 
            } 
          };
          console.log("[Audio] Sending HTML audio seek message to server:", seekMessage);
          ws.send(JSON.stringify(seekMessage));
        } else {
          console.warn("[Audio] Cannot send HTML audio seek message - WebSocket not ready or no spaceId:", {
            wsReady: ws?.readyState === WebSocket.OPEN,
            spaceId: currentSpaceId
          });
        }
      }
    };


    const playNext = () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      if (youtubePlayer) {
        try {
          youtubePlayer.pauseVideo();
        } catch (error) {
          console.error("Error pausing YouTube player for next:", error);
        }
      }
      
      if (!ws) {
        console.error("WebSocket is null/undefined!");
        return;
      }
      
      if (ws.readyState !== WebSocket.OPEN) {
        console.error("WebSocket is not open! State:", ws.readyState);
        return;
      }
      
      try {
        if (!currentSpaceId) {
          console.error("[PlayNext] CRITICAL: No spaceId available!");
          return;
        }
        
        if (!user?.id) {
          console.error("[PlayNext] CRITICAL: No userId available!");
          return;
        }

        console.log("[PlayNext] Sending play-next message with spaceId:", currentSpaceId, "userId:", user.id);

        if (sendMessageFromContext) {
          sendMessageFromContext("play-next", { 
            spaceId: currentSpaceId, 
            userId: user.id 
          });
        } else {
          emitMessage("play-next", { 
            spaceId: currentSpaceId, 
            userId: user.id 
          });
        }
        console.log("[PlayNext] play-next message sent successfully");
      } catch (error) {
        console.error("[PlayNext] Error sending play-next message:", error);
      }
      
      console.log("[PlayNext] ====================== playNext() COMPLETED ======================");
    };

    const setVolume = (volume: number, save?: boolean) => {
      console.log("[Audio] setVolume called with volume:", volume);
      
      // Update the Zustand store
      setVolumeInStore(volume, save);
      
      // Apply volume to YouTube player
      if (youtubePlayer) {
        try {
          const youtubeVolume = Math.round(volume * 100);
          youtubePlayer.setVolume(youtubeVolume);
          console.log("[Audio] YouTube player volume set to:", youtubeVolume);
        } catch (error) {
          console.error("Error setting YouTube player volume:", error);
        }
      }
      
      // Apply volume to audio element
      if (audioRef.current) {
        audioRef.current.volume = volume;
        console.log("[Audio] Audio element volume set to:", volume);
      }
      
      // Apply volume to Spotify player if available
      if (spotifyPlayer && isSpotifyReady) {
        try {
          const spotifyVolume = Math.round(volume * 100);
          spotifyPlayer.setVolume(spotifyVolume);
          console.log("[Audio] Spotify player volume set to:", spotifyVolume);
        } catch (error) {
          console.error("Error setting Spotify player volume:", error);
        }
      }
    };

    
    const playPrev = () => {
      console.log("[PlayPrev] playPrev called - not implemented yet");
      console.log("[PlayPrev] Note: Previous song functionality requires backend implementation");
      
      audioRef.current?.pause();
      if (youtubePlayer) {
        try {
          youtubePlayer.pauseVideo();
        } catch (error) {
          console.error("Error pausing YouTube player for prev:", error);
        }
      }
      
      console.log("[PlayPrev] Previous song functionality not yet implemented");
    };

    const setYouTubePlayer = (player: any) => {
      console.log("[Audio] setYouTubePlayer called with player:", !!player);
      setYoutubePlayerInStore(player);
      
      if (player) {
        if ((player as any)._progressInterval) {
          clearInterval((player as any)._progressInterval);
        }
        
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
        
        const progressInterval = setInterval(() => {
          updateProgress();
        }, 1000);
        
        (player as any)._progressInterval = progressInterval;
        
        const state = useAudioStore.getState();
        if (state.pendingSync) {
          console.log("[Audio] YouTube player now ready, applying pending sync:", state.pendingSync);
          setTimeout(() => {
            try {
              if (player.seekTo) {
                player.seekTo(state.pendingSync!.timestamp, true);
                if (state.pendingSync!.isPlaying) {
                  player.playVideo();
                } else {
                  player.pauseVideo();
                }
                const { handleRoomSync } = useAudioStore.getState();
                handleRoomSync(state.pendingSync!.timestamp, state.pendingSync!.isPlaying, state.pendingSync!.song || state.currentSong, true);
              }
            } catch (error) {
              console.error("[Audio] Error applying pending sync:", error);
            }
          }, 500);
        }
      }
    };

    const setupSpotifyPlayer = (player: any) => {
      console.log("[Audio] setupSpotifyPlayer called with player:", !!player);
      setSpotifyPlayerInStore(player);
      
      if (player) {
        player.addListener('ready', ({ device_id }: { device_id: string }) => {
          console.log('Spotify Ready with Device ID', device_id);
          setSpotifyDeviceId(device_id);
          setSpotifyReady(true);
        });

        player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
          console.log('Spotify Device ID has gone offline', device_id);
          setSpotifyReady(false);
        });

        player.addListener('player_state_changed', (state: any) => {
          if (!state) return;
          
          console.log('Spotify player state changed:', state);
          setIsPlaying(!state.paused);
          setProgress((state.position / state.duration) * 100);
          setDuration(state.duration / 1000);
          
          setLastSyncTimestamp(Date.now());
          
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: "spotify-state-change",
              data: {
                isPlaying: !state.paused,
                position: state.position,
                timestamp: Date.now(),
                trackUri: state.track_window.current_track?.uri
              }
            }));
          }
        });

        player.connect();
      }
    };

    const handleSyncCommand = (data: any) => {
      console.log("[Audio] Received sync command:", data);
      
      switch (data.type) {
        case "spotify-sync-play":
          if (spotifyPlayer && isSpotifyReady) {
            const timeDiff = Date.now() - data.timestamp;
            const syncedPosition = data.position + timeDiff;
            
            fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${syncedPosition}&device_id=${spotifyDeviceId}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${user?.spotifyAccessToken}`
              }
            }).then(() => {
              return fetch(`https://api.spotify.com/v1/me/player/play?device_id=${spotifyDeviceId}`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${user?.spotifyAccessToken}`
                }
              });
            });
          }
          break;
          
        case "spotify-sync-pause":
          if (spotifyPlayer && isSpotifyReady) {
            fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${spotifyDeviceId}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${user?.spotifyAccessToken}`
              }
            });
          }
          break;
          
        case "spotify-sync-seek":
          if (spotifyPlayer && isSpotifyReady) {
            fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${data.position}&device_id=${spotifyDeviceId}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${user?.spotifyAccessToken}`
              }
            });
          }
          break;
          
        case "youtube-sync-play":
          if (youtubePlayer) {
            const timeDiff = (Date.now() - data.timestamp) / 1000;
            const syncedPosition = data.position + timeDiff;
            youtubePlayer.seekTo(syncedPosition, true);
            youtubePlayer.playVideo();
          }
          break;
          
        case "youtube-sync-pause":
          if (youtubePlayer) {
            youtubePlayer.pauseVideo();
          }
          break;
      }
    };

    const addToQueue = (song: searchResults) => {
      console.log("Adding song to queue:", song);
      const artistName = song.artistes?.primary?.[0]?.name || 'Unknown Artist';
      console.log("Adding song to queue:Artist name:", artistName);
      
      if (ws && ws.readyState === WebSocket.OPEN) {
        let extractedUrl = song.downloadUrl?.[0]?.url || song.url || '';
        
        if (extractedUrl.includes('youtube.com') || extractedUrl.includes('youtu.be')) {
          const videoIdMatch = extractedUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
          if (videoIdMatch) {
            extractedUrl = videoIdMatch[1];
          }
        }
        
        const message = {
          type: "add-to-queue",
          data: {
            url: extractedUrl,
            title: song.name,
            artist: song.artistes?.primary?.[0]?.name || 'Unknown Artist',
            image: song.image?.[0]?.url || '',
            source: song.source === 'youtube' || extractedUrl.length === 11 ? 'Youtube' : 'Spotify',
            spotifyId: song.url?.includes('spotify.com') ? song.id : undefined,
            youtubeId: extractedUrl.length === 11 ? extractedUrl : undefined
          }
        };
        
        console.log("Sending add-to-queue message:", message);
        ws.send(JSON.stringify(message));
      } else {
        console.error("WebSocket not available for adding to queue");
      }
    };

    const voteOnSong = (streamId: string, vote: "upvote" | "downvote") => {
      console.log("[Audio] ====================== VOTE ON SONG CALLED ======================");
      console.log("[Audio] StreamId:", streamId);
      console.log("[Audio] Vote:", vote);
      console.log("[Audio] SocketContext WebSocket available:", !!wsFromContext);
      console.log("[Audio] SocketContext sendMessage available:", !!sendMessageFromContext);
      console.log("[Audio] Current spaceId:", currentSpaceId);
      console.log("[Audio] User info from userStore:", { 
        userId: user?.id, 
        hasToken: !!user?.token,
        tokenLength: user?.token?.length 
      });
      
      const currentState = useAudioStore.getState();
      const spaceId = currentState.currentSpaceId;
      
      if (!spaceId) {
        console.error("[Audio] No spaceId available for voting");
        return;
      }
      
      if (sendMessageFromContext) {
        console.log("[Audio] Sending vote via SocketContext");
        console.log("[Audio] Vote data being sent:", {
          streamId,
          vote,
          spaceId
        });
        try {
          const success = sendMessageFromContext("cast-vote", {
            streamId,
            vote,
            spaceId
          });
          console.log("[Audio] Vote message sent via SocketContext, success:", success);
        } catch (error) {
          console.error("[Audio] Error sending vote via SocketContext:", error);
        }
      } else if (ws && ws.readyState === WebSocket.OPEN) {
        console.log("[Audio] Sending vote via fallback WebSocket");
        console.log("[Audio] Vote data being sent:", {
          streamId,
          vote,
          spaceId
        });
        try {
          ws.send(JSON.stringify({
            type: "cast-vote",
            data: {
              streamId,
              vote,
              spaceId
            }
          }));
          console.log("[Audio] Vote message sent successfully via fallback WebSocket");
        } catch (error) {
          console.error("[Audio] Error sending vote via fallback WebSocket:", error);
        }
      } else {
        console.error("[Audio] No WebSocket connection available for voting");
        console.error("[Audio] Debug info:", {
          socketContextAvailable: !!sendMessageFromContext,
          fallbackWsAvailable: !!ws,
          fallbackWsReady: ws?.readyState === WebSocket.OPEN,
          spaceId: spaceId
        });
      }
      
      console.log("[Audio] ====================== VOTE ON SONG COMPLETED ======================");
    };
    
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
        
        if (isAdminOnline && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ 
            type: "progress", 
            data: audioRef.current.currentTime 
          }));
        }
        
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

    useEffect(() => {
      const audioElement = audioRef.current;

      if (audioElement) {
        const handlePlay = () => {
          if (!youtubePlayer) {
            setIsPlaying(true);
          }
          videoRef.current?.play();
          backgroundVideoRef.current?.play();
        };
        
        const handlePause = () => {
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
          if (!youtubePlayer) {
          const customSongEndedCallback = (window as any).__songEndedCallback;
          if (customSongEndedCallback) {
            customSongEndedCallback();
          } else {
            if (sendMessageFromContext) {
              sendMessageFromContext("songEnded", { action: "songEnded" });
            } else {
              emitMessage("songEnded", { action: "songEnded" });
            }
          }
          }
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

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
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
        
        if ((e.ctrlKey || e.altKey) && e.key === "ArrowRight") {
          e.preventDefault();
          playNext();
        } 
        else if ((e.ctrlKey || e.altKey) && e.key === "ArrowLeft") {
          e.preventDefault();
          playPrev();
        }
      };
      
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [togglePlayPause, playNext, playPrev]);

    useEffect(() => {
      const handleRoomSyncEvent = (event: CustomEvent) => {
        console.log("Room sync event received:", event.detail);
        handleRoomSync(
          event.detail.currentTime,
          event.detail.isPlaying,
          event.detail.currentSong,
          event.detail.isInitialSync || false
        );
      };

      const handlePlaybackPausedEvent = (event: CustomEvent) => {
        console.log("Playback paused event received:", event.detail);
        handlePlaybackPause();
      };

      const handlePlaybackResumedEvent = (event: CustomEvent) => {
        console.log("Playback resumed event received:", event.detail);
        handlePlaybackResume();
      };

      const handlePlaybackSeekedEvent = (event: CustomEvent) => {
        console.log("Playback seeked event received:", event.detail);
        handlePlaybackSeek(event.detail.seekTime);
      };

      const handlePlaybackStateUpdateEvent = (event: CustomEvent) => {
        console.log("Playback state update event received:", event.detail);
      };

      const handleCurrentSongUpdateEvent = (event: CustomEvent) => {
        console.log("[AudioStore] ====================== CURRENT SONG UPDATE EVENT ======================");
        console.log("[AudioStore] Current song update event received:", event.detail);
        const songData = event.detail.song;
        console.log("[AudioStore] Raw song data:", songData);
        const artistes : string[] = songData.artists.map((artist: Artist) => artist.name);
        console.log("Artistes" , artistes)
        
        if (songData) {

          
          const formattedSong: any = {
            id: songData.id,
            name: songData.title || songData.name,
            artistes : artistes,
            image: [
              { quality: 'high', url: songData.bigImg || songData.smallImg || '' },
              { quality: 'medium', url: songData.smallImg || songData.bigImg || '' }
            ],
            downloadUrl: [{
              quality: 'auto',
              url: songData.extractedId || songData.youtubeId || songData.url || ''
            }],
            url: songData.url || '',
            addedBy: songData.addedByUser?.username || 'Unknown',
            voteCount: songData.voteCount || 0,
            isVoted: false,
            source: songData.source === 'Youtube' ? 'youtube' : undefined
          };
          
          console.log("[AudioStore] Formatted song for audio store:", formattedSong);

          console.log("[AudioStore] Setting current song in store...");
          setCurrentSong(formattedSong);
          console.log("� [AudioStore] Starting playback of current song update:", formattedSong.name);
          
          try {
            play(formattedSong);
            console.log("[AudioStore] Successfully called play() function");
          } catch (error) {
            console.error("[AudioStore] Error calling play() function:", error);
          }
        } else {
          console.error("[AudioStore] No song data in current song update event");
        }
        
        console.log("[AudioStore] ====================== CURRENT SONG UPDATE EVENT COMPLETED ======================");
      };

      window.addEventListener('room-sync-playback', handleRoomSyncEvent as EventListener);
      window.addEventListener('playback-paused', handlePlaybackPausedEvent as EventListener);
      window.addEventListener('playback-resumed', handlePlaybackResumedEvent as EventListener);
      window.addEventListener('playback-seeked', handlePlaybackSeekedEvent as EventListener);
      window.addEventListener('playback-state-update', handlePlaybackStateUpdateEvent as EventListener);
      window.addEventListener('current-song-update', handleCurrentSongUpdateEvent as EventListener);

      return () => {
        window.removeEventListener('room-sync-playback', handleRoomSyncEvent as EventListener);
        window.removeEventListener('playback-paused', handlePlaybackPausedEvent as EventListener);
        window.removeEventListener('playback-resumed', handlePlaybackResumedEvent as EventListener);
        window.removeEventListener('playback-seeked', handlePlaybackSeekedEvent as EventListener);
        window.removeEventListener('playback-state-update', handlePlaybackStateUpdateEvent as EventListener);
        window.removeEventListener('current-song-update', handleCurrentSongUpdateEvent as EventListener);
      };
    }, [handleRoomSync, handlePlaybackPause, handlePlaybackResume, handlePlaybackSeek]);

    useEffect(() => {
      if (!ws) return;

      const handleWebSocketMessage = (event: MessageEvent) => {
        try {
          const { type, data } = JSON.parse(event.data);
          
          switch (type) {
            case 'current-song-update':
              console.log("[WebSocket] Received current-song-update message:", data);
              console.log("[WebSocket] Song data:", data.song);
              
              window.dispatchEvent(new CustomEvent('current-song-update', {
                detail: data
              }));
              break;
              
            case 'playback-sync':
              console.log("Received playback sync message:", data);
              
              const timeDiff = (Date.now() - data.timestamp) / 1000;
              const expectedCurrentTime = data.currentTime + (data.isPlaying ? timeDiff : 0);
              
              window.dispatchEvent(new CustomEvent('room-sync-playback', {
                detail: {
                  currentTime: expectedCurrentTime,
                  isPlaying: data.isPlaying,
                  platform: data.platform,
                  videoId: data.videoId,
                  trackUri: data.trackUri,
                  isSync: data.isSync || false
                }
              }));
              break;
              
            case 'playback-pause':
              console.log("Received playback pause message:", data);
              window.dispatchEvent(new CustomEvent('playback-paused', {
                detail: { timestamp: data.timestamp, controlledBy: data.controlledBy }
              }));
              break;
              
            case 'playback-resume':
              console.log("Received playback resume message:", data);
              window.dispatchEvent(new CustomEvent('playback-resumed', {
                detail: { timestamp: data.timestamp, controlledBy: data.controlledBy }
              }));
              break;
              
            case 'playback-seek':
              console.log("Received playback seek message:", data);
              window.dispatchEvent(new CustomEvent('playback-seeked', {
                detail: { seekTime: data.seekTime, timestamp: data.timestamp, controlledBy: data.controlledBy }
              }));
              break;
              
            default:
              break;
          }
        } catch (error) {
          console.error("Error parsing WebSocket sync message:", error);
        }
      };

      ws.addEventListener('message', handleWebSocketMessage);

      return () => {
        ws.removeEventListener('message', handleWebSocketMessage);
      };
    }, [ws]);

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
      setupSpotifyPlayer,
      handleSyncCommand,
      addToQueue,
      voteOnSong,
      audioRef,
      videoRef,
      backgroundVideoRef,
      youtubePlayer,
      spotifyPlayer,
      isSpotifyReady,
      spotifyDeviceId,
      isSynchronized,
      isPlaying,
      isMuted: isMuted,
      currentSong,
      volume: currentVolume,
      progress: currentProgress,
      duration: currentDuration,
      setProgress,
      setCurrentSpaceId
    };
  }


interface AudioProviderProps {
  children: React.ReactNode;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  return <>{children}</>;
};