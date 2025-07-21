import React, { useRef, useEffect } from "react";
import Image from "next/image";
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
  const { currentSong, isPlaying, setYouTubePlayer, youtubePlayer, pause, resume } = useAudio();
  const { setIsPlaying } = useAudioStore();
  
  useEffect(() => {
    
    if (youtubePlayer && currentSong?.downloadUrl?.[0]?.url) {
      let videoId = currentSong.downloadUrl[0].url;
      
      if (videoId && videoId.includes('youtube.com/watch?v=')) {
        const match = videoId.match(/v=([a-zA-Z0-9_-]{11})/);
        videoId = match ? match[1] : videoId;
      } else if (videoId && videoId.includes('youtu.be/')) {
        const match = videoId.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
        videoId = match ? match[1] : videoId;
      }
      
      if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        try {
          const currentVideoData = youtubePlayer.getVideoData();
          
          if (currentVideoData?.video_id !== videoId) {
            youtubePlayer.cueVideoById(videoId, 0);
            
            setTimeout(() => {
              if (isPlaying) {
                youtubePlayer.playVideo();
              }
            }, 500);
          } else {
            if (isPlaying) {
              youtubePlayer.playVideo();
            } else {
              youtubePlayer.pauseVideo();
            }
          }
        } catch (error) {
          console.error("Error updating YouTube player:", error);
        }
      }
    }
  }, [currentSong, youtubePlayer, isPlaying]);

  const cleanImageUrl = (url: string): string => {
    if (!url) return "https://deciball-web-storage.s3.ap-south-1.amazonaws.com/Seedhe-Maut-Lunch-Front-Cover-Art-4K.png";
    
    let cleanedUrl = url.trim();
    if (cleanedUrl.startsWith('"') && cleanedUrl.endsWith('"')) {
      cleanedUrl = cleanedUrl.slice(1, -1);
    }
    if (cleanedUrl.startsWith("'") && cleanedUrl.endsWith("'")) {
      cleanedUrl = cleanedUrl.slice(1, -1);
    }
    
    try {
      new URL(cleanedUrl);
      return cleanedUrl;
    } catch (error) {
      console.error('Invalid image URL:', cleanedUrl, error);
      return "https://deciball-web-storage.s3.ap-south-1.amazonaws.com/Seedhe-Maut-Lunch-Front-Cover-Art-4K.png";
    }
  };


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
    setYouTubePlayer(event.target);
    
    if(currentSong){
      let videoId = currentSong.downloadUrl[0].url;
      
      if (videoId && videoId.includes('youtube.com/watch?v=')) {
        const match = videoId.match(/v=([a-zA-Z0-9_-]{11})/);
        videoId = match ? match[1] : videoId;
      } else if (videoId && videoId.includes('youtu.be/')) {
        const match = videoId.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
        videoId = match ? match[1] : videoId;
      }
      
      if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        try {
          const storedVolume = Number(localStorage.getItem("volume")) || 1;
          event.target.setVolume(storedVolume * 100);
          
          const { pendingSync } = useAudioStore.getState();
          
          event.target.cueVideoById(videoId, 0);
          
          if (pendingSync) {
            setTimeout(() => {
              event.target.seekTo(pendingSync.timestamp, true);
              if (pendingSync.isPlaying) {
                event.target.playVideo();
              }
              const { handleRoomSync } = useAudioStore.getState();
              handleRoomSync(pendingSync.timestamp, pendingSync.isPlaying, currentSong, false);
            }, 1000);
          } else if (isPlaying) {
            setTimeout(() => {
              event.target.playVideo();
            }, 500);
          }
        } catch (error) {
          console.error("YouTube player error:", error);
        }
      }
    }
  };

  return (
    <>
      <div className="-z-10 opacity-0 aspect-square absolute">
        <YouTube
          key={currentSong?.downloadUrl?.[0]?.url || 'no-song'}
          onEnd={() => {
            if (sendMessage && spaceId && userId) {
              sendMessage("songEnded", { spaceId, userId });
            } else {
              emitMessage("songEnded", "songEnded");
            }
          }}
          onStateChange={(event) => {
            switch (event.data) {
              case 0:
                setIsPlaying(false);
                break;
              case 1:
                if (!isPlaying) {
                  resume();
                }
                break;
              case 2:
                if (isPlaying) {
                  pause();
                }
                break;
              case 5:
                setIsPlaying(false);
                break;
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
          onReady={onPlayerReady}
        />
      </div>

      <div
        draggable
        onDragStart={(e) => handleDragStart(e)}
        onDragEnd={handleDragEnd}
        className="relative h-auto min-h-40 overflow-hidden rounded-xl bg-[#1C1E1F]  shadow-lg border border-[#424244] transition-all duration-300 hover:shadow-xl hover:border-gray-600"
      >
        {!currentSong?.video ? (
          <div className="relative">
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
              className="cover aspect-square h-full object-cover w-full rounded-xl transition-transform duration-300 hover:scale-105"
              src={
                cleanImageUrl(currentSong?.image?.[currentSong.image.length - 1]?.url || '')
              }
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-300 rounded-xl" />
          </div>
        ) : (
          <div className="relative">
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
              className="cover z-10 aspect-square h-full object-cover w-full rounded-xl transition-transform duration-300 hover:scale-105"
              src={
                cleanImageUrl(currentSong?.image?.[0]?.url || '')
              }
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-300 rounded-xl z-20" />
          </div>
        )}

        {!currentSong && (
          <div className="absolute inset-0 bg-[#1C1E1F] animate-pulse rounded-xl flex items-center justify-center">
            <div className="text-gray-500 text-sm">Loading...</div>
          </div>
        )}
      </div>
    </>
  );
}

const PLayerCover = React.memo(PLayerCoverComp);
export default PLayerCover;