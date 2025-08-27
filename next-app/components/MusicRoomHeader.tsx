'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/context/socket-context';
import { useUserStore } from '@/store/userStore';
import SearchSongPopup from '@/app/components/Search';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Settings, LogOut, User } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import BlurText from './ui/BlurEffects';

interface MusicRoomHeaderProps {
  spaceId: string;
  roomName: string;
  isAdmin: boolean;
  loading: boolean;
  connectionError: boolean;
  onBatchSelect: (tracks: any[]) => void;
}

export const MusicRoomHeader: React.FC<MusicRoomHeaderProps> = ({
  spaceId,
  roomName,
  isAdmin,
  loading,
  connectionError,
  onBatchSelect
}) => {
  const { data: session } = useSession();
  const { user } = useUserStore();
  const { socket } = useSocket();
  const router = useRouter();

  const getProfilePicture = () => {
    return user?.imageUrl || (session?.user as any)?.image || session?.user?.pfpUrl || null;
  };

  const getUserInitials = () => {
    const name = session?.user?.name || "User Not Found";
    return name.charAt(0).toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: '/signin' });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="w-full p-3 sm:p-6">
      <div className="w-full max-w-7xl mx-auto">
        {/* Mobile Layout */}
        <div className="block lg:hidden">
          <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl">
            {/* Top Row: Room Name and Status */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <BlurText 
                  text={roomName} 
                  animateBy="words"
                  className="text-lg sm:text-xl font-bold text-white truncate"
                  delay={150}
                  direction="top"
                />
                <Badge 
                  variant={
                    loading ? 'secondary' :
                    connectionError ? 'destructive' :
                    socket?.readyState === WebSocket.OPEN ? 'default' : 'secondary'
                  }
                  className="flex items-center gap-1.5 bg-black/30 border-white/20 text-gray-200 px-2 py-1 flex-shrink-0"
                >
                  <div 
                    className={`w-1.5 h-1.5 rounded-full ${
                      loading ? 'bg-yellow-400 animate-pulse' :
                      connectionError ? 'bg-red-400' :
                      socket?.readyState === WebSocket.OPEN ? 'bg-emerald-400' : 'bg-gray-400'
                    }`}
                  />
                  <span className="text-xs">
                    {loading ? 'Connecting' :
                     connectionError ? 'Error' :
                     socket?.readyState === WebSocket.OPEN ? 'Live' : 'Offline'}
                  </span>
                </Badge>
              </div>
              
              {/* User Profile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-white/10 transition-all duration-300 flex-shrink-0">
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

            {/* Search Bar - Full Width on Mobile */}
            <div className="w-full">
              <SearchSongPopup 
                onSelect={(track) => {
                  console.log('Song selected:', track.name);
                }}
                onBatchSelect={onBatchSelect}
                buttonClassName="w-full bg-black/40 hover:bg-black/50 border-white/20 hover:border-white/30 text-gray-200 rounded-full px-4 py-2.5 backdrop-blur-sm transition-all duration-300"
                maxResults={12}
                isAdmin={isAdmin}
                enableBatchSelection={true}
                spaceId={spaceId}
              />
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-8 bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl px-12 py-4 shadow-2xl min-w-[900px] max-w-5xl w-full">
              
              <div className="flex items-center gap-3">
                <BlurText 
                  text={roomName} 
                  animateBy="words"
                  className="text-xl font-bold text-white"
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
              
              <div className="flex-1 max-w-xl mx-12">
                <SearchSongPopup 
                  onSelect={(track) => {
                    console.log('Song selected:', track.name);
                  }}
                  onBatchSelect={onBatchSelect}
                  buttonClassName="w-full bg-black/40 hover:bg-black/50 border-white/20 hover:border-white/30 text-gray-200 rounded-full px-6 py-2.5 backdrop-blur-sm transition-all duration-300"
                  maxResults={12}
                  isAdmin={isAdmin}
                  enableBatchSelection={true}
                  spaceId={spaceId}
                />
              </div>

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
        </div>
      </div>
    </div>
  );
};
