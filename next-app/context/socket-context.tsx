import { useSession } from "next-auth/react";
import { createContext, Dispatch, SetStateAction, PropsWithChildren, useState, useEffect, useContext, useCallback } from "react";

type SocketContextType = {
  socket: WebSocket | null;
  user: { id: string; token?: string } | null;
  connectionError: boolean;
  setUser: Dispatch<SetStateAction<{ id: string; token?: string } | null>>;
  loading: boolean;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  user: null,
  connectionError: false,
  setUser: () => {},
  loading: true,
});

export const SocketContextProvider = ({ children }: PropsWithChildren) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [user, setUser] = useState<{ id: string; token?: string } | null>(null);
  const [connectionError, setConnectionError] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const session = useSession();

  useEffect(() => {
    console.log("Triggering the useEffect inside the context")
    if (!session.data?.user.id) return; // Ensure session is available before connecting

    const ws = new WebSocket(process.env.NEXT_PUBLIC_WSS_URL as string);
    console.log("WebSocket URL:", process.env.NEXT_PUBLIC_WSS_URL);


    ws.onopen = () => {
      console.log("WebSocket Connected");
      setSocket(ws);
      setUser(session.data?.user || null);
      setLoading(false);
      setConnectionError(false);
    };

    ws.onclose = () => {
      console.log("WebSocket Disconnected, attempting to reconnect...");
      setSocket(null);
      setTimeout(() => {
        setSocket(new WebSocket(process.env.NEXT_PUBLIC_WSS_URL as string));
      }, 5000);
      setLoading(false);
    };

    ws.onerror = (error) => {
      console.error("WebSocket Error:", error);
      setSocket(null);
      setConnectionError(true);
      setLoading(false);
    };

    return () => {
      console.log("Cleaning up WebSocket...");
      ws.close();
    };
  }, [session.data?.user.id]); // Removed `socket` from dependencies to avoid infinite loops

  return (
    <SocketContext.Provider value={{ socket, user, connectionError, setUser, loading }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const { socket, user, setUser, connectionError, loading } = useContext(SocketContext);
  console.log("Logging the Socket form the context", socket)

  const sendMessage = useCallback(
    (type: string, data: { [key: string]: any }) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.warn("WebSocket is not connected.");
        return;
      }
      socket.send(
        JSON.stringify({
          type,
          data: {
            ...data,
            token: user?.token,
          },
        })
      );
    },
    [socket, user]
  );

  return { socket, loading, setUser, sendMessage, user, connectionError };
};
