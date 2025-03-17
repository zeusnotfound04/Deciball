// Modified userStore implementation
import { createWebSocket } from "@/app/socket";
import { generateSpaceId } from "@/lib/utils";
import { listener, searchResults, User } from "@/types";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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
  ws: WebSocket | null;

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
  setAdminOnline: (online: boolean) => void;
  connectWebSocket: () => void;
  emitMessage: (event: string, message: any) => void;
  emitProgress: (currentTime: number) => void;
  emitAnalytics: (type: string) => void;
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
      ws: null,

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
      setAdminOnline: (online) => set({ isAdminOnline: online }),
      
      connectWebSocket: () => {
        // Close existing connection if any
        const currentWs = get().ws;
        if (currentWs) {
          currentWs.close();
        }
        
        // Create new WebSocket
        const ws = createWebSocket();
        
        // Set up event handlers
        ws.onopen = () => {
          console.log("WebSocket connected");
        };
        
        ws.onclose = () => {
          console.log("WebSocket disconnected");
          // Optional: reconnect logic
          setTimeout(() => get().connectWebSocket(), 3000);
        };
        
        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
        };
        
        set({ ws });
      },
      
      emitMessage: (event, message) => {
        const ws = get().ws;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ event, message }));
        } else {
          console.error("WebSocket is not connected.");
        }
      },
      
      emitProgress: (currentTime) => {
        const ws = get().ws;
        const isAdminOnline = get().isAdminOnline;
        
        if (isAdminOnline && ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ 
            type: "progress", 
            data: currentTime 
          }));
        }
      },
      
      emitAnalytics: (type) => {
        const ws = get().ws;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ 
            type: "analytics", 
            data: { type }
          }));
        }
      }
    }),
    { 
      name: "user-store", 
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Exclude WebSocket from being persisted
        ...state,
        ws: null
      }),
    }
  )
);