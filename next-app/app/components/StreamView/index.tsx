"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";

import { useSocket } from "@/context/socket-context";
import { useSession } from "next-auth/react";
import NowPlaying from "./NowPlaying";
import Queue from "./Queue";
import AddSongForm from "./AddSongForm";
import { Appbar } from "../Appbar";


import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";
import axios from "axios";

export default function StreamView({
    creatorId,
    playVideo = false ,
    spaceId ,
}: {
    creatorId : string;
    playVideo : boolean;
    spaceId : string;
}){

    const [inputLink , setInputLink ] = useState("")
    const [ queue , setQueue] = useState<Video []>([])
    const [ currentVideo , setCurrentVideo] = useState<Video| null>(null)
    const [loading , setLoading] = useState(false)
    const [playNextLoader , setPlayNextLoader] = useState(false)
    const [spaceName , setSpaceName] = useState("")   


    const {socket , sendMessage} = useSocket()

    const user = useSession().data?.user

    async function addToQueue(newStream:any) {
        setQueue((prev)=> [...prev ,newStream])
        setInputLink("")
        setLoading(false)
        
    }


  

    const enqueueToast = (type : "error" | "success" | "info" , message : string) => {
        if (type === "info") {
            toast(message, { duration: 3000 });
        } else {
            const toastFn = type === "error" ? toast.error: toast.success;
            toastFn(message, {
                duration : 5000,
            });
        }
    }
    useEffect(() => {
        if (socket) {
          socket.onmessage = async (event) => {
            const { type, data } = JSON.parse(event.data) || {};
            if (type === `new-stream/${spaceId}`) {
              console.log(type);
              addToQueue(data);
            } else if (type === `new-vote/${spaceId}`) {
              setQueue((prev) => {
                return prev
                  .map((v) => {
                    if (v.id === data.streamId) {
                      return {
                        ...v,
                        upvotes: v.upvotes + (data.vote === "upvote" ? 1 : -1),
                        haveUpvoted:
                          data.votedBy === user?.id
                            ? data.vote === "upvote"
                            : v.haveUpvoted,
                      };
                    }
                    return v;
                  })
                  .sort((a, b) => b.upvotes - a.upvotes);
              });
            } else if (type === "error") {
              enqueueToast("error", data.message);
              setLoading(false);
            } else if (type === `play-next/${spaceId}`) {
              await refreshStreams();
            } else if (type === `remove-song/${spaceId}`) {
              setQueue((prev) => {
                return prev.filter((stream) => stream.id !== data.streamId);
              });
            } else if (type === `empty-queue/${spaceId}`) {
              setQueue([]);
            }
          };
        }
      }, [socket]);
      
      // Listen for sync toast events
      useEffect(() => {
        const handleSyncToast = (event: CustomEvent) => {
          enqueueToast(event.detail.type || 'info', event.detail.message);
        };
        
        window.addEventListener('show-sync-toast', handleSyncToast as EventListener);
        return () => window.removeEventListener('show-sync-toast', handleSyncToast as EventListener);
      }, []);
    
      useEffect(() => {
        refreshStreams();
      }, []);
    

      async function refreshStreams() {
        try {
            const res = await axios.get(`/api/streams/?spaceId=${spaceId}`)
            const data = await res.data
            setQueue(
                data.streams.sort((a : any , b : any)=> (a.upvotes < b.upvotes ? 1 : -1)),
            )

            setCurrentVideo((video ) =>{
                if(video?.id === data.activeStream?.stream?.id ){
                    return video
                }
                return data.activeStream.stream
            })
            setSpaceName(data.spaceName)
        } catch (error) {
            console.error(error)
        enqueueToast("error", "Something went wrong");
            
        }

        setPlayNextLoader(false)
    }


    const playNext = async () => {
        setPlayNextLoader(true)
        sendMessage("play-next" , {
            spaceId,
            userId : user?.id
        })
    }

    return (
        <div className="flex min-h-screen flex-col">
        <Appbar isSpectator={!playVideo} />
        <div className="mx-auto rounded-lg p-2 bg-gradient-to-r from-indigo-600 to-violet-800 text-2xl font-bold">
          {spaceName}
        </div>
        <div className="flex justify-center">
          <div className="grid w-screen max-w-screen-xl grid-cols-1 gap-4 pt-8 md:grid-cols-5">
            <Queue
              creatorId={creatorId}
              isCreator={playVideo}
              queue={queue}
              userId={user?.id || ""}
              spaceId={spaceId}
            />
            <div className="col-span-2">
              <div className="mx-auto w-full max-w-4xl space-y-6 p-4">
                <AddSongForm
                  creatorId={creatorId}
                  userId={user?.id || ""}
                  enqueueToast={enqueueToast}
                  inputLink={inputLink}
                  loading={loading}
                  setInputLink={setInputLink}
                  setLoading={setLoading}
                  spaceId={spaceId}
                  isSpectator={!playVideo}
                />
                <NowPlaying
                  currentVideo={currentVideo}
                  playNext={playNext}
                  playNextLoader={playNextLoader}
                  playVideo={playVideo}
                />
              </div>
            </div>
          </div>
        </div>
        
      </div>
    )
}