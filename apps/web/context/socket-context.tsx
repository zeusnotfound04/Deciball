import { useSession } from "next-auth/react";
import { createContext, Dispatch, SetStateAction, PropsWithChildren, useState, useEffect, useContext, useCallback } from "react";

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
  user: { id: string; token?: string; email?: string; username?: string; name?: string } | null;
  connectionError: boolean;
  setUser: Dispatch<SetStateAction<{ id: string; token?: string; email?: string; username?: string; name?: string } | null>>;
  loading: boolean;
  sendMessage: (type: string, data: { [key: string]: any }) => boolean;
};

export const SocketContext = createContext<SocketContextType>({
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
      
      console.log("Socket state:", {
        socketExists: !!socket,
        readyState: socket?.readyState,
        readyStateText: socket?.readyState === WebSocket.OPEN ? 'OPEN' : 
                       socket?.readyState === WebSocket.CONNECTING ? 'CONNECTING' :
                       socket?.readyState === WebSocket.CLOSING ? 'CLOSING' :
                       socket?.readyState === WebSocket.CLOSED ? 'CLOSED' : 'UNKNOWN'
      });
      console.log("User info:", { 
        userExists: !!user,
        userId: user?.id,
        hasToken: !!user?.token 
      });
      
      if (!socket) {
        console.warn("WebSocket instance is null. Cannot send message.");
        setConnectionError(true);
        return false;
      }
      
      if (socket.readyState !== WebSocket.OPEN) {
        console.warn(`WebSocket is not open (state: ${socket.readyState}). Cannot send message.`);
        setConnectionError(true);
        return false;
      }
      
      if (!user?.id || !user?.token) {
        console.warn("User is not properly authenticated. Cannot send message.");
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
        
        socket.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error("Error sending WebSocket message:", error);
        setConnectionError(true);
        return false;
      }
    },
    [socket, user]
  );

  useEffect(() => {
    
    
    
    
    if (session.status === "loading" || !session.data?.user?.id) {
      
      return;
    }

    if (socket && socket.readyState === WebSocket.OPEN && user?.id === session.data.user.id) {
      
      return;
    }

    if (socket) {
      
      socket.close(1000, "Creating new connection");
      setSocket(null);
    }

    let isCleanedUp = false;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let connectionAttempts = 0;
    const maxRetries = 3;

    const connectWebSocket = async () => {
      if (isCleanedUp) {
        
        return;
      }

      connectionAttempts++;
      console.log(`Creating WebSocket connection (attempt ${connectionAttempts}/${maxRetries}) to:`, process.env.NEXT_PUBLIC_WSS_URL);

      if (!process.env.NEXT_PUBLIC_WSS_URL) {
        console.error("NEXT_PUBLIC_WSS_URL is not defined");
        setConnectionError(true);
        setLoading(false);
        return;
      }

      try {
        const ws = new WebSocket(process.env.NEXT_PUBLIC_WSS_URL as string);
        
        const connectionTimeout = setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            console.error("WebSocket connection timeout");
            ws.close();
          }
        }, 10000);

        ws.onopen = async () => {
          clearTimeout(connectionTimeout);
          
          if (isCleanedUp) {
            
            ws.close();
            return;
          }

          
          setSocket(ws);
          
          
          const wsToken = await getWebSocketToken();
          
          
          if (!wsToken) {
            console.error("Failed to get WebSocket token");
            setConnectionError(true);
            setLoading(false);
            return;
          }
          
          const userWithToken = {
            id: session.data.user.id,
            email: session.data.user.email,
            username: session.data.user.username,
            name: session.data.user.name,
            token: wsToken,
          };
          
          
          setUser(userWithToken);
          setLoading(false);
          setConnectionError(false);
          connectionAttempts = 0;
          
          
          
          // Add latency reporting event listener
          const handleLatencyReport = (event: CustomEvent) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: "latency-report",
                data: {
                  latency: event.detail.latency,
                  timestamp: Date.now()
                }
              }));
            }
          };
          
          window.addEventListener('report-latency', handleLatencyReport as EventListener);
          
          // Clean up event listener when WebSocket closes
          ws.addEventListener('close', () => {
            window.removeEventListener('report-latency', handleLatencyReport as EventListener);
          });
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            
            switch (message.type) {
              case "room-joined":
                
                break;
              case "user-update":
                
                break;
              case "current-song-update":
                
                if (message.data.song) {
                  window.dispatchEvent(new CustomEvent('current-song-update', {
                    detail: message.data
                  }));
                }
                break;
              case "queue-update":
                
                break;
              case "batch-processing-result":
                // Handle optimized batch processing results
                
                
                // Dispatch event for Search component to handle results
                window.dispatchEvent(new CustomEvent('batch-processing-result', {
                  detail: {
                    results: message.data.results,
                    summary: message.data.summary,
                    successful: message.data.successful,
                    failed: message.data.failed,
                    processingTime: message.data.processingTime
                  }
                }));
                
                // Show notification about batch results
                if (message.data.summary) {
                  const { successful, failed, total } = message.data.summary;
                  if (successful > 0) {
                    
                  }
                  if (failed > 0) {
                    console.warn(`⚠️ ${failed}/${total} tracks failed to process`);
                  }
                }
                break;
              case "processing-progress":
                // Handle real-time processing progress updates
                
                
                window.dispatchEvent(new CustomEvent('processing-progress', {
                  detail: {
                    current: message.data.current,
                    total: message.data.total,
                    percentage: message.data.percentage,
                    currentTrack: message.data.currentTrack,
                    status: message.data.status
                  }
                }));
                break;
              case "room-joined":
                
                if (message.data.playbackState) {
                  
                  
                  if (message.data.playbackState.currentSong) {
                    
                    
                    const currentSong = message.data.playbackState.currentSong;
                    const formattedSong = {
                      id: currentSong.id,
                      name: currentSong.title || currentSong.name,
                      artistes: {
                        primary: [{
                          id: 'unknown',
                          name: currentSong.artist || 'Youtube',
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
                    
                    window.dispatchEvent(new CustomEvent('room-sync-playback', {
                      detail: {
                        currentTime: message.data.playbackState.shouldStartAt || 0,
                        isPlaying: message.data.playbackState.isPlaying || false,
                        currentSong: formattedSong
                      }
                    }));
                  } else {
                    
                  }
                } else {
                  
                }
                break;
              case "playback-paused":
                
                window.dispatchEvent(new CustomEvent('playback-paused', {
                  detail: message.data
                }));
                break;
              case "playback-resumed":
                
                window.dispatchEvent(new CustomEvent('playback-resumed', {
                  detail: message.data
                }));
                break;
              case "playback-seeked":
                
                window.dispatchEvent(new CustomEvent('playback-seeked', {
                  detail: message.data
                }));
                break;
              case "playback-state-update":
                
                window.dispatchEvent(new CustomEvent('playback-state-update', {
                  detail: message.data
                }));
                break;
              case "error":
                console.error("WebSocket error received:", {
                  message: message.data?.message || 'Unknown server error',
                  code: message.data?.code,
                  details: message.data?.details,
                  timestamp: new Date().toISOString()
                });
                
                // Handle specific error types
                if (message.data?.message?.includes('unauthorized') || message.data?.message?.includes('Unauthorized')) {
                  console.error("Authentication error - attempting to refresh token");
                  setConnectionError(true);
                  // Don't reconnect immediately on auth errors
                  return;
                }
                break;
              default:
                
            }
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          
          setSocket(null);
          
          // Don't attempt reconnection for certain close codes
          const shouldNotReconnect = [
            1000, // Normal closure
            1002, // Protocol error 
            1003, // Unsupported data
            1011, // Server error
            4000, // Custom: Auth failure
            4001, // Custom: Invalid token
          ];
          
          if (!isCleanedUp && 
              !shouldNotReconnect.includes(event.code) && 
              connectionAttempts < maxRetries) {
            console.log(`Attempting to reconnect in ${3 * connectionAttempts} seconds... (${connectionAttempts}/${maxRetries})`);
            setConnectionError(true);
            reconnectTimer = setTimeout(() => {
              if (!isCleanedUp) {
                connectWebSocket();
              }
            }, 3000 * connectionAttempts); // Exponential backoff
          } else if (connectionAttempts >= maxRetries) {
            console.error("Max reconnection attempts reached");
            setConnectionError(true);
            setLoading(false);
          } else {
            
            setLoading(false);
          }
        };

        ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error("WebSocket Error:", {
            type: error.type,
            target: (error.target as WebSocket)?.url || 'Unknown URL',
            readyState: (error.target as WebSocket)?.readyState,
            timestamp: new Date().toISOString()
          });
          setConnectionError(true);
          
          // Don't attempt reconnection if it's a persistent connection error
          if (connectionAttempts >= 2) {
            console.error("Multiple connection failures detected, stopping reconnection attempts");
            setLoading(false);
            isCleanedUp = true;
          }
        };

      } catch (error) {
        console.error("Error creating WebSocket:", error);
        setConnectionError(true);
        setLoading(false);
      }
    };

    setLoading(true);
    setConnectionError(false);

    connectWebSocket();

    return () => {
      
      isCleanedUp = true;
      
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      
      if (socket) {
        
        socket.close(1000, "Component unmounting");
      }
      
      setSocket(null);
      setUser(null);
      setConnectionError(false);
      setLoading(false);
    };
  }, [session.status, session.data?.user?.id]);

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
