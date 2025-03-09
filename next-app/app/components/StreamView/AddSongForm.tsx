"use client"
import { useSocket } from "@/context/socket-context";
import { useSession } from "next-auth/react";
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Card, CardContent } from "@/app/components/ui/card"
import LiteYouTubeEmbed from "react-lite-youtube-embed";

 const YT_REGEX =
  /^(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com\/(?:watch\?(?!.*\blist=)(?:.*&)?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[?&]\S+)?$/;


type Props = {
    inputLink : string;
    creatorId : string;
    userId : string;
    setLoading : (value : boolean) => void;
    setInputLink : (value : string) => void;
    loading : boolean;
    enqueueToast : (type : "error" | "success" , message : string) => void;
    spaceId : string,
    isSpectator : boolean
}



export default function AddSongForm({
    inputLink,
    enqueueToast,
    setInputLink,
    loading,
    setLoading,
    userId,
    spaceId,
    isSpectator
} : Props){

        const {sendMessage} = useSocket();
        const user = useSession().data?.user;
        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
            if (inputLink.match(YT_REGEX)) {
              setLoading(true);
              
              sendMessage("add-to-queue", {
                spaceId,
                userId,
                url: inputLink,
              });
            } else {
              enqueueToast("error", "Invalid please use specified format");
            }
            setLoading(false);
            setInputLink("");
          };
          const handlePlay = async (e: React.FormEvent) => {
            e.preventDefault();
        
            if (!inputLink.match(YT_REGEX)) {
              enqueueToast("error", "Invalid please use specified formate");
            }
            try{
              setLoading(true);
    
              enqueueToast("success", `Payment successful`);
              sendMessage("next-play", {
                spaceId,
                userId: user?.id,
                url:inputLink
              });
            }
            catch(error){
              enqueueToast("error", `Payment unsuccessful`);
            }
            setLoading(false);
        
          };
        

          const videoId = inputLink ? inputLink.match(YT_REGEX)?.[1] : undefined;

          return (
            <>
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold">Add a song</h1>
            </div>
      
            <form onSubmit={handleSubmit} className="space-y-2">
              <Input
                type="text"
                placeholder="Please paste your link"
                value={inputLink}
                onChange={(e) => setInputLink(e.target.value)}
              />
              <Button
                disabled={loading}
                onClick={handleSubmit}
                type="submit"
                className="w-full"
              >
                {loading ? "Loading..." : "Add to Queue"}
              </Button>
              
              { isSpectator && 
                <Button
                  disabled={loading}
                  onClick={handlePlay}
                  type="submit"
                  className="w-full"
                >
                  {loading ? "Loading..." : "Play"}
                </Button>
              }
              
            </form>
      
            {videoId && !loading && (
              <Card>
                <CardContent className="p-4">
                  <LiteYouTubeEmbed title="" id={videoId} />
                </CardContent>
              </Card>
            )}
          </>
          )


}