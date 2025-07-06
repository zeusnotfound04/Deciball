// import { useAudio } from "@/store/AudioContext";
// import { useUserContext } from "@/store/userStore";
import React, { useRef, useEffect } from "react";
import Image from "next/image";
// import UpvotedBy from "./UpvotedBy";
import YouTube from "react-youtube";
import { useUserStore } from "@/store/userStore";
import { useAudio, useAudioStore } from "@/store/audioStore";
import { useSocket } from "@/context/socket-context";

interface PlayerCoverProps {
  spaceId?: string;
  userId?: string;
}

function PLayerCoverComp({ spaceId, userId }: PlayerCoverProps) {
  const { user, setShowAddDragOptions, emitMessage } = useUserStore();
  const { sendMessage } = useSocket();
  
  // Use the new Zustand-based hook
  const { currentSong, isPlaying, setYouTubePlayer, youtubePlayer, pause, resume } = useAudio();
  const { setIsPlaying } = useAudioStore();
  
  // Add useEffect to handle song changes after initial load
  useEffect(() => {
    console.log("🎬 [PlayerCover] ====================== SONG CHANGE DETECTED ======================");
    console.log("🎬 [PlayerCover] Song changed, current song:", currentSong?.name);
    console.log("🎬 [PlayerCover] YouTube player available:", !!youtubePlayer);
    console.log("🎬 [PlayerCover] Is playing:", isPlaying);
    
    if (youtubePlayer && currentSong?.downloadUrl?.[0]?.url) {
      let videoId = currentSong.downloadUrl[0].url;
      console.log("🎬 [PlayerCover] Raw video URL/ID from currentSong:", videoId);
      
      // Extract video ID if it's a full YouTube URL
      if (videoId && videoId.includes('youtube.com/watch?v=')) {
        const match = videoId.match(/v=([a-zA-Z0-9_-]{11})/);
        videoId = match ? match[1] : videoId;
        console.log("🎬 [PlayerCover] Extracted ID from youtube.com URL:", videoId);
      } else if (videoId && videoId.includes('youtu.be/')) {
        const match = videoId.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
        videoId = match ? match[1] : videoId;
        console.log("🎬 [PlayerCover] Extracted ID from youtu.be URL:", videoId);
      }
      
      console.log("🎬 [PlayerCover] Final extracted video ID:", videoId);
      
      if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        try {
          // Check what's currently loaded in the player
          const currentVideoData = youtubePlayer.getVideoData();
          console.log("🎬 [PlayerCover] Currently loaded video ID:", currentVideoData?.video_id);
          console.log("🎬 [PlayerCover] New video ID to load:", videoId);
          
          if (currentVideoData?.video_id !== videoId) {
            console.log("🎬 [PlayerCover] Video IDs don't match - updating player with new video");
            
            // Always use cueVideoById to avoid auto-playing when changing songs
            console.log("🎬 [PlayerCover] Cueing new video without auto-play");
            youtubePlayer.cueVideoById(videoId, 0);
            
            // Then apply the correct state after a short delay
            setTimeout(() => {
              if (isPlaying) {
                console.log("🎬 [PlayerCover] Starting playback as app state is playing");
                youtubePlayer.playVideo();
              }
            }, 500);
            
            console.log("🎬 [PlayerCover] ✅ Successfully updated player with new video");
          } else {
            console.log("🎬 [PlayerCover] Video IDs match - no need to reload");
            
            // Just sync the playing state
            if (isPlaying) {
              console.log("🎬 [PlayerCover] Ensuring video is playing");
              youtubePlayer.playVideo();
            } else {
              console.log("🎬 [PlayerCover] Ensuring video is paused");
              youtubePlayer.pauseVideo();
            }
          }
        } catch (error) {
          console.error("🎬 [PlayerCover] ❌ Error updating YouTube player:", error);
        }
      } else {
        console.warn("🎬 [PlayerCover] ❌ Invalid video ID format:", videoId);
      }
    } else {
      console.log("🎬 [PlayerCover] Player not ready or no song available");
    }
    
    console.log("🎬 [PlayerCover] ====================== SONG CHANGE COMPLETED ======================");
  }, [currentSong, youtubePlayer, isPlaying]);

  // Utility function to clean and validate URLs
  const cleanImageUrl = (url: string): string => {
    if (!url) return "https://us-east-1.tixte.net/uploads/tanmay111-files.tixte.co/d61488c1ddafe4606fe57013728a7e84.jpg";
    
    // Remove extra quotes from the beginning and end
    let cleanedUrl = url.trim();
    if (cleanedUrl.startsWith('"') && cleanedUrl.endsWith('"')) {
      cleanedUrl = cleanedUrl.slice(1, -1);
    }
    if (cleanedUrl.startsWith("'") && cleanedUrl.endsWith("'")) {
      cleanedUrl = cleanedUrl.slice(1, -1);
    }
    
    // Validate URL format
    try {
      new URL(cleanedUrl);
      return cleanedUrl;
    } catch (error) {
      console.error('Invalid image URL:', cleanedUrl, error);
      return "https://us-east-1.tixte.net/uploads/tanmay111-files.tixte.co/d61488c1ddafe4606fe57013728a7e84.jpg";
    }
  };
  
  // Remove this local playerRef since we're using the one from useAudio
  // const playerRef = useRef<any>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (currentSong) {
      setShowAddDragOptions(true);
      e.dataTransfer.setData("application/json", JSON.stringify(currentSong));
    }
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setShowAddDragOptions(false);
  };

  const onPlayerReady = (event: any) => {
    console.log("🎬 [PlayerCover] ====================== YOUTUBE PLAYER READY ======================");
    console.log("🎬 [PlayerCover] Player ready event triggered");
    console.log("🎬 [PlayerCover] Current song available:", !!currentSong);
    console.log("🎬 [PlayerCover] Current song name:", currentSong?.name);
    console.log("🎬 [PlayerCover] Current isPlaying state:", isPlaying);
    
    // Set the YouTube player reference in the audio store FIRST
    console.log("🎬 [PlayerCover] Setting YouTube player reference in audio store");
    setYouTubePlayer(event.target);
    
    // Check if there's a current song that needs to be loaded
    if(currentSong){
      console.log("🎬 [PlayerCover] Current song is available, setting up playback");
      console.log("🎬 [PlayerCover] Song downloadUrl:", currentSong.downloadUrl);
      
      let videoId = currentSong.downloadUrl[0].url;
      console.log("🎬 [PlayerCover] Raw video URL/ID from currentSong:", videoId);
      
      // Extract video ID if it's a full YouTube URL
      if (videoId && videoId.includes('youtube.com/watch?v=')) {
        const match = videoId.match(/v=([a-zA-Z0-9_-]{11})/);
        videoId = match ? match[1] : videoId;
        console.log("🎬 [PlayerCover] Extracted ID from youtube.com URL:", videoId);
      } else if (videoId && videoId.includes('youtu.be/')) {
        const match = videoId.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
        videoId = match ? match[1] : videoId;
        console.log("🎬 [PlayerCover] Extracted ID from youtu.be URL:", videoId);
      }
      
      console.log("🎬 [PlayerCover] Final extracted video ID:", videoId);
      console.log("🎬 [PlayerCover] Video ID validation:", /^[a-zA-Z0-9_-]{11}$/.test(videoId));
      
      if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        try {
          console.log("🎬 [PlayerCover] Loading video with ID:", videoId);
          
          // Set volume before loading
          const storedVolume = Number(localStorage.getItem("volume")) || 1;
          console.log("🎬 [PlayerCover] Setting volume to:", storedVolume * 100);
          event.target.setVolume(storedVolume * 100);
          
          // Check if there's pending sync (new user joining)
          const { pendingSync } = useAudioStore.getState();
          console.log("🎬 [PlayerCover] Pending sync:", pendingSync);
          
          // Always cue the video first (this loads it but doesn't start playing)
          console.log("🎬 [PlayerCover] Cueing video without auto-play");
          event.target.cueVideoById(videoId, 0);
          
          if (pendingSync) {
            console.log("🎬 [PlayerCover] New user with pending sync - will apply after cueing");
            // Apply pending sync after video is cued
            setTimeout(() => {
              console.log("🎬 [PlayerCover] Applying pending sync:", pendingSync);
              event.target.seekTo(pendingSync.timestamp, true);
              if (pendingSync.isPlaying) {
                console.log("🎬 [PlayerCover] Starting playback from pending sync");
                event.target.playVideo();
              }
              // Clear the pending sync
              const { handleRoomSync } = useAudioStore.getState();
              handleRoomSync(pendingSync.timestamp, pendingSync.isPlaying, currentSong, false);
            }, 1000);
          } else if (isPlaying) {
            // Only start playing if the app state says we should be playing
            console.log("🎬 [PlayerCover] App state is playing, starting video");
            setTimeout(() => {
              event.target.playVideo();
            }, 500);
          }
          
          console.log("🎬 [PlayerCover] ✅ Successfully set up video loading");
        } catch (error) {
          console.error("🎬 [PlayerCover] ❌ YouTube player error:", error);
        }
      } else {
        console.warn("🎬 [PlayerCover] ❌ Invalid video ID format:", videoId);
      }
    } else {
      console.log("🎬 [PlayerCover] No current song available, player ready but waiting for song");
    }
    
    console.log("🎬 [PlayerCover] ====================== YOUTUBE PLAYER READY COMPLETED ======================");
  };

  return (
    <>
      <div className="-z-10 opacity-0 aspect-square absolute">
        <YouTube
          key={currentSong?.downloadUrl?.[0]?.url || 'no-song'} // Force remount when song changes
          onEnd={() => {
            console.log(
              "[YouTube] Video playback ended, sending songEnded message to backend"
            );
            // Send proper WebSocket message for song ended
            if (sendMessage && spaceId && userId) {
              sendMessage("songEnded", { spaceId, userId });
            } else {
              console.warn("[YouTube] Cannot send songEnded - missing spaceId or userId");
              // Fallback to old method
              emitMessage("songEnded", "songEnded");
            }
          }}
          onStateChange={(event) => {
            console.log("🎬 [PlayerCover] ====================== YOUTUBE STATE CHANGE ======================");
            console.log("🎬 [PlayerCover] State changed:", event.data);
            console.log("🎬 [PlayerCover] Current song:", currentSong?.name);
            
            // YouTube player states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
            switch (event.data) {
              case -1:
                console.log("🎬 [PlayerCover] State: Unstarted");
                break;
              case 0:
                console.log("🎬 [PlayerCover] State: Ended");
                setIsPlaying(false);
                break;
              case 1:
                console.log("🎬 [PlayerCover] State: Playing");
                // Only call resume if our app state doesn't match
                if (!isPlaying) {
                  console.log("🎬 [PlayerCover] YouTube playing but app paused - syncing with server");
                  resume();
                }
                break;
              case 2:
                console.log("🎬 [PlayerCover] State: Paused");
                // Only call pause if our app state doesn't match
                if (isPlaying) {
                  console.log("🎬 [PlayerCover] YouTube paused but app playing - syncing with server");
                  pause();
                }
                break;
              case 3:
                console.log("🎬 [PlayerCover] State: Buffering");
                break;
              case 5:
                console.log("🎬 [PlayerCover] State: Cued (video loaded but not playing)");
                setIsPlaying(false);
                break;
              default:
                console.log("🎬 [PlayerCover] State: Unknown state:", event.data);
            }
            console.log("🎬 [PlayerCover] ====================== YOUTUBE STATE CHANGE COMPLETED ======================");
          }}
          opts={{
            height: '10',
            width: '10',
            playerVars: {
              origin:
                typeof window !== "undefined" ? window.location.origin : "",
              autoplay: 0,
              controls: 0,
              disablekb: 1,
              modestbranding: 1,
              rel: 0,
            },
          }}
          onReady={onPlayerReady}
        />
      </div>

      <div
        draggable
        onDragStart={(e) => handleDragStart(e)}
        onDragEnd={handleDragEnd}
        className=" border-2 border-white/10 relative h-auto min-h-40  overflow-hidden rounded-xl "
      >
        {!currentSong?.video ? (
          <Image
            draggable="false"
            priority
            title={
              currentSong?.name
                ? `${currentSong.name} - Added by ${
                    currentSong?.addedByUser?.username !== user?.username
                      ? `${currentSong?.addedByUser?.name} (${currentSong?.addedByUser?.username})`
                      : "You"
                  }`
                : "No song available"
            }
            alt={currentSong?.name || ""}
            height={300}
            width={300}
            className="cover aspect-square h-full object-cover  w-full"
            src={
              cleanImageUrl(currentSong?.image?.[currentSong.image.length - 1]?.url || '')
            }
          />
        ) : (
          <div className=" relative">
            <Image
              draggable="false"
              priority
              title={
                currentSong?.name
                  ? `${currentSong.name} - Added by ${
                      currentSong?.addedByUser?.username !== user?.username
                        ? `${currentSong?.addedByUser?.name} (${currentSong?.addedByUser?.username})`
                        : "You"
                    }`
                  : "No song available"
              }
              alt={currentSong?.name || ""}
              height={300}
              width={300}
              className="cover z-10  aspect-square h-full object-cover  w-full"
              src={
                cleanImageUrl(currentSong?.image?.[currentSong.image.length - 1]?.url || '')
              }
            />
          </div>
        )}

        {/* {currentSong?.source !== "youtube" && (
        <p className=" absolute bottom-2 right-2 text-xl mt-1 text-[#a176eb]">
          ☆
        </p>
      )} */}
        {/* <UpvotedBy /> */}
      </div>
    </>
  );
}

const PLayerCover = React.memo(PLayerCoverComp);
export default PLayerCover;