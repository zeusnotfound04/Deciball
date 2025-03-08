import React, { useEffect, useRef } from "react";
import { Card, CardContent } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { Play } from "lucide-react";
//@ts-ignore
import YouTubePlayer from "youtube-player";
import Image from "next/image";

type Props = {
    playVideo : boolean;
    currentVideo : Video | null;
    playNextLoader : boolean;
    playNext : () => void;
}


export default function NowPlaying({
    playVideo,
    currentVideo,
    playNext,
    playNextLoader,
}: Props) {

    const videoPlayRef = useRef<HTMLDivElement | null>(null);

    useEffect(() =>{
        if (!videoPlayRef.current || !currentVideo){
            return
        }
        let player = YouTubePlayer(videoPlayRef.current)


        player.loadVideoById(currentVideo.extractedId)

        player.playVideo()

        function eventHandler(event : any) {
            console.log(event)
            console.log(event.data)
            if(event.data === 0) {
                playNext()
            }
        }

        player.on("stateChange" , eventHandler)

        return () => {
            player.destroy()
        }
    } , [currentVideo , videoPlayRef])

    return (
        <div className="space-y-4">
        <h2 className="text-2xl font-bold">Now Playing</h2>
        <Card>
          <CardContent className="p-4">
            {currentVideo ? (
              <div>
                {playVideo ? (
                  <>
                    {/* @ts-ignore */}
                    <div ref={videoPlayerRef} className="w-full" />
                  </>
                ) : (
                  <>
                    <Image
                      height={288}
                      width={288}
                      alt={currentVideo.bigImg}
                      src={currentVideo.bigImg}
                      className="h-72 w-full rounded object-cover"
                    />
                    <p className="mt-2 text-center font-semibold">
                      {currentVideo.title}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <p className="py-8 text-center">No video playing</p>
            )}
          </CardContent>
        </Card>
        {playVideo && (
          <Button disabled={playNextLoader} onClick={playNext} className="w-full">
            <Play className="mr-2 h-4 w-4" />{" "}
            {playNextLoader ? "Loading..." : "Play next"}
          </Button>
        )}
      </div>
    )
}