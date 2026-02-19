import getURL, { getBackgroundURL } from "@/lib/utils";
import { useAudio } from "@/store/audioStore";
import { useUserStore } from "@/store/userStore";
import { useCallback, useEffect, useMemo } from "react";



const cacheVideo = async (url : string, id  : string) => {
    const dbName = "video-cache";
    const storeName = "videos";
    return new Promise((resolve , reject)=> {
        const request = indexedDB.open(dbName , 1)

        request.onupgradeneeded = (event : IDBVersionChangeEvent) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName)
            }
        }

        request.onsuccess = (event : Event) => {
            const db = (event.target as IDBOpenDBRequest).result
            const transaction = db.transaction(storeName, "readwrite")
            const store = transaction.objectStore(storeName)

            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                if (getRequest.result) {

                    const cachedBlob = getRequest.result as Blob;
                    resolve(URL.createObjectURL(cachedBlob))    
                } else {
                    fetch(url).then((res) => res.blob()).then((blob) => {
                        const putRequest = store.put(blob , id)
                        putRequest.onsuccess = ()=> resolve(URL.createObjectURL(blob));
                        putRequest.onerror = ()=> reject(new Error("Failed to cache Video"))
                    }).catch(reject)
                }
        
            }
             
            getRequest.onerror = ()=> reject(new Error("Failed to get video from cache"))
        
        }

        request.onerror = () => reject(new Error("Failed to Open IndexDB"))
        
    } )
}



function useCache() {
    const { currentSong, videoRef, backgroundVideoRef } = useAudio();
    const { showVideo } = useUserStore();
  
    const { currentVideoUrl, backgroundVideoUrl } = useMemo(() => {
      if (!currentSong) return { currentVideoUrl: null, backgroundVideoUrl: null };
      return {
        currentVideoUrl: getURL(currentSong),
        backgroundVideoUrl: getBackgroundURL(currentSong)
      };
    }, [currentSong]);
  
    const loadVideos = useCallback(async () => {
      if (!currentSong || currentSong.source !== "youtube") return;
  
      if (currentVideoUrl && videoRef?.current) {
        const cachedCurrentSongUrl = await cacheVideo(currentVideoUrl, currentSong.id);
        if (videoRef.current.src !== cachedCurrentSongUrl) {
          videoRef.current.src == cachedCurrentSongUrl;
        }
      }
  
      if (backgroundVideoUrl && backgroundVideoRef?.current) {
        const cachedBgSongUrl   = await cacheVideo(backgroundVideoUrl, `${currentSong.id}-bg`);
        if (backgroundVideoRef.current.src !== cachedBgSongUrl) {
          backgroundVideoRef.current.src == cachedBgSongUrl;
        }
      }
    }, [currentVideoUrl, backgroundVideoUrl, videoRef, backgroundVideoRef, currentSong]);
  
    useEffect(() => {
      loadVideos();
    }, [loadVideos, showVideo]);
  
    return;
  }

  export default useCache;