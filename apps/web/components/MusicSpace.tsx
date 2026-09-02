'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  DndContext, 
  DragOverlay, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent
} from '@dnd-kit/core';
import { useSocket } from '@/context/socket-context';
import { useUserStore } from '@/store/userStore';
import { useIsMobile } from '@/app/hooks/use-mobile';
import { useAudioStore } from '@/store/audioStore';
import { QueueManager } from './QueueManager';
import { Player } from './Player';
import SearchSongPopup from '@/app/components/Search';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Users, Music, Settings, VolumeX, Volume2, Play, Pause, LogOut, User, Share2, Copy, Check, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { RecommendationPanel } from './RecommendationPanel';
import SpaceEndedModal from './SpaceEndedModal';
import MusicSpaceLayout from './MusicSpaceLayout';
import Loader from '@/components/ui/Loader';
import StablePixelBlast from '@/components/ui/StablePixelBlast';

interface MusicSpaceProps {
  spaceId: string;
}

export const MusicSpace: React.FC<MusicSpaceProps> = ({ spaceId }) => {
  const { data: session } = useSession();
  const { user, setUser, isAdmin, setIsAdmin } = useUserStore(); // Get isAdmin from store
  const setVolume = useAudioStore(state => state.setVolume);
  const setCurrentSpaceId = useAudioStore(state => state.setCurrentSpaceId);
  const { sendMessage, socket, loading, connectionError, user: socketUser } = useSocket();
  const router = useRouter();
  const isMobile = useIsMobile();
  
  const [connectedUsers, setConnectedUsers] = useState(0);
  const [roomName, setRoomName] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showQueue, setShowQueue] = useState(true);
  const [showPlayer, setShowPlayer] = useState(true);
  const [userDetails, setUserDetails] = useState<any[]>([]);
  const [spaceInfo, setSpaceInfo] = useState<{ spaceName: string; hostId: string } | null>(null);
  const [shareClicked, setShareClicked] = useState(false);
  
  // Space ended modal state
  const [showSpaceEndedModal, setShowSpaceEndedModal] = useState(false);
  const [spaceEndedReason, setSpaceEndedReason] = useState('');
  const [spaceEndedMessage, setSpaceEndedMessage] = useState('');

  // Drag and Drop State
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedSong, setDraggedSong] = useState<any>(null);
  
  // Drag and Drop Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Memoized values to prevent unnecessary re-computations
  const profilePicture = useMemo(() => {
    return user?.imageUrl || (session?.user as any)?.image || session?.user?.pfpUrl || null;
  }, [user?.imageUrl, session?.user]);

  const userInitials = useMemo(() => {
    const name = session?.user?.name || "User Not Found";
    return name.charAt(0).toUpperCase();
  }, [session?.user?.name]);

  // Memoized admin status computation for faster access
  const computedIsAdmin = useMemo(() => {
    return Boolean(session?.user?.id && spaceInfo?.hostId && session.user.id === spaceInfo.hostId);
  }, [session?.user?.id, spaceInfo?.hostId]);

  const getProfilePicture = useCallback(() => profilePicture, [profilePicture]);
  const getUserInitials = useCallback(() => userInitials, [userInitials]);

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: '/signin' });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleShare = async () => {
    try {
      const spaceUrl = `${window.location.origin}/space/${spaceId}`;
      
      if (navigator.share) {
        await navigator.share({
          title: `Join ${roomName} on Deciball`,
          text: `Listen to music together in ${roomName}!`,
          url: spaceUrl,
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(spaceUrl);
        setShareClicked(true);
        setTimeout(() => setShareClicked(false), 2000);
      }
    } catch (error) {
      // If clipboard fails, try manual selection method
      try {
        const spaceUrl = `${window.location.origin}/space/${spaceId}`;
        await navigator.clipboard.writeText(spaceUrl);
        setShareClicked(true);
        setTimeout(() => setShareClicked(false), 2000);
      } catch (clipboardError) {
        console.error('Failed to copy to clipboard:', clipboardError);
        // Could show a toast notification here
      }
    }
  };

  // Memoized fetch function with immediate admin check
  const fetchSpaceInfo = useCallback(async () => {
    if (!spaceId) return;
    
    try {
      const response = await fetch(`/api/spaces?spaceId=${spaceId}`);
      const data = await response.json();
      
      if (data.success) {
        const spaceData = {
          spaceName: data.spaceName,
          hostId: data.hostId
        };
        
        setSpaceInfo(spaceData);
        setRoomName(data.spaceName);
        
        // Immediate admin check as soon as we have hostId - this is the fastest path
        if (session?.user?.id && data.hostId) {
          const userIsAdmin = session.user.id === data.hostId;
          setIsAdmin(userIsAdmin);
        }
      } else {
        console.error('Failed to fetch space info:', data.message);
        setRoomName("Unknown Space");
      }
    } catch (error) {
      console.error('Error fetching space info:', error);
      setRoomName("Unknown Space");
    }
  }, [spaceId, session?.user?.id, setIsAdmin]);

  // Optimized initialization effect with parallel execution
  useEffect(() => {
    if (spaceId) {
      
      setCurrentSpaceId(spaceId);
      
      // Start fetching space info immediately without waiting
      fetchSpaceInfo();
    }
  }, [spaceId, setCurrentSpaceId, fetchSpaceInfo]);

  // Early admin detection effect - runs as soon as we have session data
  useEffect(() => {
    if (spaceInfo?.hostId && session?.user?.id && isAdmin !== computedIsAdmin) {
      setIsAdmin(computedIsAdmin);
    }
  }, [computedIsAdmin, isAdmin, setIsAdmin, spaceInfo?.hostId, session?.user?.id]);

  // User setup effect - optimized for faster admin detection
  useEffect(() => {
    if (session?.user && !user) {
      
      
      
      // Determine admin status immediately if we have both pieces of data
      const userRole = spaceInfo?.hostId && session.user.id === spaceInfo.hostId ? 'admin' : 'listener';
      const userIsAdmin = userRole === 'admin';
      
      setUser({
        id: session.user.id,
        email: session.user.email || '',
        name: (session.user as any).name || session.user.username || '',
        username: session.user.username || '',
        imageUrl: (session.user as any).image || '',
        role: userRole,
        token: (session.user as any).token || '',
        isBookmarked: '',
        spotifyAccessToken: (session.user as any).spotifyAccessToken,
        spotifyRefreshToken: (session.user as any).spotifyRefreshToken
      });
      
      // Set admin status immediately if we can determine it
      if (spaceInfo?.hostId) {
        setIsAdmin(userIsAdmin);
        
      }
    }

    // Fallback admin status update for cases where spaceInfo comes later
    if (session?.user && user && spaceInfo?.hostId) {
      const userIsAdmin = session.user.id === spaceInfo.hostId;
      if (isAdmin !== userIsAdmin) {
        setIsAdmin(userIsAdmin);
        
      }
    }

    
  }, [session, user, setUser, spaceInfo?.hostId, setIsAdmin, isAdmin]);

  const handleBatchAddToQueue = useCallback(async (tracks: any[]) => {
    console.log('Batch add completed by Search component:', { 
      tracksCount: tracks.length, 
      trackNames: tracks.map(t => t.name)
    });
  }, []);

  // Space ended modal handlers
  const handleCreateNewSpace = useCallback(() => {
    setShowSpaceEndedModal(false);
    router.push('/dashboard?action=create-space');
  }, [router]);

  const handleGoHome = useCallback(() => {
    setShowSpaceEndedModal(false);
    router.push('/dashboard');
  }, [router]);

  const handleCloseModal = useCallback(() => {
    setShowSpaceEndedModal(false);
  }, []);

  // Drag and Drop Handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    // Store the dragged song data from the active element's data
    if (active.data?.current?.song) {
      setDraggedSong(active.data.current.song);
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !isAdmin) {
      setActiveId(null);
      setDraggedSong(null);
      return;
    }

    // If dropped on player zone, play the song instantly
    if (over.id === 'player') {
      const songId = active.id as string;
      
      // Send play-instant message
      sendMessage("play-instant", { spaceId, songId });
      
      // Show success feedback (optional)
      if (draggedSong) {
        
      }
    }

    setActiveId(null);
    setDraggedSong(null);
  }, [isAdmin, sendMessage, spaceId, draggedSong]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Optional: Add visual feedback when hovering over drop zones
  }, []);

  // Kick listener function
  const handleKickListener = useCallback((userId: string) => {
    if (!isAdmin) {
      console.warn("🚫 Only admins can kick listeners");
      return;
    }
   
    // Send kick message to server
    if (socket?.readyState === WebSocket.OPEN) {
      sendMessage("kick-listener", { 
        spaceId, 
        userId,
        adminId: user?.id 
      });
    } else {
      console.error("Socket not connected, cannot kick listener");
    }
  }, [isAdmin, socket, sendMessage, spaceId, user?.id]);

  // Memoized WebSocket message handlers
  const createWebSocketMessageHandler = useCallback(() => {
    let authErrorCount = 0;
    const maxAuthErrors = 3;

    return (event: MessageEvent) => {
      try {
        const { type, data } = JSON.parse(event.data);
        
        
        switch (type) {
          case 'room-info':
            if (data.isCreator !== undefined) {
              setIsAdmin(data.isCreator);
            }
            setConnectedUsers(data.userCount || 0);
            setRoomName(data.spaceName);
            
            break;
            
          case 'space-joined':
            
            
            
            
            authErrorCount = 0;
            break;
            
          case 'current-song-update':
            
            window.dispatchEvent(new CustomEvent('current-song-update', { detail: data }));
            break;
            
          case 'space-image-response':
            
            window.dispatchEvent(new CustomEvent('space-image-update', { detail: data }));
            break;

          case 'chat-message':
            
            window.dispatchEvent(new CustomEvent('chat-message', { detail: data }));
            break;
            
          case 'user-update':
            setConnectedUsers(prev => {
              const next = data.userCount || data.connectedUsers || 0;
              return prev === next ? prev : next;
            });
            if (data.userDetails) {
              setUserDetails(prev => {
                const incoming = JSON.stringify(data.userDetails.map((u: any) => u.userId).sort());
                const current = JSON.stringify(prev.map((u: any) => u.userId).sort());
                if (incoming === current) return prev;
                return data.userDetails;
              });
            }

            break;
            
          case 'user-joined':
            setConnectedUsers(prev => prev + 1);
            
            break;
            
          case 'user-left':
            setConnectedUsers(prev => Math.max(0, prev - 1));
            break;
            
          case 'queue-update':
            
            break;
            
          case 'error':
            console.error('Room error:', {
              message: data.message || 'Unknown error',
              data: data,
              timestamp: new Date().toISOString()
            });
            
            if (data.message === 'You are unauthorized to perform this action') {
              authErrorCount++;
              console.error(`Authorization error (${authErrorCount}/${maxAuthErrors}) - this might be due to:`);
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
              
              if (authErrorCount < maxAuthErrors && user?.token && socket?.readyState === WebSocket.OPEN) {
                console.log(`Attempting to rejoin space due to authorization error (attempt ${authErrorCount}/${maxAuthErrors})...`);
                setTimeout(() => {
                  sendMessage('join-space', { 
                    spaceId, 
                    token: user.token,
                    spaceName: spaceInfo?.spaceName
                  });
                }, 2000 * authErrorCount);
              } else if (authErrorCount >= maxAuthErrors) {
                console.error('Max auth error attempts reached. Stopping reconnection attempts.');
              }
            }
            break;
            
          case 'space-ended':
            
            setSpaceEndedReason(data.reason || 'unknown');
            setSpaceEndedMessage(data.message || 'The space has ended.');
            setShowSpaceEndedModal(true);
            break;
            
          default:
            
        }
      } catch (error) {
        console.error('Error parsing WebSocket message in MusicSpace:', error);
      }
    };
  }, [setIsAdmin, setConnectedUsers, setRoomName, setUserDetails, socket, sendMessage, spaceId, user, spaceInfo?.spaceName]);

  // WebSocket connection and space joining effect
  useEffect(() => {
    if (!socket || !user || !spaceInfo) return;

    const handleMessage = createWebSocketMessageHandler();
    socket.addEventListener('message', handleMessage);

    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    let joined = false;

    // The ws token is issued asynchronously (socket connect -> /api/auth/ws-token
    // -> setUser), and the NextAuth session carries no token of its own. So this
    // effect can run before a token exists. Joining then would fail and, worse,
    // flip the context into its connection-error state. Wait for readiness and
    // re-attempt instead of firing once.
    const attemptJoin = () => {
      if (joined) return;
      if (socket.readyState !== WebSocket.OPEN) return;
      // The ws token lives in SocketContext, not in the Zustand user store
      // (the NextAuth session carries no token, so useUserStore().user.token is
      // always ''). sendMessage injects this same token itself.
      if (!socketUser?.token) return; // not issued yet; effect re-runs when it lands

      const spaceJoined = sendMessage('join-space', {
        spaceId,
        token: socketUser.token,
        spaceName: spaceInfo.spaceName
      });

      if (!spaceJoined) {
        console.error('Failed to join space - connection issue', {
          readyState: socket.readyState,
          hasToken: !!socketUser?.token,
          userId: socketUser?.id ?? user.id
        });
        return;
      }

      joined = true;

      // Re-request room state once the join has been registered server-side.
      // The server answers get-queue/get-current-song only for a user already
      // in RoomManager.users, so requests sent by components that mount before
      // the join lands (QueueManager fires get-queue on mount) are dropped
      // silently. Asking again after joining is what actually populates them.
      fallbackTimer = setTimeout(() => {
        if (socket.readyState === WebSocket.OPEN) {
          sendMessage('get-current-song', { spaceId });
          sendMessage('get-space-image', { spaceId });
          sendMessage('get-queue', { spaceId });
        }
      }, 1000);
    };

    attemptJoin();
    socket.addEventListener('open', attemptJoin);

    return () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      socket.removeEventListener('open', attemptJoin);
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket, user, socketUser?.token, spaceId, sendMessage, spaceInfo, createWebSocketMessageHandler]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume, true);
  }, [setVolume]);
  
  if (loading || !user) {
    return (
      <MusicSpaceLayout showSidebar={false}>
        <div className="flex-1 h-full w-full flex flex-col overflow-hidden">
          {/* Skeleton header */}
          <div className="flex items-center justify-center p-2 sm:p-3 md:p-4 w-full flex-shrink-0">
            <div className="flex items-center gap-4 bg-midnight-surface border border-graphite rounded-cards px-4 md:px-8 py-3 w-full max-w-[96%] lg:max-w-6xl">
              <div className="h-5 w-32 bg-graphite rounded animate-pulse" />
              <div className="flex-1 h-10 bg-graphite rounded-full animate-pulse" />
              <div className="h-10 w-10 bg-graphite rounded-full animate-pulse" />
            </div>
          </div>

          {/* Skeleton content */}
          <div className="flex-1 flex justify-center w-full p-2 sm:p-4 min-h-0">
            <div className="w-full flex flex-col md:grid md:grid-cols-2 gap-3 md:gap-4">
              {/* Player skeleton */}
              <div className="bg-midnight-surface border border-graphite rounded-cards p-4 flex flex-col items-center justify-center h-[50vh] md:h-full">
                <div className="w-48 h-48 sm:w-56 sm:h-56 bg-graphite rounded-album-art animate-pulse mb-6 flex items-center justify-center">
                  <Loader size="lg" />
                </div>
                <div className="h-5 w-40 bg-graphite rounded animate-pulse mb-2" />
                <div className="h-4 w-28 bg-graphite rounded animate-pulse" />
              </div>
              {/* Queue skeleton */}
              <div className="bg-midnight-surface border border-graphite rounded-cards p-4 h-[50vh] md:h-full">
                <div className="h-4 w-16 bg-graphite rounded animate-pulse mb-4" />
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-graphite rounded-lg animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
                      <div className="w-10 h-10 bg-charcoal rounded-album-art flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-3/4 bg-charcoal rounded" />
                        <div className="h-2 w-1/2 bg-charcoal rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </MusicSpaceLayout>
    );
  }

  return (
    <MusicSpaceLayout 
      userDetails={userDetails} 
      connectedUsers={connectedUsers}
      isAdmin={isAdmin}
      onKickListener={handleKickListener}
    >
      <div className="flex-1 h-full w-full flex flex-col overflow-hidden md:overflow-hidden">
        {/* Header Section */}
        <div className="flex items-center justify-center p-2 sm:p-3 md:p-4 w-full overflow-hidden flex-shrink-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 md:gap-6 bg-midnight-surface/80 border border-graphite/50 rounded-cards px-3 sm:px-4 md:px-8 py-3 sm:py-3 md:py-3 w-full max-w-[98%] sm:max-w-[95%] md:max-w-[96%] lg:max-w-6xl">
          
          {/* Mobile Layout - Header with profile picture and room name */}
          <div className="flex items-center justify-between w-full sm:hidden">
            <div className="flex-1 flex justify-center">
              <h1 className="text-lg font-serif italic text-paper-white text-center">
                {roomName}
              </h1>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                onClick={handleShare}
                variant="ghost"
                size="sm"
                className="h-10 w-10 rounded-full p-0 hover:bg-charcoal transition-all duration-300 bg-graphite border border-graphite"
              >
                {shareClicked ? (
                  <Check className="h-4 w-4 text-green-400" />
                ) : (
                  <Share2 className="h-4 w-4 text-ghost-gray hover:text-paper-white" />
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-charcoal transition-all duration-300 bg-graphite border border-graphite">
                    <Avatar className="h-9 w-9 ring-1 ring-electric-cyan/30 transition-all duration-300">
                      <AvatarImage
                        src={getProfilePicture() || undefined}
                        alt={String(session?.user?.name || session?.user?.username || 'User')}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-graphite text-paper-white font-mono text-sm">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-midnight-surface border-graphite" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-satoshi font-medium leading-none text-paper-white">
                        {session?.user?.name || session?.user?.username || 'User'}
                      </p>
                      <p className="text-xs leading-none text-steel-gray font-mono">
                        {session?.user?.email}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {isAdmin ? (
                          <span className="font-mono text-[10px] tracking-[0.02em] uppercase text-electric-cyan border border-electric-cyan/30 rounded-full px-2 py-0.5">
                            Admin
                          </span>
                        ) : (
                          <Badge variant="secondary" className="text-xs font-mono">
                            Listener
                          </Badge>
                        )}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-graphite" />
                  <DropdownMenuItem
                    className="text-ghost-gray hover:text-paper-white hover:bg-charcoal cursor-pointer font-satoshi"
                    onClick={() => router.push('/profile')}
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span className="font-satoshi font-medium">Profile</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-graphite" />
                  <DropdownMenuItem
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20 cursor-pointer font-satoshi"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span className="font-satoshi font-medium text-red-400">Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Desktop Layout - Original layout */}
          <div className="hidden sm:flex sm:items-center sm:justify-between sm:gap-4 md:gap-8 w-full">
            <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
              <h1 className="text-base sm:text-lg md:text-xl font-serif italic text-paper-white text-left truncate flex-1 sm:flex-none">
                {roomName}
              </h1>
            </div>

            <div className="flex-1 w-full sm:max-w-xs md:max-w-xl overflow-hidden">
              <SearchSongPopup
                onSelect={(track) => {

                }}
                onBatchSelect={handleBatchAddToQueue}
                buttonClassName="w-full bg-graphite hover:bg-charcoal border-slate-custom hover:border-slate-custom text-ghost-gray rounded-full px-3 sm:px-4 md:px-6 py-2 sm:py-2 md:py-2.5 transition-all duration-300 text-xs sm:text-sm md:text-base font-satoshi"
                maxResults={12}
                isAdmin={true}
                enableBatchSelection={true}
                spaceId={spaceId}
              />
            </div>

            <div className="flex items-center justify-center sm:justify-end gap-3">
              <Button
                onClick={handleShare}
                variant="ghost"
                size="sm"
                className="h-10 w-10 rounded-full p-0 hover:bg-charcoal transition-all duration-300 bg-graphite border border-graphite"
                title={shareClicked ? "Link copied!" : "Share space"}
              >
                {shareClicked ? (
                  <Check className="h-4 w-4 text-green-400" />
                ) : (
                  <Share2 className="h-4 w-4 text-ghost-gray hover:text-paper-white" />
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-charcoal transition-all duration-300">
                    <Avatar className="h-10 w-10 ring-2 ring-electric-cyan/30 transition-all duration-300">
                      <AvatarImage
                        src={getProfilePicture() || undefined}
                        alt={String(session?.user?.name || session?.user?.username || 'User')}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-graphite text-paper-white font-mono font-semibold">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-midnight-surface border-graphite" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-satoshi font-medium leading-none text-paper-white">
                        {session?.user?.name || session?.user?.username || 'User'}
                      </p>
                      <p className="text-xs leading-none text-steel-gray font-mono">
                        {session?.user?.email}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {isAdmin ? (
                          <span className="font-mono text-[10px] tracking-[0.02em] uppercase text-electric-cyan border border-electric-cyan/30 rounded-full px-2 py-0.5">
                            Admin
                          </span>
                        ) : (
                          <Badge variant="secondary" className="text-xs font-mono">
                            Listener
                          </Badge>
                        )}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-graphite" />
                  <DropdownMenuItem
                    className="text-ghost-gray hover:text-paper-white hover:bg-charcoal cursor-pointer font-satoshi"
                    onClick={() => router.push('/profile')}
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span className="font-satoshi font-medium">Profile</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-graphite" />
                  <DropdownMenuItem
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20 cursor-pointer font-satoshi"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span className="font-satoshi font-medium text-red-400">Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile Search - Full width below room info */}
          <div className="w-full sm:hidden overflow-hidden">
            <SearchSongPopup 
              onSelect={(track) => {
                
              }}
              onBatchSelect={handleBatchAddToQueue}
              buttonClassName="w-full bg-graphite hover:bg-charcoal border-slate-custom hover:border-slate-custom text-ghost-gray rounded-full px-4 py-2.5 transition-all duration-300 text-sm font-satoshi"
              maxResults={12}
              isAdmin={true}
              enableBatchSelection={true}
              spaceId={spaceId}
            />
          </div>
        </div>
      </div>

      {/* Main Content Section */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <div className="flex-1 w-full min-h-0 overflow-y-auto md:overflow-hidden">
          <div className="w-full h-full">
            <div className="w-full h-full p-2 sm:p-3 md:p-4 xl:p-6 flex flex-col md:grid md:grid-cols-[1fr,1fr] 2xl:grid-cols-[1.2fr,0.8fr] gap-2 md:gap-3 xl:gap-5 md:items-start">
              {/* Left Column - Player */}
              <div className="w-full min-w-0 md:h-full md:min-h-0 lg:max-w-xl xl:max-w-2xl 2xl:max-w-3xl">
                  {showPlayer && (
                    <div className="relative bg-midnight-surface/80 rounded-cards border border-graphite/50 p-2 sm:p-3 md:p-4 xl:p-5 w-full h-[40vh] sm:h-[42vh] md:h-full flex flex-col overflow-hidden">
                      <div className="absolute inset-0 z-0 opacity-[0.18] rounded-cards overflow-hidden pointer-events-none">
                        <StablePixelBlast variant="circle" pixelSize={3} color="#19d0e8" speed={0.4} patternDensity={0.5} edgeFade={0.3} enableRipples={true} rippleSpeed={0.2} rippleIntensityScale={0.5} />
                      </div>
                      <Player
                        spaceId={spaceId}
                        isAdmin={isAdmin}
                        userCount={connectedUsers}
                        userDetails={userDetails}
                        className="relative z-10 w-full h-full flex-1"
                      />
                    </div>
                  )}
              </div>

              {/* Right Column - QueueManager */}
              <div className="w-full min-w-0 md:h-full md:min-h-0 lg:max-w-xl xl:max-w-2xl 2xl:max-w-3xl">
                  {showQueue && (
                    <div className="relative bg-midnight-surface/80 rounded-cards border border-graphite/50 p-2 sm:p-3 md:p-4 xl:p-5 w-full h-[45vh] sm:h-[50vh] md:h-full min-h-0 flex flex-col overflow-hidden">
                      <div className="absolute inset-0 z-0 opacity-[0.15] rounded-cards overflow-hidden pointer-events-none">
                        <StablePixelBlast variant="square" pixelSize={3} color="#19d0e8" speed={0.3} patternDensity={0.45} edgeFade={0.3} enableRipples={true} rippleSpeed={0.15} rippleIntensityScale={0.4} />
                      </div>
                      <QueueManager
                        spaceId={spaceId}
                        isAdmin={isAdmin}
                        className="relative z-10 w-full h-full flex-1 min-h-0"
                      />
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* Global Drag Overlay */}
        <DragOverlay>
          {activeId && draggedSong ? (
            <div className="opacity-90 transform rotate-2 scale-105 pointer-events-none">
              <div className="bg-midnight-surface border border-electric-cyan/30 rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  <img
                    src={draggedSong.smallImg}
                    alt={draggedSong.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-paper-white truncate text-sm">
                      {draggedSong.title}
                    </h4>
                    {draggedSong.artist && (
                      <p className="text-steel-gray truncate text-xs">
                        {draggedSong.artist}
                      </p>
                    )}
                  </div>
                  <Music className="w-5 h-5 text-electric-cyan" />
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Space Ended Modal */}
      <SpaceEndedModal
        isOpen={showSpaceEndedModal}
        onClose={handleCloseModal}
        onCreateNewSpace={handleCreateNewSpace}
        onGoHome={handleGoHome}
        spaceName={roomName || spaceInfo?.spaceName}
        reason={spaceEndedReason}
        message={spaceEndedMessage}
      />
      </div>
    </MusicSpaceLayout>
  );
};