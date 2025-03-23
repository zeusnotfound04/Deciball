import { searchResults } from "@/types";
import { useCallback, useState } from "react";
import { toast } from "sonner";

function useSelect() {
  const [selectedSongs, setSelectedSongs] = useState<searchResults[]>([]);

  const handleSelect = useCallback(
    async (song: searchResults, limit: boolean) => {
      if (!song) return;

      setSelectedSongs((prevSelectedSongs) => {
        const songIndex = prevSelectedSongs.indexOf(song);


        if (songIndex !== -1) {
          return prevSelectedSongs.filter((s) => s !== song);
        }

        if (prevSelectedSongs.length >= 5 && limit) {
          toast.error("Limit reached, only 5 songs can be selected at a time");
          return prevSelectedSongs;
        }

        return [song, ...prevSelectedSongs];
      });
    },
    []
  );

  return { handleSelect, selectedSongs };
}

export default useSelect;
