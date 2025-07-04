'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useSocket } from '@/context/socket-context';
import { useUserStore } from '@/store/userStore';
import { useAudio } from '@/store/audioStore';
import { SpotifyPlayer } from './SpotifyPlayer';
import { QueueManager } from './QueueManager';
import { Player } from './Player';
import { DebugBatchQueue } from './DebugBatchQueue';
import SearchSongPopup from '@/app/components/Search';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Users, Music, Settings, VolumeX, Volume2, Play, Pause } from 'lucide-react';
import { searchResults } from '@/types';

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
  const [showDebug, setShowDebug] = useState(false);
  const [userDetails, setUserDetails] = useState<any[]>([]);

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
            setUserDetails(data.userDetails);
          }
          console.log('Updated user count:', data.userCount || data.connectedUsers || 0);
          if (data.userDetails) {
            console.log('User details (admin view):', data.userDetails);
          }
          break;
        case 'user-joined':
          setConnectedUsers(prev => prev + 1);
          break;
        case 'user-left':
          setConnectedUsers(prev => Math.max(0, prev - 1));
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
                token: user.token 
              });
            }
          }
          break;
        default:
          console.log('Unhandled message type in MusicRoom:', type);
      }
    };

    socket.addEventListener('message', handleMessage);

    // Join the room
    console.log('🏠 Attempting to join room:', { 
      spaceId, 
      userId: user.id, 
      hasToken: !!user.token,
      tokenLength: user.token?.length,
      tokenPreview: user.token?.substring(0, 20) + '...'
    });
    
    const roomJoined = sendMessage('join-room', { 
      spaceId, 
      token: user.token 
    });
    
    if (!roomJoined) {
      console.error('❌ Failed to join room - connection issue');
    } else {
      console.log('✅ Join room message sent successfully');
    }

    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket, user, spaceId, sendMessage]);

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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      {/* Include Spotify Player (invisible component) */}
      <SpotifyPlayer />
      
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Room Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{roomName}</CardTitle>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">{connectedUsers} connected</span>
                  </div>
                  <Badge variant={isAdmin ? 'default' : 'secondary'}>
                    {isAdmin ? 'Admin' : 'Listener'}
                  </Badge>
                  {/* Connection Status Badge */}
                  <Badge 
                    variant={
                      loading ? 'secondary' :
                      connectionError ? 'destructive' :
                      socket?.readyState === WebSocket.OPEN ? 'default' : 'secondary'
                    }
                    className="flex items-center gap-1"
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
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSearch(!showSearch)}
                >
                  <Music className="w-4 h-4 mr-2" />
                  {showSearch ? 'Hide Search' : 'Add Music'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowQueue(!showQueue)}
                >
                  Queue ({showQueue ? 'Hide' : 'Show'})
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPlayer(!showPlayer)}
                >
                  Player ({showPlayer ? 'Hide' : 'Show'})
                </Button>
                {isAdmin && (
                  <Button
                    variant="outline"
                    onClick={() => setShowDebug(!showDebug)}
                    className="border-orange-500 text-orange-600 hover:bg-orange-50"
                  >
                    Debug ({showDebug ? 'Hide' : 'Show'})
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Unified Player Component */}
        {showPlayer && (
          <Player 
            spaceId={spaceId}
            isAdmin={isAdmin}
            userCount={connectedUsers}
            userDetails={userDetails}
            className="w-full"
          />
        )}

        {/* Debug Section (Admin Only) */}
        {showDebug && isAdmin && (
          <DebugBatchQueue spaceId={spaceId} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Music Search */}
          {showSearch && (
            <Card>
              <CardHeader>
                <CardTitle>Add Music</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-4">
                  <p className="text-sm text-gray-600">
                    {isAdmin ? 'Search and select multiple songs to add to the queue' : 'Search and add songs to the queue'}
                  </p>
                  <SearchSongPopup 
                    onSelect={(track) => {
                      console.log('Song selected:', track.name);
                      // The Search component handles adding to queue internally
                    }}
                    onBatchSelect={handleBatchAddToQueue}
                    buttonClassName="w-full"
                    maxResults={12}
                    isAdmin={true}
                    enableBatchSelection={true}
                    spaceId={spaceId}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Queue Manager */}
          {showQueue && (
            <Card className={showSearch ? '' : 'lg:col-span-2'}>
              <CardHeader>
                <CardTitle>Music Queue</CardTitle>
              </CardHeader>
              <CardContent>
                <QueueManager 
                  spaceId={spaceId} 
                  isAdmin={isAdmin}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Connected Users (Admin View) */}
        {isAdmin && userDetails.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Connected Users ({connectedUsers})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {userDetails.map((userDetail, index) => (
                  <div key={userDetail.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {userDetail.userId.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">User {userDetail.userId.slice(0, 8)}</p>
                        <p className="text-sm text-gray-500">
                          {userDetail.isCreator ? 'Room Creator' : 'Listener'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {userDetail.isCreator && (
                        <Badge variant="default">Creator</Badge>
                      )}
                      <div className="w-2 h-2 bg-green-500 rounded-full" title="Online"></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
