// import { useAudio } from "@/store/AudioContext";
// import { useUserContext } from "@/store/userStore";
import React, { useRef } from "react";
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
  const { currentSong, isPlaying, setYouTubePlayer } = useAudio();
  const { setIsPlaying } = useAudioStore();
  
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
    console.log("[YouTube] Player ready event triggered");
    
    // Set the YouTube player reference in the audio store FIRST
    console.log("[YouTube] Setting YouTube player reference in audio store");
    setYouTubePlayer(event.target);
    
    // Check if there's a current song that needs to be loaded
    if(currentSong){
      console.log("[YouTube] Current song is available, setting up playback");
      console.log("[YouTube] Current isPlaying state:", isPlaying);
      
      let videoId = currentSong.downloadUrl[0].url;
      console.log("Raw video URL/ID from currentSong:", videoId);
      
      // Extract video ID if it's a full YouTube URL
      if (videoId && videoId.includes('youtube.com/watch?v=')) {
        const match = videoId.match(/v=([a-zA-Z0-9_-]{11})/);
        videoId = match ? match[1] : videoId;
      } else if (videoId && videoId.includes('youtu.be/')) {
        const match = videoId.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
        videoId = match ? match[1] : videoId;
      }
      
      console.log("Extracted video ID:", videoId);
      
      if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        try {
          console.log("[YouTube] Loading video with ID:", videoId);
          
          // Set volume before loading
          const storedVolume = Number(localStorage.getItem("volume")) || 1;
          console.log("[YouTube] Setting volume to:", storedVolume * 100);
          event.target.setVolume(storedVolume * 100);
          
          // Check if there's pending sync (new user joining)
          const { pendingSync } = useAudioStore.getState();
          
          if (pendingSync) {
            console.log("[YouTube] New user with pending sync - loading video and will apply sync");
            // For new users, always load and then apply the sync position and state
            event.target.loadVideoById(videoId, 0);
            
            // Apply pending sync after video loads
            setTimeout(() => {
              console.log("[YouTube] Applying pending sync:", pendingSync);
              event.target.seekTo(pendingSync.timestamp, true);
              if (pendingSync.isPlaying) {
                console.log("[YouTube] Starting playback from pending sync");
                event.target.playVideo();
              } else {
                console.log("[YouTube] Pausing from pending sync");
                event.target.pauseVideo();
              }
              // Clear the pending sync
              const { handleRoomSync } = useAudioStore.getState();
              handleRoomSync(pendingSync.timestamp, pendingSync.isPlaying, currentSong);
            }, 1000);
          } else {
            // Normal case - existing user
            if (isPlaying) {
              console.log("[YouTube] Loading and playing video (existing user, isPlaying=true)");
              event.target.loadVideoById(videoId, 0);
            } else {
              console.log("[YouTube] Cueing video without auto-play (existing user, isPlaying=false)");
              event.target.cueVideoById(videoId, 0);
            }
          }
          
        } catch (error) {
          console.error("YouTube player error:", error);
        }
      } else {
        console.warn("[YouTube] Invalid video ID format:", videoId);
      }
    } else {
      console.log("[YouTube] No current song available, player ready but waiting for song");
    }
  };

  return (
    <>
      <div className="-z-10 opacity-0 aspect-square absolute">
        <YouTube
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
            console.log("[YouTube] State changed:", event.data);
            // YouTube player states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
            switch (event.data) {
              case 1: // playing
                console.log("[YouTube] State: Playing");
                setIsPlaying(true);
                break;
              case 2: // paused
                console.log("[YouTube] State: Paused");
                setIsPlaying(false);
                break;
              case 0: // ended
                console.log("[YouTube] State: Ended - handled by onEnd callback");
                setIsPlaying(false);
                // Don't send songEnded here - it's already handled by onEnd callback
                break;
              default:
                console.log("[YouTube] State: Other -", event.data);
            }
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
          onPause={() => {
            console.log("[YouTube] Video paused - updating state");
            setIsPlaying(false);
          }}
          onPlay={() => {
            console.log("[YouTube] Video started playing - updating state");
            setIsPlaying(true);
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