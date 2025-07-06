"use client";

  import React, { useState, useEffect, useRef, useContext } from "react";
  import { searchResults } from "@/types";
  import { create } from "zustand";
  import { devtools, persist } from "zustand/middleware";
  import getURL from "@/lib/utils";
  import { toast } from "sonner";
  import { useUserStore } from "./userStore";
  import { useSocket } from "@/context/socket-context";

  // Define the store state interface
  interface AudioState {
    
    isPlaying: boolean;
    isMuted: boolean;
    currentSong: searchResults | null;
    currentProgress: number;
    currentDuration: number;
    currentVolume: number;
    background: boolean;
    youtubePlayer: any;
    spotifyPlayer: any; // Add Spotify player to the store state
    isSpotifyReady: boolean;
    spotifyDeviceId: string | null;
    isSynchronized: boolean; // Track if playback is synchronized
    lastSyncTimestamp: number;
    pendingSync: { timestamp: number; isPlaying: boolean; song?: searchResults } | null;
    currentSpaceId: string | null; // Add spaceId to store state
    isSeeking: boolean; // Add seeking state to prevent timestamp conflicts

    // Actions
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
    setCurrentSpaceId: (spaceId: string | null) => void; // Add spaceId setter
    
    // Synchronization actions
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
          currentSpaceId: null, // Add spaceId to initial state
          isSeeking: false, // Add seeking state to initial state

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
            
            // Process any pending sync when player becomes available
            const state = get();
            if (youtubePlayer && state.pendingSync) {
              console.log("[AudioStore] Processing pending sync after player ready:", state.pendingSync);
              const { timestamp, isPlaying, song } = state.pendingSync;
              
              // Update current song if provided in pending sync
              if (song && (!state.currentSong || state.currentSong.id !== song.id)) {
                set({ currentSong: song });
              }
              
              // Sync playback position
              state.syncPlaybackToTimestamp(timestamp);
              
              // Set playing state
              set({ isPlaying, pendingSync: null });
              
              if (isPlaying && youtubePlayer.playVideo) {
                youtubePlayer.playVideo();
              } else if (!isPlaying && youtubePlayer.pauseVideo) {
                youtubePlayer.pauseVideo();
              }
            }
          },
          setSpotifyPlayer: (spotifyPlayer) => {
            console.log("[AudioStore] Setting Spotify player in store:", !!spotifyPlayer);
            set({ spotifyPlayer });
          },
          setSpotifyReady: (isSpotifyReady) => set({ isSpotifyReady }),
          setSpotifyDeviceId: (spotifyDeviceId) => set({ spotifyDeviceId }),
          setSynchronized: (isSynchronized) => set({ isSynchronized }),
          setLastSyncTimestamp: (lastSyncTimestamp) => set({ lastSyncTimestamp }),
          setCurrentSpaceId: (currentSpaceId) => set({ currentSpaceId }), // Add spaceId setter
          
          // Synchronization actions
          syncPlaybackToTimestamp: (timestamp) => {
            const state = get();
            console.log("[AudioStore] 🎯 Syncing playback to timestamp:", timestamp);
            console.log("[AudioStore] 🎯 Current seeking state:", state.isSeeking);
            
            // Skip sync if we're currently seeking to avoid conflicts
            if (state.isSeeking) {
              console.log("[AudioStore] ⏭️ Skipping sync - currently seeking, will apply after seek completes");
              return;
            }
            
            if (state.youtubePlayer && state.youtubePlayer.seekTo && state.youtubePlayer.getCurrentTime) {
              try {
                const currentTime = state.youtubePlayer.getCurrentTime();
                const timeDiff = Math.abs(currentTime - timestamp);
                
                console.log("[AudioStore] 🎯 YouTube sync check:", {
                  currentTime,
                  targetTimestamp: timestamp,
                  timeDiff,
                  seeking: state.isSeeking
                });
                
                // Only sync if the difference is significant (more than 3 seconds)
                // This prevents choppy playback from frequent small corrections
                if (timeDiff > 3) {
                  console.log("[AudioStore] Significant time difference detected:", timeDiff, "seconds. Syncing...");
                  state.youtubePlayer.seekTo(timestamp, true);
                  set({ currentProgress: timestamp, isSynchronized: true, lastSyncTimestamp: Date.now() });
                  
                  // Show sync notification only for significant corrections
                  if (typeof window !== 'undefined') {
                    const event = new CustomEvent('show-sync-toast', {
                      detail: { message: `Synced to ${Math.floor(timestamp)}s (${Math.floor(timeDiff)}s correction)`, type: 'info' }
                    });
                    window.dispatchEvent(event);
                  }
                } else {
                  console.log("[AudioStore] Time difference within acceptable range:", timeDiff, "seconds. Updating progress only.");
                  set({ currentProgress: timestamp, isSynchronized: true, lastSyncTimestamp: Date.now() });
                }
              } catch (error) {
                console.error("[AudioStore] Error syncing YouTube player:", error);
              }
            } else if (state.youtubePlayer === null) {
              // Player not yet initialized, this is expected for new users
              console.log("[AudioStore] YouTube player not ready, this will be handled when player initializes");
            }
            
            if (state.spotifyPlayer && state.isSpotifyReady) {
              try {
                state.spotifyPlayer.seek(timestamp * 1000); // Spotify uses milliseconds
                set({ currentProgress: timestamp, isSynchronized: true, lastSyncTimestamp: Date.now() });
                console.log("[AudioStore] Spotify player synced to:", timestamp);
              } catch (error) {
                console.error("[AudioStore] Error syncing Spotify player:", error);
              }
            }
          },
          
          handleRoomSync: (currentTime, isPlaying, currentSong, isInitialSync = false) => {
            const state = get();
            console.log("[AudioStore] Handling room sync:", { currentTime, isPlaying, currentSong, isInitialSync });

            // If it's an initial sync for a new user, load the song but stay paused at 0:00
            if (isInitialSync) {
              console.log("[AudioStore] Initial sync: Loading song paused at 0:00.");
              if (currentSong) {
                // Set the song, but force paused state and 0 progress
                set({
                  currentSong,
                  isPlaying: false,
                  currentProgress: 0,
                  isSynchronized: false, // Not yet synced
                  lastSyncTimestamp: currentTime, // Store the real timestamp for later
                  pendingSync: null, // Clear any old pending sync
                });

                // If the player is ready, cue the video at the start
                if (state.youtubePlayer && state.youtubePlayer.cueVideoById && currentSong.downloadUrl?.[0]?.url) {
                  try {
                    const videoId = currentSong.downloadUrl[0].url;
                    console.log("[AudioStore] Cueing video for initial sync:", videoId);
                    state.youtubePlayer.cueVideoById(videoId, 0);
                  } catch (e) {
                    console.error("Error cueing video on initial sync:", e);
                  }
                }
              } else {
                 console.log("[AudioStore] Initial sync with no current song, doing nothing.");
              }
              return; // Stop further processing for initial sync
            }

            // For existing users, if not yet synchronized, ignore subsequent sync messages
            if (!state.isSynchronized) {
                console.log("[AudioStore] ⏭️ Skipping room sync - user has not yet clicked play.");
                // just update the timestamp to be synced to
                set({ lastSyncTimestamp: currentTime });
                return;
            }

            console.log("[AudioStore] Current seeking state:", state.isSeeking);
            
            // Update current song if different
            if (currentSong && (!state.currentSong || state.currentSong.id !== currentSong.id)) {
              set({ currentSong });
            }
            
            // If we're currently seeking, skip this sync to avoid conflicts
            if (state.isSeeking) {
              console.log("[AudioStore] ⏭️ Skipping room sync - currently seeking");
              return;
            }
            
            // If YouTube player is not ready yet, store the sync data as pending
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
            
            // Clear any pending sync since we're processing this one
            set({ pendingSync: null });
            
            // Sync playback position
            state.syncPlaybackToTimestamp(currentTime);
            
            // Set playing state
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
            console.log("[AudioStore] 🎯 Handling playback seek to:", seekTime);
            
            // Set a flag to prevent timestamp sync conflicts during seek
            set({ isSeeking: true });
            
            // Apply the seek immediately for smooth user experience
            if (state.youtubePlayer && state.youtubePlayer.seekTo) {
              try {
                console.log("[AudioStore] 🎯 Applying seek to YouTube player");
                state.youtubePlayer.seekTo(seekTime, true);
                set({ currentProgress: seekTime });
              } catch (error) {
                console.error("[AudioStore] Error seeking YouTube player:", error);
              }
            }
            
            if (state.spotifyPlayer && state.isSpotifyReady) {
              try {
                console.log("[AudioStore] 🎯 Applying seek to Spotify player");
                state.spotifyPlayer.seek(seekTime * 1000); // Spotify uses milliseconds
                set({ currentProgress: seekTime });
              } catch (error) {
                console.error("[AudioStore] Error seeking Spotify player:", error);
              }
            }
            
            // Clear the seeking flag after a longer delay to prevent race conditions
            setTimeout(() => {
              console.log("[AudioStore] 🎯 Seek operation completed, resuming normal sync");
              set({ isSeeking: false });
            }, 2500); // Wait 2.5 seconds - longer than backend pause duration
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
    const { user, isAdminOnline } = useUserStore();
    
    // Import SocketContext hook for WebSocket access
    const { socket: wsFromContext, sendMessage: sendMessageFromContext } = useSocket();
    
    // Use WebSocket from context if available, fallback to userStore
    const ws = wsFromContext || useUserStore.getState().ws;
    const emitMessage = sendMessageFromContext || useUserStore.getState().emitMessage;
    
    // Get state and actions from the store
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
      setVolume,
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

    // Play function
    const play = async (song: searchResults) => {
      console.log("🎵 [Play] ====================== PLAY FUNCTION CALLED (Simplified) ======================");
      console.log("🎵 [Play] Loading song, but will remain paused:", song.name);
      
      setCurrentSong(song);
      setIsPlaying(false); // Ensure song is paused on load
      
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
      
      const isSpotifyTrack = song.downloadUrl?.[0]?.url?.includes('spotify:track:') || 
                            song.url?.includes('open.spotify.com/track/');
      
      if (isSpotifyTrack && spotifyPlayer && isSpotifyReady) {
        // Just load, don't play for spotify
        console.log("🎵 [Play] Spotify track loaded, but not playing.");
        return;
      }
      
      // If we have a YouTube player, use it for playback
      if (youtubePlayer && song.downloadUrl?.[0]?.url && !isSpotifyTrack) {
        try {
          const videoId = song.downloadUrl[0].url;
          console.log("🎵 [Play] YouTube playback section - Cueing video with ID:", videoId);
          
          // Cue the video instead of loading and playing it immediately.
          // This loads the thumbnail and prepares the player but doesn't start playback.
          youtubePlayer.cueVideoById(videoId, 0);
          console.log("🎵 [Play] Successfully called cueVideoById");

          // Set playing state to false as the video is just cued, not playing.
          setIsPlaying(false);
          
          // Reset progress and duration for the new song
          setProgress(0);
          setDuration(0);

          // Reset tracking on new song load
          lastEmittedTimeRef.current = 0;
          skipCountRef.current = 0;
          
          console.log("[Audio] YouTube video cued and player state is paused.");
          return;
        } catch (e: any) {
          console.error("Error cueing YouTube video:", e);
          setIsPlaying(false);
        }
      }

      // If YouTube player is not ready yet but we have a YouTube video, just set the song, don't play
      console.log("🎵 [Play] Fallback: Song set, player paused.");
    };

    // Pause function
    const pause = () => {
      console.log("[Audio] pause() called");
      const { youtubePlayer, spotifyPlayer, isSpotifyReady, currentSpaceId } = useAudioStore.getState();

      // Set the local state first
      setIsPlaying(false);

      if (youtubePlayer) {
        try {
          console.log("[Audio] Calling YouTube pauseVideo()");
          youtubePlayer.pauseVideo();

          if (currentSpaceId && user?.id && emitMessage) {
            console.log("[Audio] Sending pause message to server via emitMessage");
            if (sendMessageFromContext) {
              // SocketContext format
              sendMessageFromContext("pause", {
                spaceId: currentSpaceId,
                userId: user.id,
              });
            } else {
              // UserStore format
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
          
          // Notify server about pause
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

      // Fallback for HTML audio
      audioRef.current?.pause();
    };

    const resume = () => {
      console.log("[Audio] resume() called");
      const { isSynchronized, currentSong, youtubePlayer, spotifyPlayer, isSpotifyReady, syncPlaybackToTimestamp, lastSyncTimestamp, currentSpaceId } = useAudioStore.getState();

      if (!isSynchronized) {
        console.log("[Audio] Not synchronized. Syncing to room state before resuming.");
        syncPlaybackToTimestamp(lastSyncTimestamp);
        // Mark as synchronized after syncing
        setSynchronized(true);
      }

      // Set the local state first
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
                // SocketContext format
                sendMessageFromContext("play", {
                  spaceId: currentSpaceId,
                  userId: user.id,
                });
              } else {
                // UserStore format
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
            
            // Notify server about resume
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

        // Fallback for HTML audio
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
        // This will call resume, which will then handle the sync
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
      console.log("[Audio] ====================== SEEK FUNCTION CALLED ======================");
      console.log("[Audio] Seek value (in seconds):", value);
      console.log("[Audio] Current song:", currentSong?.name);
      console.log("[Audio] YouTube player available:", !!youtubePlayer);
      console.log("[Audio] Current spaceId:", currentSpaceId);
      console.log("[Audio] WebSocket ready:", ws?.readyState === WebSocket.OPEN);
      console.log("[Audio] emitMessage function available:", !!emitMessage);
      
      // If we have a YouTube player, use it for seeking
      if (youtubePlayer) {
        try {
          const duration = youtubePlayer.getDuration();
          const seekTime = value; // Value is already in seconds
          console.log("[Audio] YouTube seek - Duration:", duration, "SeekTime:", seekTime);
          
          youtubePlayer.seekTo(seekTime, true);
          
          // Get current space ID from the state for WebSocket message
          const currentState = useAudioStore.getState();
          const currentSpaceId = currentState.currentSpaceId;
          
          // Notify server about YouTube seek using emitMessage
          if (currentSpaceId && emitMessage) {
            const seekData = { 
              spaceId: currentSpaceId,
              seekTime: seekTime,
              timestamp: Date.now() 
            };
            console.log("[Audio] Sending seek message to server via emitMessage:", seekData);
            try {
              // Check if we're using socket context or userStore emitMessage
              if (sendMessageFromContext) {
                // SocketContext format
                sendMessageFromContext("seek-playback", seekData);
              } else {
                // UserStore format
                emitMessage("seek-playback", seekData);
              }
              console.log("[Audio] ✅ Seek message sent successfully via emitMessage");
            } catch (error) {
              console.error("[Audio] ❌ Error sending seek message via emitMessage:", error);
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
        
        // Notify server about HTML audio seek
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
      console.log("🎵 [PlayNext] ====================== playNext() CALLED ======================");
      console.log("🎵 [PlayNext] Current song:", currentSong?.name || 'None');
      console.log("🎵 [PlayNext] Current song ID:", currentSong?.id || 'None');
      console.log("🎵 [PlayNext] Current song source:", currentSong?.source || 'None');
      console.log("🎵 [PlayNext] Current song URL:", currentSong?.url || 'None');
      console.log("🎵 [PlayNext] Current isPlaying state:", isPlaying);
      console.log("🎵 [PlayNext] User role:", user?.role || 'unknown');
      console.log("🎵 [PlayNext] YouTube player available:", !!youtubePlayer);
      console.log("🎵 [PlayNext] HTML audio ref available:", !!audioRef.current);
      console.log("🎵 [PlayNext] WebSocket available:", !!ws);
      console.log("🎵 [PlayNext] WebSocket ready state:", ws?.readyState);
      console.log("🎵 [PlayNext] WebSocket OPEN:", WebSocket.OPEN);
      console.log("🎵 [PlayNext] Is WebSocket ready:", !!ws && ws.readyState === WebSocket.OPEN);
      
      // Log audio element state
      if (audioRef.current) {
        console.log("🎵 [PlayNext] HTML audio current time:", audioRef.current.currentTime);
        console.log("🎵 [PlayNext] HTML audio duration:", audioRef.current.duration);
        console.log("🎵 [PlayNext] HTML audio paused:", audioRef.current.paused);
        console.log("🎵 [PlayNext] HTML audio src:", audioRef.current.src);
        console.log("🎵 [PlayNext] Pausing HTML audio element");
        audioRef.current.pause();
      } else {
        console.log("🎵 [PlayNext] No HTML audio element available");
      }
      
      // Log YouTube player state
      if (youtubePlayer) {
        try {
          console.log("🎵 [PlayNext] YouTube player state before pause:", youtubePlayer.getPlayerState ? youtubePlayer.getPlayerState() : 'getPlayerState not available');
          console.log("🎵 [PlayNext] YouTube video ID:", youtubePlayer.getVideoData ? youtubePlayer.getVideoData()?.video_id : 'getVideoData not available');
          console.log("🎵 [PlayNext] Pausing YouTube player");
          youtubePlayer.pauseVideo();
          console.log("🎵 [PlayNext] YouTube player paused successfully");
        } catch (error) {
          console.error("🎵 [PlayNext] Error pausing YouTube player for next:", error);
        }
      } else {
        console.log("🎵 [PlayNext] No YouTube player available");
      }
      
      // Check WebSocket readiness before sending
      if (!ws) {
        console.error("🎵 [PlayNext] ❌ CRITICAL: WebSocket is null/undefined!");
        return;
      }
      
      if (ws.readyState !== WebSocket.OPEN) {
        console.error("🎵 [PlayNext] ❌ CRITICAL: WebSocket is not open! State:", ws.readyState);
        console.error("🎵 [PlayNext] WebSocket states: CONNECTING=0, OPEN=1, CLOSING=2, CLOSED=3");
        return;
      }
      
      console.log("🎵 [PlayNext] ✅ WebSocket is ready, sending playNext message");
      console.log("🎵 [PlayNext] Message type: 'playNext', data: 'playNext'");
      
      try {
        // Check if we have spaceId and userId
        if (!currentSpaceId) {
          console.error("🎵 [PlayNext] ❌ CRITICAL: No spaceId available!");
          return;
        }
        
        if (!user?.id) {
          console.error("🎵 [PlayNext] ❌ CRITICAL: No userId available!");
          return;
        }

        console.log("🎵 [PlayNext] Sending play-next message with spaceId:", currentSpaceId, "userId:", user.id);

        // Check if we're using socket context or userStore emitMessage
        if (sendMessageFromContext) {
          // SocketContext format - correct message type and data format
          sendMessageFromContext("play-next", { 
            spaceId: currentSpaceId, 
            userId: user.id 
          });
        } else {
          // UserStore format - correct message type and data format
          emitMessage("play-next", { 
            spaceId: currentSpaceId, 
            userId: user.id 
          });
        }
        console.log("🎵 [PlayNext] ✅ play-next message sent successfully");
      } catch (error) {
        console.error("🎵 [PlayNext] ❌ Error sending play-next message:", error);
      }
      
      console.log("🎵 [PlayNext] ====================== playNext() COMPLETED ======================");
    };

    
    const playPrev = () => {
      console.log("🎵 [PlayPrev] playPrev called - not implemented yet");
      console.log("🎵 [PlayPrev] Note: Previous song functionality requires backend implementation");
      
      audioRef.current?.pause();
      // Also pause YouTube player
      if (youtubePlayer) {
        try {
          youtubePlayer.pauseVideo();
        } catch (error) {
          console.error("Error pausing YouTube player for prev:", error);
        }
      }
      
      // TODO: Implement play previous functionality
      // This would require maintaining a "previous songs" history in Redis
      console.log("🎵 [PlayPrev] Previous song functionality not yet implemented");
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
        
        // Check if there's a pending sync to apply now that the player is ready
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
                // Clear the pending sync
                const { handleRoomSync } = useAudioStore.getState();
                handleRoomSync(state.pendingSync!.timestamp, state.pendingSync!.isPlaying, state.pendingSync!.song || state.currentSong, true);
              }
            } catch (error) {
              console.error("[Audio] Error applying pending sync:", error);
            }
          }, 500); // Small delay to ensure player is fully ready
        }
      }
    };

    // Function to set up Spotify player
    const setupSpotifyPlayer = (player: any) => {
      console.log("[Audio] setupSpotifyPlayer called with player:", !!player);
      setSpotifyPlayerInStore(player);
      
      if (player) {
        // Set up Spotify player event handlers
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
          
          // Update synchronization timestamp
          setLastSyncTimestamp(Date.now());
          
          // Notify server of state change for sync
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

        // Connect to the player
        player.connect();
      }
    };

    // Function to handle synchronization commands from server
    const handleSyncCommand = (data: any) => {
      console.log("[Audio] Received sync command:", data);
      
      switch (data.type) {
        case "spotify-sync-play":
          if (spotifyPlayer && isSpotifyReady) {
            const timeDiff = Date.now() - data.timestamp;
            const syncedPosition = data.position + timeDiff;
            
            // Seek to synchronized position and play
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

    // Queue management functions
    const addToQueue = (song: searchResults) => {
      console.log("🎵 Adding song to queue:", song);
      
      if (ws && ws.readyState === WebSocket.OPEN) {
        // Extract YouTube video ID if it's a YouTube URL
        let extractedUrl = song.downloadUrl?.[0]?.url || song.url || '';
        
        // If it's a YouTube URL, extract the video ID
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
        
        console.log("📤 Sending add-to-queue message:", message);
        ws.send(JSON.stringify(message));
      } else {
        console.error("❌ WebSocket not available for adding to queue");
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
      
      // Get current space ID from the state
      const currentState = useAudioStore.getState();
      const spaceId = currentState.currentSpaceId;
      
      if (!spaceId) {
        console.error("[Audio] ❌ No spaceId available for voting");
        return;
      }
      
      if (sendMessageFromContext) {
        // Use SocketContext format
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
          console.log("[Audio] ✅ Vote message sent via SocketContext, success:", success);
        } catch (error) {
          console.error("[Audio] ❌ Error sending vote via SocketContext:", error);
        }
      } else if (ws && ws.readyState === WebSocket.OPEN) {
        // Fallback to old WebSocket format
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
          console.log("[Audio] ✅ Vote message sent successfully via fallback WebSocket");
        } catch (error) {
          console.error("[Audio] ❌ Error sending vote via fallback WebSocket:", error);
        }
      } else {
        console.error("[Audio] ❌ No WebSocket connection available for voting");
        console.error("[Audio] Debug info:", {
          socketContextAvailable: !!sendMessageFromContext,
          fallbackWsAvailable: !!ws,
          fallbackWsReady: ws?.readyState === WebSocket.OPEN,
          spaceId: spaceId
        });
      }
      
      console.log("[Audio] ====================== VOTE ON SONG COMPLETED ======================");
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
          // Only use HTML audio ended event if we're not using YouTube player
          if (!youtubePlayer) {        // Use custom songEnded callback if available, otherwise fallback to emitMessage
          const customSongEndedCallback = (window as any).__songEndedCallback;
          if (customSongEndedCallback) {
            customSongEndedCallback();
          } else {
            // Check if we're using socket context or userStore emitMessage
            if (sendMessageFromContext) {
              // SocketContext format
              sendMessageFromContext("songEnded", { action: "songEnded" });
            } else {
              // UserStore format - need to pass object
              emitMessage("songEnded", { action: "songEnded" });
            }
          }
          }
          // If YouTube player is active, let it handle the songEnded event
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

    // Synchronization event listeners
    useEffect(() => {
      const handleRoomSyncEvent = (event: CustomEvent) => {
        console.log("🎵 Room sync event received:", event.detail);
        handleRoomSync(
          event.detail.currentTime,
          event.detail.isPlaying,
          event.detail.currentSong,
          event.detail.isInitialSync || false
        );
      };

      const handlePlaybackPausedEvent = (event: CustomEvent) => {
        console.log("⏸️ Playback paused event received:", event.detail);
        handlePlaybackPause();
      };

      const handlePlaybackResumedEvent = (event: CustomEvent) => {
        console.log("▶️ Playback resumed event received:", event.detail);
        handlePlaybackResume();
      };

      const handlePlaybackSeekedEvent = (event: CustomEvent) => {
        console.log("⏩ Playback seeked event received:", event.detail);
        handlePlaybackSeek(event.detail.seekTime);
      };

      const handlePlaybackStateUpdateEvent = (event: CustomEvent) => {
        console.log("🔄 Playback state update event received:", event.detail);
        // Handle general playback state updates if needed
      };

      const handleCurrentSongUpdateEvent = (event: CustomEvent) => {
        console.log("🎶 [AudioStore] ====================== CURRENT SONG UPDATE EVENT ======================");
        console.log("🎶 [AudioStore] Current song update event received:", event.detail);
        const songData = event.detail.song;
        console.log("🎶 [AudioStore] Raw song data:", songData);
        
        if (songData) {
          console.log("🎶 [AudioStore] Processing song data...");
          console.log("🎶 [AudioStore] Song ID:", songData.id);
          console.log("🎶 [AudioStore] Song title:", songData.title || songData.name);
          console.log("🎶 [AudioStore] Song artist:", songData.artist);
          console.log("🎶 [AudioStore] Song extractedId:", songData.extractedId);
          console.log("🎶 [AudioStore] Song source:", songData.source);
          console.log("🎶 [AudioStore] Song bigImg:", songData.bigImg);
          console.log("🎶 [AudioStore] Song smallImg:", songData.smallImg);
          
          // Format the song for audio store
          const formattedSong: searchResults = {
            id: songData.id,
            name: songData.title || songData.name,
            artistes: {
              primary: [{
                id: 'unknown',
                name: songData.artist || 'Unknown Artist',
                role: 'primary_artist',
                image: [] as [],
                type: 'artist' as const,
                url: ''
              }]
            },
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
          
          console.log("🎶 [AudioStore] Formatted song for audio store:", formattedSong);
          console.log("🎶 [AudioStore] Formatted song name:", formattedSong.name);
          console.log("🎶 [AudioStore] Formatted song downloadUrl:", formattedSong.downloadUrl);
          console.log("🎶 [AudioStore] Current song before update:", currentSong?.name);
          
          // Set as current song and start playing
          console.log("🎶 [AudioStore] Setting current song in store...");
          setCurrentSong(formattedSong);
          console.log("� [AudioStore] Starting playback of current song update:", formattedSong.name);
          
          try {
            play(formattedSong);
            console.log("🎶 [AudioStore] ✅ Successfully called play() function");
          } catch (error) {
            console.error("🎶 [AudioStore] ❌ Error calling play() function:", error);
          }
        } else {
          console.error("🎶 [AudioStore] ❌ No song data in current song update event");
        }
        
        console.log("🎶 [AudioStore] ====================== CURRENT SONG UPDATE EVENT COMPLETED ======================");
      };

      // Add event listeners
      window.addEventListener('room-sync-playback', handleRoomSyncEvent as EventListener);
      window.addEventListener('playback-paused', handlePlaybackPausedEvent as EventListener);
      window.addEventListener('playback-resumed', handlePlaybackResumedEvent as EventListener);
      window.addEventListener('playback-seeked', handlePlaybackSeekedEvent as EventListener);
      window.addEventListener('playback-state-update', handlePlaybackStateUpdateEvent as EventListener);
      window.addEventListener('current-song-update', handleCurrentSongUpdateEvent as EventListener);

      // Cleanup function
      return () => {
        window.removeEventListener('room-sync-playback', handleRoomSyncEvent as EventListener);
        window.removeEventListener('playback-paused', handlePlaybackPausedEvent as EventListener);
        window.removeEventListener('playback-resumed', handlePlaybackResumedEvent as EventListener);
        window.removeEventListener('playback-seeked', handlePlaybackSeekedEvent as EventListener);
        window.removeEventListener('playback-state-update', handlePlaybackStateUpdateEvent as EventListener);
        window.removeEventListener('current-song-update', handleCurrentSongUpdateEvent as EventListener);
      };
    }, [handleRoomSync, handlePlaybackPause, handlePlaybackResume, handlePlaybackSeek]);

    // WebSocket sync message handling
    useEffect(() => {
      if (!ws) return;

      const handleWebSocketMessage = (event: MessageEvent) => {
        try {
          const { type, data } = JSON.parse(event.data);
          
          switch (type) {
            case 'current-song-update':
              console.log("🎶 [WebSocket] Received current-song-update message:", data);
              console.log("🎶 [WebSocket] Song data:", data.song);
              
              // Dispatch custom event for current song update
              window.dispatchEvent(new CustomEvent('current-song-update', {
                detail: data
              }));
              break;
              
            case 'playback-sync':
              console.log("🎵 Received playback sync message:", data);
              
              // Calculate the expected current time based on timestamp
              const timeDiff = (Date.now() - data.timestamp) / 1000;
              const expectedCurrentTime = data.currentTime + (data.isPlaying ? timeDiff : 0);
              
              // Dispatch custom event for room sync
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
              console.log("⏸️ Received playback pause message:", data);
              window.dispatchEvent(new CustomEvent('playback-paused', {
                detail: { timestamp: data.timestamp, controlledBy: data.controlledBy }
              }));
              break;
              
            case 'playback-resume':
              console.log("▶️ Received playback resume message:", data);
              window.dispatchEvent(new CustomEvent('playback-resumed', {
                detail: { timestamp: data.timestamp, controlledBy: data.controlledBy }
              }));
              break;
              
            case 'playback-seek':
              console.log("⏩ Received playback seek message:", data);
              window.dispatchEvent(new CustomEvent('playback-seeked', {
                detail: { seekTime: data.seekTime, timestamp: data.timestamp, controlledBy: data.controlledBy }
              }));
              break;
              
            default:
              // Let other message types be handled elsewhere
              break;
          }
        } catch (error) {
          console.error("Error parsing WebSocket sync message:", error);
        }
      };

      // Add message listener
      ws.addEventListener('message', handleWebSocketMessage);

      // Cleanup
      return () => {
        ws.removeEventListener('message', handleWebSocketMessage);
      };
    }, [ws]);

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
      setCurrentSpaceId  // Add spaceId setter to the return object
    };
  }


  interface AudioProviderProps {
      children: React.ReactNode;
    }

  export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
      return <>{children}</>;
    };