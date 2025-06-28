import { useSession } from "next-auth/react";
import { createContext, Dispatch, SetStateAction, PropsWithChildren, useState, useEffect, useContext, useCallback } from "react";

// Helper function to get WebSocket token
const getWebSocketToken = async (): Promise<string | null> => {
  try {
    const response = await fetch('/api/auth/ws-token');
    const data = await response.json();
    
    if (data.success) {
      return data.token;
    } else {
      console.error('Failed to get WebSocket token:', data.message);
      return null;
    }
  } catch (error) {
    console.error("Error getting WebSocket token:", error);
    return null;
  }
};

type SocketContextType = {
  socket: WebSocket | null;
  user: { id: string; token?: string; email?: string; username?: string } | null;
  connectionError: boolean;
  setUser: Dispatch<SetStateAction<{ id: string; token?: string; email?: string; username?: string } | null>>;
  loading: boolean;
  sendMessage: (type: string, data: { [key: string]: any }) => boolean;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  user: null,
  connectionError: false,
  setUser: () => {},
  loading: true,
  sendMessage: () => false,
});

export const SocketContextProvider = ({ children }: PropsWithChildren) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [user, setUser] = useState<{ id: string; token?: string; email?: string; username?: string } | null>(null);
  const [connectionError, setConnectionError] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const session = useSession();

  const sendMessage = useCallback(
    (type: string, data: { [key: string]: any }) => {
      console.log("🔌 WebSocket sendMessage called:", { type, data });
      console.log("📡 Socket state:", {
        socketExists: !!socket,
        readyState: socket?.readyState,
        readyStateText: socket?.readyState === WebSocket.OPEN ? 'OPEN' : 
                       socket?.readyState === WebSocket.CONNECTING ? 'CONNECTING' :
                       socket?.readyState === WebSocket.CLOSING ? 'CLOSING' :
                       socket?.readyState === WebSocket.CLOSED ? 'CLOSED' : 'UNKNOWN'
      });
      console.log("👤 User info:", { 
        userExists: !!user,
        userId: user?.id,
        hasToken: !!user?.token 
      });
      
      if (!socket) {
        console.warn("⚠️ WebSocket instance is null. Cannot send message.");
        setConnectionError(true);
        return false;
      }
      
      if (socket.readyState !== WebSocket.OPEN) {
        console.warn(`⚠️ WebSocket is not open (state: ${socket.readyState}). Cannot send message.`);
        setConnectionError(true);
        return false;
      }
      
      if (!user?.id || !user?.token) {
        console.warn("⚠️ User is not properly authenticated. Cannot send message.");
        return false;
      }
      
      const message = {
        type,
        data: {
          ...data,
          userId: user.id,
          token: user.token,
        },
      };
      
      try {
        console.log("📤 Sending WebSocket message:", message);
        socket.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error("💥 Error sending WebSocket message:", error);
        setConnectionError(true);
        return false;
      }
    },
    [socket, user]
  );

  useEffect(() => {
    console.log("🔄 Socket context useEffect triggered");
    console.log("📊 Session status:", session.status);
    console.log("👤 Session data:", session.data);
    
    // Don't connect if session is still loading or user is not authenticated
    if (session.status === "loading" || !session.data?.user?.id) {
      console.log("⏳ Session not ready, skipping WebSocket connection");
      return;
    }

    // Prevent duplicate connections - check if we already have a working connection
    if (socket && socket.readyState === WebSocket.OPEN && user?.id === session.data.user.id) {
      console.log("✅ WebSocket already connected for this user, skipping");
      return;
    }

    // Cleanup any existing socket first
    if (socket) {
      console.log("🧹 Closing existing WebSocket connection");
      socket.close(1000, "Creating new connection");
      setSocket(null);
    }

    let isCleanedUp = false;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let connectionAttempts = 0;
    const maxRetries = 3;

    const connectWebSocket = async () => {
      if (isCleanedUp) {
        console.log("🚫 Connection attempt cancelled - component cleaned up");
        return;
      }

      connectionAttempts++;
      console.log(`🔌 Creating WebSocket connection (attempt ${connectionAttempts}/${maxRetries}) to:`, process.env.NEXT_PUBLIC_WSS_URL);

      try {
        const ws = new WebSocket(process.env.NEXT_PUBLIC_WSS_URL as string);
        
        // Set a connection timeout
        const connectionTimeout = setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            console.error("⏰ WebSocket connection timeout");
            ws.close();
          }
        }, 10000); // 10 second timeout

        ws.onopen = async () => {
          clearTimeout(connectionTimeout);
          
          if (isCleanedUp) {
            console.log("🚫 Connection opened but component was cleaned up");
            ws.close();
            return;
          }

          console.log("✅ WebSocket Connected successfully");
          setSocket(ws);
          
          // Get WebSocket authentication token
          const wsToken = await getWebSocketToken();
          console.log("🔑 WebSocket token:", wsToken ? "Present" : "Missing");
          
          if (!wsToken) {
            console.error("❌ Failed to get WebSocket token");
            setConnectionError(true);
            setLoading(false);
            return;
          }
          
          // Create user object with proper token
          const userWithToken = {
            id: session.data.user.id,
            email: session.data.user.email,
            username: session.data.user.username,
            token: wsToken,
          };
          
          console.log("👤 Setting user:", { ...userWithToken, token: "***" }); // Hide token in logs
          setUser(userWithToken);
          setLoading(false);
          setConnectionError(false);
          connectionAttempts = 0; // Reset on successful connection
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log("📨 WebSocket message received:", message);
            
            // Handle specific message types
            switch (message.type) {
              case "room-joined":
                console.log("🏠 Successfully joined room:", message.data);
                break;
              case "user-update":
                console.log("👥 User update received:", message.data);
                break;
              case "current-song-update":
                console.log("🎶 Current song update received:", message.data);
                // Broadcast current song update to the application
                if (message.data.song) {
                  window.dispatchEvent(new CustomEvent('current-song-update', {
                    detail: message.data
                  }));
                }
                break;
              case "queue-update":
                console.log("🎵 Queue update received:", message.data);
                // This is handled by QueueManager, just log it here
                break;
              case "room-joined":
                console.log("🏠 Room joined event received:", message.data);
                // Handle playback synchronization for new joiners
                if (message.data.playbackState) {
                  console.log("🎵 Room has active playback state:", message.data.playbackState);
                  
                  // Check if there's a current song and it's playing
                  if (message.data.playbackState.currentSong) {
                    console.log("🎵 Current song found, syncing playback at:", message.data.playbackState.shouldStartAt, "seconds");
                    
                    // Format the current song for the audio store
                    const currentSong = message.data.playbackState.currentSong;
                    const formattedSong = {
                      id: currentSong.id,
                      name: currentSong.title || currentSong.name,
                      artistes: {
                        primary: [{
                          id: 'unknown',
                          name: currentSong.artist || 'Unknown Artist',
                          role: 'primary_artist',
                          image: [],
                          type: 'artist',
                          url: ''
                        }]
                      },
                      image: [
                        { quality: 'high', url: currentSong.bigImg || currentSong.smallImg || '' },
                        { quality: 'medium', url: currentSong.smallImg || currentSong.bigImg || '' }
                      ],
                      downloadUrl: [{
                        quality: 'auto',
                        url: currentSong.youtubeId || currentSong.url || ''
                      }],
                      url: currentSong.url || '',
                      addedBy: currentSong.addedByUser?.username || 'Unknown',
                      voteCount: currentSong.voteCount || 0,
                      isVoted: false,
                      source: currentSong.type === 'Youtube' ? 'youtube' : 'spotify'
                    };
                    
                    // Dispatch to audio store for synchronization
                    window.dispatchEvent(new CustomEvent('room-sync-playback', {
                      detail: {
                        currentTime: message.data.playbackState.shouldStartAt || 0,
                        isPlaying: message.data.playbackState.isPlaying || false,
                        currentSong: formattedSong
                      }
                    }));
                  } else {
                    console.log("🎵 No current song in playback state");
                  }
                } else {
                  console.log("🎵 No playback state in room-joined event");
                }
                break;
              case "playback-paused":
                console.log("⏸️ Playback paused event received:", message.data);
                window.dispatchEvent(new CustomEvent('playback-paused', {
                  detail: message.data
                }));
                break;
              case "playback-resumed":
                console.log("▶️ Playback resumed event received:", message.data);
                window.dispatchEvent(new CustomEvent('playback-resumed', {
                  detail: message.data
                }));
                break;
              case "playback-seeked":
                console.log("⏩ Playback seeked event received:", message.data);
                window.dispatchEvent(new CustomEvent('playback-seeked', {
                  detail: message.data
                }));
                break;
              case "playback-state-update":
                console.log("🔄 Playback state update received:", message.data);
                window.dispatchEvent(new CustomEvent('playback-state-update', {
                  detail: message.data
                }));
                break;
              case "error":
                console.error("❌ WebSocket error received:", message.data);
                console.error("Error message:", message.data?.message || 'Unknown error');
                break;
              default:
                console.log("❓ Unhandled message type:", message.type);
            }
          } catch (error) {
            console.error("💥 Error parsing WebSocket message:", error);
          }
        };

        ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          console.log(`🔌 WebSocket Disconnected. Code: ${event.code}, Reason: ${event.reason}`);
          setSocket(null);
          
          // Only attempt reconnection if not cleaned up, not a normal closure, and haven't exceeded retries
          if (!isCleanedUp && event.code !== 1000 && connectionAttempts < maxRetries) {
            console.log(`🔄 Attempting to reconnect in 3 seconds... (${connectionAttempts}/${maxRetries})`);
            setConnectionError(true);
            reconnectTimer = setTimeout(() => {
              if (!isCleanedUp) {
                connectWebSocket();
              }
            }, 3000);
          } else if (connectionAttempts >= maxRetries) {
            console.error("❌ Max reconnection attempts reached");
            setConnectionError(true);
            setLoading(false);
          }
        };

        ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error("💥 WebSocket Error:", error);
          setConnectionError(true);
          
          // Don't set loading to false here - let onclose handle reconnection
        };

      } catch (error) {
        console.error("💥 Error creating WebSocket:", error);
        setConnectionError(true);
        setLoading(false);
      }
    };

    // Reset states before connecting
    setLoading(true);
    setConnectionError(false);

    // Initial connection
    connectWebSocket();

    return () => {
      console.log("🧹 Cleaning up WebSocket context...");
      isCleanedUp = true;
      
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      
      if (socket) {
        console.log("🔌 Closing WebSocket connection");
        socket.close(1000, "Component unmounting");
      }
      
      setSocket(null);
      setUser(null);
      setConnectionError(false);
      setLoading(false);
    };
  }, [session.status, session.data?.user?.id]); // Depend on session status and user ID

  return (
    <SocketContext.Provider value={{ socket, user, connectionError, setUser, loading, sendMessage }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  console.log("Logging the Socket from the context", context.socket)
  
  if (!context) {
    throw new Error('useSocket must be used within a SocketContextProvider');
  }

  return context;
};
