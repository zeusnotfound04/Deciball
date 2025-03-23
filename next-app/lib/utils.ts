import { searchResults } from "@/types";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}




export function generateSpaceId(length = 8) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let roomId = "";
  for (let i = 0; i < length; i++) {
    roomId += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return roomId;
}



export default function getURL(currentSong: searchResults) {
  const currentSongUrl =
    currentSong?.downloadUrl[currentSong.downloadUrl.length - 1]?.url;
  const currentVideoUrl = currentSongUrl?.startsWith("http")
    ? currentSongUrl
    : `${process.env.STREAM_URL}/${currentSongUrl}` ||
      "https://fzrikj5pca.ufs.sh/f/5YNrqr2QLJnxupp8GI0qKT58dI3l4qaoDABLFybZUQJitNgR";

  return currentVideoUrl;
}

export function getBackgroundURL(currentSong: searchResults) {
  const currentSongUrl =
    currentSong?.downloadUrl[currentSong.downloadUrl.length - 1]?.url;
  const currentVideoUrl = currentSongUrl?.startsWith("http")
    ? currentSongUrl
    : `${
        window.navigator.userAgent.includes("Electron")
          ? "http://localhost:7777/stream"
          : process.env.BACKGROUND_STREAM_URI
      }/${currentSongUrl}` ||
      "https://fzrikj5pca.ufs.sh/f/5YNrqr2QLJnxupp8GI0qKT58dI3l4qaoDABLFybZUQJitNgR";

  return currentVideoUrl;
}