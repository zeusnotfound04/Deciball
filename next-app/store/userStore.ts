import { createWebSocket } from "@/app/socket";
import { generateSpaceId } from "@/lib/utils";
import { listener, searchResults, User } from "@/types";
import { create  } from "zustand";
import { persist , createJSONStorage  } from "zustand/middleware";

interface UserStoreState {
  queue: searchResults[];
  spaceId: string;
  user: User | null;
  listener: listener | null;
  upNextSongs: searchResults[];
  showVideo: boolean | null;
  isChatOpen: boolean;
  showDragOptions: boolean;
  showAddDragOptions: boolean;
  seen: boolean;
  isAdminOnline: boolean;
  socketRef: WebSocket | null;

  setQueue: (queue: searchResults[]) => void;
  setSpaceId: (spaceId: string) => void;
  setUser: (user: User | null) => void;
  setListener: (listener: listener | null) => void;
  setUpNextSongs: (songs: searchResults[]) => void;
  setShowVideo: (show: boolean | null) => void;
  setIsChatOpen: (open: boolean) => void;
  setShowDragOptions: (show: boolean) => void;
  setShowAddDragOptions: (show: boolean) => void;
  setSeen: (seen: boolean) => void;
  emitMessage: (event: string, message: any) => void;
}

export const useUserStore = create<UserStoreState>()(
  persist(
    (set, get) => ({
      queue: [],
      spaceId:
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("space") || generateSpaceId()
          : "",
      user: null,
      listener: null,
      upNextSongs: [],
      showVideo: (() => {
        if (typeof window === "undefined") return null;
        try {
          return JSON.parse(localStorage.getItem("v") || "null");
        } catch (error) {
          console.error("Error parsing localStorage 'v':", error);
          return null;
        }
      })(),
      isChatOpen: false,
      showDragOptions: false,
      showAddDragOptions: false,
      seen: true,
      isAdminOnline: true,
      socketRef: createWebSocket(),


      setQueue: (queue) => set({ queue }),
      setSpaceId: (spaceId) => set({ spaceId }),
      setUser: (user) => set({ user }),
      setListener: (listener) => set({ listener }),
      setUpNextSongs: (songs) => set({ upNextSongs: songs }),
      setShowVideo: (show) => set({ showVideo: show }),
      setIsChatOpen: (open) => set({ isChatOpen: open }),
      setShowDragOptions: (show) => set({ showDragOptions: show }),
      setShowAddDragOptions: (show) => set({ showAddDragOptions: show }),
      setSeen: (seen) => set({ seen }),

      emitMessage: (event, message) => {
        const socket = get().socketRef;
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ event, message }));
        } else {
          console.error("WebSocket is not connected.");
        }
      },
    }),
    { name: "user-store", storage: createJSONStorage(() => localStorage) }
  )
);
