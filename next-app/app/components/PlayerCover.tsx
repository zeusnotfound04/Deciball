// import { useAudio } from "@/store/AudioContext";
// import { useUserContext } from "@/store/userStore";
import React, { useRef } from "react";
import Image from "next/image";
// import UpvotedBy from "./UpvotedBy";
import YouTube from "react-youtube";
import { useUserStore } from "@/store/userStore";
import { useAudio, useAudioStore } from "@/store/audioStore";

function PLayerCoverComp() {
  const { user, setShowAddDragOptions, emitMessage } = useUserStore();
  
  // Use the new Zustand-based hook
  const { currentSong, isPlaying, setYouTubePlayer } = useAudio();
  const { setIsPlaying } = useAudioStore();
  
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
    
    // Then handle current song if available
    if(currentSong){
      console.log("[YouTube] Current song is available, setting up playback");
      
      const videoId = currentSong.downloadUrl[0].url;
      console.log("Video ID" , videoId)
      if (videoId) {
        try {
          if (isPlaying) {
            console.log("[YouTube] Loading video with ID:", videoId);
            event.target.loadVideoById(videoId, 0);
          } else {
            console.log("[YouTube] Cueing video with ID:", videoId);
            event.target.cueVideoById(videoId, 0);
          }

          console.log("[YouTube] Attempting to play video");
          event.target.playVideo();

          const storedVolume = Number(localStorage.getItem("volume")) || 1;
          console.log("[YouTube] Setting volume to:", storedVolume * 100);
          event.target.setVolume(storedVolume * 100);
        } catch (error) {
          console.error("YouTube player error:", error);
        }
      } else {
        console.warn("[YouTube] No video ID available to load");
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
              "[YouTube] Video playback ended, emitting songEnded event"
            );
            emitMessage("songEnded", "songEnded");
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
                console.log("[YouTube] State: Ended");
                setIsPlaying(false);
                emitMessage("songEnded", "songEnded");
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
              currentSong?.image?.[currentSong.image.length - 1]?.url ||
              "https://us-east-1.tixte.net/uploads/tanmay111-files.tixte.co/d61488c1ddafe4606fe57013728a7e84.jpg"
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
                currentSong?.image?.[currentSong.image.length - 1]?.url ||
                "https://us-east-1.tixte.net/uploads/tanmay111-files.tixte.co/d61488c1ddafe4606fe57013728a7e84.jpg"
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