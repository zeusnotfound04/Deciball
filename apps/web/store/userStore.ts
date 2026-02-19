import { generateSpaceId } from "@/lib/utils";
import { User } from "@/types";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface UserStoreState {
  spaceId: string;
  user: User | null;
  isAdmin: boolean;

  setIsAdmin: (isAdmin: boolean) => void;
  setSpaceId: (spaceId: string) => void;
  setUser: (user: User | null) => void;
}

export const useUserStore = create<UserStoreState>()(
  persist(
    (set, get) => ({
      spaceId:
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("space") || generateSpaceId()
          : "",
      user: null,
      isAdmin: false, // Initialize admin status

      setSpaceId: (spaceId) => set({ spaceId }),
      setUser: (user) => set({ user }),
      setIsAdmin: (isAdmin) => set({ isAdmin }), // Add setIsAdmin function
    }),
    {
      name: "user-store",
      storage:
        typeof window !== "undefined"
          ? createJSONStorage(() => localStorage)
          : undefined,
      partialize: (state) => ({
        spaceId: state.spaceId,
        user: state.user,
        isAdmin: state.isAdmin, 
      }),
    }
  )
);

// Note: WebSocket management is now handled by SocketContext
// Admin status can be determined from user permissions or server response
