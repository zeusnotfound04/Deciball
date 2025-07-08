'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSocket } from '@/context/socket-context';
import { useUserStore } from '@/store/userStore';
import { useAudio } from '@/store/audioStore';
import { QueueManager } from './QueueManager';
import { Player } from './Player';
import SearchSongPopup from '@/app/components/Search';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Users, Music, Settings, VolumeX, Volume2, Play, Pause } from 'lucide-react';
import ListenerSidebar from '@/app/components/ListenerSidebar';
import { SidebarProvider } from '@/app/components/ui/sidebar';


interface MusicRoomProps {
  spaceId: string;
}

export const MusicRoom: React.FC<MusicRoomProps> = ({ spaceId }) => {
  const { data: session } = useSession();
  const { user, setUser } = useUserStore();
  const { 
    isPlaying, 
    currentSong, 
    isMuted, 
    volume,
    togglePlayPause, 
    mute, 
    unmute, 
    setVolume,
    setupSpotifyPlayer,
    setCurrentSpaceId  // Add spaceId setter to the audio store
  } = useAudio();
  const { sendMessage, socket, loading, connectionError } = useSocket();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState(0);
  const [roomName, setRoomName] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showQueue, setShowQueue] = useState(true);
  const [showPlayer, setShowPlayer] = useState(true);
  const [userDetails, setUserDetails] = useState<any[]>([]);
  const [spaceInfo, setSpaceInfo] = useState<{ spaceName: string; hostId: string } | null>(null);

  // Debug effect to track userDetails changes
  useEffect(() => {
    console.log('🔄 UserDetails state changed:', userDetails);
    console.log('🔄 UserDetails length:', userDetails.length);
  }, [userDetails]);

  useEffect(() => {
    if (session?.user && !user) {
      setUser({
        id: session.user.id,
        email: session.user.email || '',
        name: (session.user as any).name || session.user.username || '',
        username: session.user.username || '',
        imageUrl: (session.user as any).image || '',
        role: (session.user as any).role || 'listener',
        token: (session.user as any).token || '',
        isBookmarked: '',
        spotifyAccessToken: (session.user as any).spotifyAccessToken,
        spotifyRefreshToken: (session.user as any).spotifyRefreshToken
      });
    }
  }, [session, user, setUser]);

  // Set spaceId in audio store when component mounts
  useEffect(() => {
    if (spaceId) {
      console.log("[MusicRoom] Setting spaceId in audio store:", spaceId);
      setCurrentSpaceId(spaceId);
    }
  }, [spaceId, setCurrentSpaceId]);

  // Fetch space information when component mounts
  useEffect(() => {
    const fetchSpaceInfo = async () => {
      try {
        const response = await fetch(`/api/spaces?spaceId=${spaceId}`);
        const data = await response.json();
        
        if (data.success) {
          setSpaceInfo({
            spaceName: data.spaceName || `Room ${spaceId.slice(0, 8)}`,
            hostId: data.hostId
          });
          setRoomName(data.spaceName || `Room ${spaceId.slice(0, 8)}`);
        } else {
          console.error('Failed to fetch space info:', data.message);
          // Set fallback room name
          setRoomName(`Room ${spaceId.slice(0, 8)}`);
        }
      } catch (error) {
        console.error('Error fetching space info:', error);
        // Set fallback room name
        setRoomName(`Room ${spaceId.slice(0, 8)}`);
      }
    };

    if (spaceId) {
      fetchSpaceInfo();
    }
  }, [spaceId]);

  const handleBatchAddToQueue = async (tracks: any[]) => {
    console.log('🎵 Batch add completed by Search component:', { 
      tracksCount: tracks.length, 
      trackNames: tracks.map(t => t.name)
    });
  };

  useEffect(() => {
    if (!socket || !user) return;

    const handleMessage = (event: MessageEvent) => {
      const { type, data } = JSON.parse(event.data);
      console.log('MusicRoom received message:', type, data);
      
      switch (type) {
        case 'room-info':
          setIsAdmin(data.isAdmin || false);
          setConnectedUsers(data.userCount || 0);
          setRoomName(data.roomName || `Room ${spaceId.slice(0, 8)}`);
          console.log('Room info updated:', { isAdmin: data.isAdmin, userCount: data.userCount });
          break;
        case 'room-joined':
          console.log('✅ Successfully joined room:', data);
          console.log('   - SpaceId:', data.spaceId);
          console.log('   - UserId:', data.userId);
          console.log('   - Message:', data.message);
          break;
        case 'user-update':
          setConnectedUsers(data.userCount || data.connectedUsers || 0);
          if (data.userDetails) {
            console.log('📊 Updating userDetails:', data.userDetails);
            setUserDetails(data.userDetails);
          }
          console.log('Updated user count:', data.userCount || data.connectedUsers || 0);
          console.log('Current userDetails state:', userDetails);
          break;
        case 'user-joined':
          setConnectedUsers(prev => prev + 1);
          console.log('👋 User joined - new count will be:', connectedUsers + 1);
          // Request updated user list
          if (socket?.readyState === WebSocket.OPEN) {
            sendMessage('get-room-users', { spaceId });
          }
          break;
        case 'user-left':
          setConnectedUsers(prev => Math.max(0, prev - 1));
          console.log('👋 User left - new count will be:', Math.max(0, connectedUsers - 1));
          // Request updated user list
          if (socket?.readyState === WebSocket.OPEN) {
            sendMessage('get-room-users', { spaceId });
          }
          break;
        case 'queue-update':
          console.log('Queue update received in MusicRoom:', data);
          // The queue will be handled by QueueManager component
          break;
        case 'error':
          console.error('Room error:', data.message || data);
          // Show more helpful error messages to user
          if (data.message === 'You are unauthorized to perform this action') {
            console.error('❌ Authorization error - this might be due to:');
            console.error('   - Invalid or expired authentication token');
            console.error('   - User not properly joined to the room');
            console.error('   - User ID mismatch between token and request');
            console.error('   - Room connection lost');
            console.error('Current user info:', { 
              userId: user?.id, 
              hasToken: !!user?.token,
              tokenLength: user?.token?.length 
            });
            console.error('Socket info:', { 
              connected: socket?.readyState === WebSocket.OPEN,
              readyState: socket?.readyState 
            });
            
            // Try to rejoin the room
            if (user?.token && socket?.readyState === WebSocket.OPEN) {
              console.log('🔄 Attempting to rejoin room due to authorization error...');
              sendMessage('join-room', { 
                spaceId, 
                token: user.token,
                spaceName: spaceInfo?.spaceName
              });
            }
          }
          break;
        default:
          console.log('Unhandled message type in MusicRoom:', type);
      }
    };

    socket.addEventListener('message', handleMessage);

    // Join the room only if we have space info
    if (spaceInfo) {
      // Join the room
      console.log('🏠 Attempting to join room:', { 
        spaceId, 
        spaceName: spaceInfo.spaceName,
        userId: user.id, 
        hasToken: !!user.token,
        tokenLength: user.token?.length,
        tokenPreview: user.token?.substring(0, 20) + '...'
      });
      
      const roomJoined = sendMessage('join-room', { 
        spaceId, 
        token: user.token,
        spaceName: spaceInfo?.spaceName
      });
      
      if (!roomJoined) {
        console.error('❌ Failed to join room - connection issue');
      } else {
        console.log('✅ Join room message sent successfully with space name:', spaceInfo.spaceName);
      }
    } else {
      console.log('⏳ Waiting for space info before joining room...');
    }

    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket, user, spaceId, sendMessage, spaceInfo]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume, true);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg">Connecting to music room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      {/* Left Sidebar */}
      <div className="flex-shrink-0">
        <SidebarProvider>
          <ListenerSidebar 
            listeners={userDetails.length > 0 ? userDetails : [
              ...Array.from({ length: connectedUsers }, (_, i) => ({
                userId: `user-${i}`,
                isCreator: i === 0,
                name: i === 0 ? 'Room Creator' : `Listener ${i}`,
                imageUrl: ''
              }))
            ]} 
          />
        </SidebarProvider>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header with Search */}
          <div className="w-full p-4 border-b border-gray-700">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col gap-4">
                {/* Room Info and Search Bar */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-white">{roomName}</h1>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-gray-400">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">{connectedUsers} connected</span>
                      </div>
                      <Badge variant={isAdmin ? 'default' : 'secondary'} className={isAdmin ? "bg-purple-600" : "bg-gray-700"}>
                        {isAdmin ? 'Admin' : 'Listener'}
                      </Badge>
                      <Badge 
                        variant={
                          loading ? 'secondary' :
                          connectionError ? 'destructive' :
                          socket?.readyState === WebSocket.OPEN ? 'default' : 'secondary'
                        }
                        className="flex items-center gap-1 bg-gray-700 border-gray-600"
                      >
                        <div 
                          className={`w-2 h-2 rounded-full ${
                            loading ? 'bg-yellow-500 animate-pulse' :
                            connectionError ? 'bg-red-500' :
                            socket?.readyState === WebSocket.OPEN ? 'bg-green-500' : 'bg-gray-500'
                          }`}
                        />
                        {loading ? 'Connecting...' :
                         connectionError ? 'Connection Error' :
                         socket?.readyState === WebSocket.OPEN ? 'Connected' : 'Disconnected'}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Search Bar */}
                  <div className="flex-1 max-w-xl">
                    <SearchSongPopup 
                      onSelect={(track) => {
                        console.log('Song selected:', track.name);
                      }}
                      onBatchSelect={handleBatchAddToQueue}
                      buttonClassName="w-full bg-gray-700 hover:bg-gray-600 border-gray-600"
                      maxResults={12}
                      isAdmin={true}
                      enableBatchSelection={true}
                      spaceId={spaceId}
                    />
                  </div>
                </div>

               
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="flex-1 p-4">
            <div className="max-w-7xl mx-auto h-full">
              {/* Grid Layout - 2 columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">

                {/* Left Column - Player and Recommendation - Now Vertically Centered */}
                <div className="flex flex-col justify-center space-y-6">
                  {showPlayer && (
                    <div className="bg-gray-900 rounded-2xl shadow-lg border border-gray-700 p-6">
                      <Player 
                        spaceId={spaceId}
                        isAdmin={isAdmin}
                        userCount={connectedUsers}
                        userDetails={userDetails}
                        className="w-full"
                      />
                    </div>
                  )}

                  {/* Recommendation Section */}
                  <div className="bg-gray-900 rounded-2xl shadow-lg border border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-green-400 mb-4">Recommended for you</h3>
                    <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-600/30 rounded-xl p-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                            <Music className="w-6 h-6 text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-white">Song Title</p>
                            <p className="text-sm text-gray-400">Artist Name</p>
                          </div>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            <Play className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                            <Music className="w-6 h-6 text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-white">Another Song</p>
                            <p className="text-sm text-gray-400">Another Artist</p>
                          </div>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            <Play className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Queue */}
                <div className="space-y-6">
                  {showQueue && (
                    <div className="bg-gray-900 rounded-2xl shadow-lg border border-gray-700 h-full">
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-xl font-bold text-white">Music Queue</h2>
                        </div>
                        <QueueManager 
                          spaceId={spaceId} 
                          isAdmin={isAdmin}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
  
  );
};