'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/context/socket-context';
import { useUserStore } from '@/store/userStore';
import { useAudio } from '@/store/audioStore';
import { QueueManager } from './QueueManager';
import { Player } from './Player';
import SearchSongPopup from '@/app/components/Search';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Users, Music, Settings, VolumeX, Volume2, Play, Pause, LogOut, User } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import ListenerSidebar from '@/app/components/ListenerSidebar';
import { SidebarProvider } from '@/app/components/ui/sidebar';
import { DiscordPresence } from './DiscordPresence';
import { ElectronDetector } from './ElectronDetector';
import HalftoneWavesBackground from './Background';
import BlurText, { BlurComponent } from './ui/BlurEffects';

interface MusicRoomProps {
  spaceId: string;
}

export const MusicRoom: React.FC<MusicRoomProps> = ({ spaceId }) => {
  const { data: session } = useSession();
  const { user, setUser } = useUserStore();
  const { setVolume,  setCurrentSpaceId } = useAudio();
  const { sendMessage, socket, loading, connectionError } = useSocket();
  const router = useRouter();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState(0);
  const [roomName, setRoomName] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showQueue, setShowQueue] = useState(true);
  const [showPlayer, setShowPlayer] = useState(true);
  const [userDetails, setUserDetails] = useState<any[]>([]);
  const [spaceInfo, setSpaceInfo] = useState<{ spaceName: string; hostId: string } | null>(null);

  // Helper functions for profile
  const getProfilePicture = () => {
    return user?.imageUrl || (session?.user as any)?.image || session?.user?.pfpUrl || null;
  };

  const getUserInitials = () => {
    const name =session?.user?.name|| "User Not Found";
    return name.charAt(0).toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: '/signin' });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Debug effect to track userDetails changes
  useEffect(() => {
    console.log('🔄 UserDetails state changed:', userDetails);
    console.log('🔄 UserDetails length:', userDetails.length);
  }, [userDetails]);

  useEffect(() => {
    if (session?.user && !user) {
      console.log("[katana] MusicRoom session user:", session.user);
      console.log("[katana] HostID", spaceInfo?.hostId);  
      setUser({
        id: session.user.id,
        email: session.user.email || '',
        name: (session.user as any).name || session.user.username || '',
        username: session.user.username || '',
        imageUrl: (session.user as any).image || '',
       role: session.user.id === spaceInfo?.hostId ? 'admin' : 'listener',
        token: (session.user as any).token || '',
        isBookmarked: '',
        spotifyAccessToken: (session.user as any).spotifyAccessToken,
        spotifyRefreshToken: (session.user as any).spotifyRefreshToken
      });
    }
     setIsAdmin(session?.user.id === spaceInfo?.hostId);


     console.log("[katana] MusicRoom session user:", user);
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
        console.log("Space Data ::", data)
        if (data.success) {
          setSpaceInfo({
            spaceName: data.spaceName,
            hostId: data.hostId
          });
          setRoomName(data.spaceName);
        } else {
          console.error('Failed to fetch space info:', data.message);
          // Set fallback room name
          setRoomName("Unknown Space");
        }
      } catch (error) {
        console.error('Error fetching space info:', error);
        // Set fallback room name
        setRoomName("Unknown Space");
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
          setRoomName(data.spaceName );
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
      <HalftoneWavesBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-gray-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-lg text-gray-200">Connecting to music room...</p>
          </div>
        </div>
      </HalftoneWavesBackground>
    );
  }

  return (
    <HalftoneWavesBackground>
      <div className="flex min-h-screen text-white">
        {/* Discord Presence (invisible component) */}
        <DiscordPresence />
        
        {/* Electron Detector for debugging */}
        <ElectronDetector />
        
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
          {/* Premium Minimalistic Header */}
          <div className="flex items-center justify-center p-6">
            <div className="flex items-center gap-8 bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl px-12 py-4 shadow-2xl min-w-[900px] max-w-5xl w-full">
              
              {/* Room Name - Left Side */}
              <div className="flex items-center gap-3">
                <BlurText 
                  text={roomName} 
                  animateBy="words"
                  className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent"
                  delay={150}
                  direction="top"
                />
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={
                      loading ? 'secondary' :
                      connectionError ? 'destructive' :
                      socket?.readyState === WebSocket.OPEN ? 'default' : 'secondary'
                    }
                    className="flex items-center gap-1.5 bg-black/30 border-white/20 text-gray-200 px-2 py-1"
                  >
                    <div 
                      className={`w-1.5 h-1.5 rounded-full ${
                        loading ? 'bg-yellow-400 animate-pulse' :
                        connectionError ? 'bg-red-400' :
                        socket?.readyState === WebSocket.OPEN ? 'bg-emerald-400' : 'bg-gray-400'
                      }`}
                    />
                    {loading ? 'Connecting' :
                     connectionError ? 'Error' :
                     socket?.readyState === WebSocket.OPEN ? 'Live' : 'Offline'}
                  </Badge>
                </div>
              </div>

              {/* Search Bar - Center */}
              <div className="flex-1 max-w-xl mx-12">
                <SearchSongPopup 
                  onSelect={(track) => {
                    console.log('Song selected:', track.name);
                  }}
                  onBatchSelect={handleBatchAddToQueue}
                  buttonClassName="w-full bg-black/40 hover:bg-black/50 border-white/20 hover:border-white/30 text-gray-200 rounded-full px-6 py-2.5 backdrop-blur-sm transition-all duration-300"
                  maxResults={12}
                  isAdmin={true}
                  enableBatchSelection={true}
                  spaceId={spaceId}
                />
              </div>

              {/* Profile Section - Right Side */}
              <div className="flex items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-white/10 transition-all duration-300">
                      <Avatar className="h-10 w-10 ring-2 ring-cyan-400/30 hover:ring-cyan-400/50 transition-all duration-300">
                        <AvatarImage 
                          src={getProfilePicture() || undefined} 
                          alt={String(session?.user?.name || session?.user?.username || 'User')} 
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-purple-500 text-white font-semibold">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-black/90 border-white/20 backdrop-blur-xl" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none text-white">
                          {session?.user?.name || session?.user?.username || 'User'}
                        </p>
                        <p className="text-xs leading-none text-gray-400">
                          {session?.user?.email}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={isAdmin ? 'default' : 'secondary'} className="text-xs bg-gradient-to-r from-cyan-500 to-purple-500 border-0">
                            {isAdmin ? 'Admin' : 'Listener'}
                          </Badge>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/20" />
                    <DropdownMenuItem 
                      className="text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer"
                      onClick={() => router.push('/profile')}
                    >
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer"
                      onClick={() => router.push('/settings')}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/20" />
                    <DropdownMenuItem 
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20 cursor-pointer"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

            {/* Main Content Grid */}
            <div className="flex-1 p-4">
              <div className="max-w-7xl mx-auto h-full">
                {/* Grid Layout - 2 columns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-[calc(100vh-200px)]">

                  {/* Left Column - Player and Recommendation with Blur Effects */}
                  <BlurComponent 
                    delay={500} 
                    direction="top"
                    className="flex flex-col justify-center space-y-6"
                    stepDuration={0.4}
                  >
                    {showPlayer && (
                      <div className="backdrop-blur-sm rounded-2xl shadow-lg border border-gray-600/50 p-6">
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
                    <div className="bg-[#1C1E1F] border-[#424244] backdrop-blur-sm rounded-2xl shadow-lg border border-gray-600/50 p-6">
                      <h3 className="text-lg font-semibold text-gray-200 mb-4">Recommended for you</h3>
                      <div className="bg-gradient-to-r from-gray-700/30 to-gray-600/30 border border-gray-500/30 rounded-xl p-4">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12  bg-[#1C1E1F] border-[#424244] rounded-lg flex items-center justify-center">
                              <Music className="w-6 h-6 text-gray-400" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-white">Song Title</p>
                              <p className="text-sm text-gray-300">Artist Name</p>
                            </div>
                            <Button size="sm" className="bg-[#1C1E1F] border-[#424244] hover:bg-gray-700 text-white">
                              <Play className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-[#1C1E1F] rounded-lg flex items-center justify-center">
                              <Music className="w-6 h-6 text-gray-400" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-white">Another Song</p>
                              <p className="text-sm text-gray-300">Another Artist</p>
                            </div>
                            <Button size="sm" className="bg-[#1C1E1F] border-[#424244] hover:bg-gray-700 text-white">
                              <Play className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </BlurComponent>

                  {/* Right Column - Queue with Blur Effects */}
                  <BlurComponent
                    delay={600}
                    direction="bottom"
                    className="h-full"
                    stepDuration={0.4}
                  >
                    {showQueue && (
                      <div className="backdrop-blur-sm rounded-2xl shadow-lg border border-gray-600/50 p-8 h-full min-h-[600px]">
                        <QueueManager 
                          spaceId={spaceId} 
                          isAdmin={isAdmin}
                        />
                      </div>
                    )}
                  </BlurComponent>
                </div>
              </div>
            </div>
          </div>

        </div>
    </HalftoneWavesBackground>
  
  );
};