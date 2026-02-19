import { useUserStore } from "@/store/userStore";
import { searchResults } from "@/types";
import axios from "axios";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

function useAddSong() {
  const { queue, ws, emitMessage } = useUserStore();
  
  const queuedSongIds = useMemo(() => {
    return new Set(queue?.map((song) => song.id) || []);
  }, [queue]);

  const addSong = useCallback(
    async (
      selectedSongs: searchResults[],
      spaceId?: string | null,
      check: boolean = true
    ) => {
      if (!spaceId) return;
      if (!selectedSongs.length) {
        toast.info("No songs selected to add.");
        return;
      }

      let songsToAdd = selectedSongs;
      if (check) {
        const uniqueSongs = selectedSongs.filter(
          (song) => !queuedSongIds.has(song.id)
        );
        
        if (uniqueSongs.length === 0) {
          toast.info("No new songs to add.");
          return;
        }
        
        songsToAdd = uniqueSongs;
      }

      const toastId = "adding-songs";
      
      try {
        toast.loading("Adding songs to queue", { id: toastId });
        
        const apiUrl = `${process.env.SOCKET_URI}/api/add?room=${spaceId}`;
        const response = await axios.post(apiUrl, songsToAdd);
        
        if (response.data.success) {
          emitMessage("update", "update");
          
          const songText = selectedSongs.length === 1 ? "Song" : "Songs";
          const destination = check ? "queue" : spaceId;
          toast.success(`${songText} added to ${destination}`, { id: toastId });
          
          if (!check) {
            emitMessage("event", { spaceId });
          }
        } else {
          toast.error("Failed to add songs", { id: toastId });
        }
      } catch (error) {
        console.error("Error adding songs:", error);
        toast.error("Error adding songs to queue", { id: toastId });
      }
    },
    [queue, emitMessage, queuedSongIds]
  );

  return { addSong };
}

export default useAddSong;