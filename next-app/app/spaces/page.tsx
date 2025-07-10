"use client"

import { useEffect, useState, useContext } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";
import { Loader2, Plus, Users, Music, Trash2, ExternalLink, User, LogOut, Settings } from "lucide-react";
import useRedirect from "@/hooks/useRedirect";
import BackgroundAnimation from "@/components/Background";
import ChromaGrid, { ChromaItem } from "@/app/components/ui/ChromaGrid";
import axios from "axios";
import { SocketContext } from "@/context/socket-context";

interface Space {
  id: string;
  name: string;
  hostId: string;
  isActive: boolean;
  _count?: {
    streams: number;
  };
  streams?: Array<{
    id: string;
    title: string;
    smallImg: string;
    bigImg: string;
    artist?: string;
  }>;
  currentImage?: string; // Added to track current song image
}

export default function SpacesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string>('');
  const [spaceImages, setSpaceImages] = useState<Record<string, string>>({});
  const [imageUpdated, setImageUpdated] = useState<string | null>(null);
  
  // Use the socket context
  const { socket, sendMessage, user } = useContext(SocketContext);
  
  // Remove the redirect logic - users will only reach this page if they have spaces
  const { isLoading: redirectLoading, isAuthenticated } = useRedirect({
    redirectTo: 'manual'
  });

  // Request and handle space images via WebSocket
  useEffect(() => {
    if (!socket || !user || !spaces.length) return;

    // Handle WebSocket messages for space images
    const handleMessage = (event: MessageEvent) => {
      try {
        const { type, data } = JSON.parse(event.data);
        
        // Handle space image response message
        if (type === 'space-image-response' && data.spaceId && data.imageUrl) {
          console.log(`🖼️ Received space image for ${data.spaceId}:`, data.imageUrl);
          setSpaceImages(prev => ({
            ...prev,
            [data.spaceId]: data.imageUrl
          }));
        }
        
        // Handle space image update message (when songs change)
        else if (type === 'space-image-update' && data.spaceId && data.imageUrl) {
          console.log(`🖼️ Received space image update for ${data.spaceId}:`, data.imageUrl);
          setSpaceImages(prev => ({
            ...prev,
            [data.spaceId]: data.imageUrl
          }));
          setImageUpdated(data.spaceId); // Set the updated image ID
          setTimeout(() => setImageUpdated(null), 3000); // Clear the indicator after 3 seconds
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    };

    // Add event listener for messages
    socket.addEventListener('message', handleMessage);

    // Request images for each space
    spaces.forEach(space => {
      if (socket.readyState === WebSocket.OPEN && user) {
        console.log(`🖼️ Requesting image for space: ${space.id}`);
        sendMessage('get-space-image', { spaceId: space.id });
      }
    });

    // Clean up
    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket, user, spaces, sendMessage]);

  const fetchSpaces = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/spaces');
      setSpaces(response.data.spaces || []);
    } catch (error) {
      console.error('Error fetching spaces:', error);
    } finally {
      setLoading(false);
    }
  };

  // Convert spaces to ChromaGrid items
  const convertSpacesToChromaItems = (spaces: Space[]): ChromaItem[] => {
    return spaces.map((space, index) => {
      // Use the space image from WebSocket if available, otherwise fallback to API data or default
      const spaceImage = spaceImages[space.id] ||
                         space.streams?.[0]?.bigImg || 
                         space.streams?.[0]?.smallImg || 
                         `https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&crop=entropy&auto=format&q=80&random=${index}`;
      
      // Generate gradient colors based on space activity
      const gradientColors = space.isActive 
        ? ["#10B981", "#000"] // Green gradient for active spaces
        : ["#6B7280", "#000"]; // Gray gradient for inactive spaces
      
      const borderColor = space.isActive ? "#10B981" : "#6B7280";
      
      return {
        image: spaceImage,
        title: space.name,
        subtitle: `${space._count?.streams || 0} tracks`,
        handle: space.isActive ? "Active" : "Inactive",
        location: imageUpdated === space.id ? "🎵 Now playing updated!" : "Hosted by you",
        borderColor: imageUpdated === space.id ? "#3b82f6" : borderColor, // Highlight border when updated
        gradient: imageUpdated === space.id 
          ? `linear-gradient(145deg, #3b82f6, #000)` // Blue gradient for updated image
          : `linear-gradient(145deg, ${gradientColors[0]}, ${gradientColors[1]})`,
        url: `/space/${space.id}`, // Link to join the space
      };
    });
  };

  const handleDeleteSpace = async (spaceId: string, spaceName: string) => {
    if (!confirm(`Are you sure you want to delete "${spaceName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(spaceId);
      await axios.delete(`/api/spaces?spaceId=${spaceId}`);
      setSpaces(spaces.filter(space => space.id !== spaceId));
    } catch (error) {
      console.error('Error deleting space:', error);
      alert('Failed to delete space. Please try again.');
    } finally {
      setDeleting('');
    }
  };

  const handleJoinSpace = (spaceId: string) => {
    router.push(`/space/${spaceId}`);
  };

  const handleCreateNewSpace = () => {
    router.push('/dashboard');
  };

  const handleLogout = async () => {
    try {
      await signOut({ redirect: true, callbackUrl: '/' });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Get user's profile picture URL
  const getProfilePicture = () => {
    if (session?.user?.pfpUrl) {
      return session.user.pfpUrl;
    }
    if (session?.user?.pfpUrl) {
      return session.user.pfpUrl;
    }
    return null;
  };

  // Get user's initials for fallback
  const getUserInitials = () => {
    if (session?.user?.name) {
      return session.user.name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    if (session?.user?.username) {
      return session.user.username.slice(0, 2).toUpperCase();
    }
    if (session?.user?.email) {
      return session.user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  useEffect(() => {
    if (isAuthenticated && !redirectLoading) {
      fetchSpaces();
    }
  }, [isAuthenticated, redirectLoading]);

  if (status === 'loading' || redirectLoading || loading) {
    return (
      <BackgroundAnimation >
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
            <p className="text-zinc-400 text-lg">Loading your spaces...</p>
          </div>
        </div>
      </BackgroundAnimation>
    );
  }

  if (!isAuthenticated) {
    return (
      <BackgroundAnimation>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Please Sign In</h1>
            <p className="text-zinc-400">You need to be signed in to view your spaces.</p>
          </div>
        </div>
      </BackgroundAnimation>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Fixed background that doesn't scroll */}
      <div className="fixed inset-0 z-0">
        <BackgroundAnimation  />
      </div>
      
      {/* User Avatar in Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-zinc-800/50">
              <Avatar className="h-10 w-10 ring-2 ring-cyan-400/20 hover:ring-cyan-400/40 transition-all duration-300">
                <AvatarImage 
                  src={getProfilePicture() || undefined} 
                  alt={'User'} 
                  className="object-cover"
                />
                <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-teal-500 text-white font-semibold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-zinc-900/95 border-zinc-800" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-zinc-100">
                  {session?.user?.name || session?.user?.username || 'User'}
                </p>
                <p className="text-xs leading-none text-zinc-400">
                  {session?.user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem 
              className="text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer"
              onClick={() => router.push('/profile')}
            >
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer"
              onClick={() => router.push('/settings')}
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800" />
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
      
      {/* Scrollable content */}
      <div className="relative z-10 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent mb-4"
          >
            Your Music Spaces
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-zinc-400 text-lg"
          >
            Manage and join your collaborative music rooms
          </motion.p>
        </div>

        {/* Create New Space Button */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8 text-center"
        >
          <Button 
            onClick={handleCreateNewSpace}
            className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white px-8 py-3 rounded-lg font-medium transition-all duration-300 shadow-lg shadow-cyan-900/30"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create New Space
          </Button>
        </motion.div>

        {/* Spaces Grid */}
        {spaces.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center py-16"
          >
            <Music className="w-16 h-16 text-zinc-600 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-zinc-300 mb-4">No Spaces Yet</h2>
            <p className="text-zinc-500 mb-8 max-w-md mx-auto">
              You haven't created any music spaces yet. Create your first space to start listening with friends!
            </p>
            <Button 
              onClick={handleCreateNewSpace}
              className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white px-6 py-2 rounded-lg font-medium transition-all duration-300"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Space
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="min-h-[600px] relative"
          >
            <ChromaGrid 
              items={convertSpacesToChromaItems(spaces)}
              className="py-8"
              radius={250}
              damping={0.4}
              fadeOut={0.5}
            />
            
            {/* Floating Action Buttons */}
            <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-40">
              {/* Delete Mode Toggle */}
              <Button
                variant="outline"
                size="sm"
                className="bg-red-900/20 border-red-800 text-red-400 hover:bg-red-900/40 hover:text-red-300"
                onClick={() => {
                  // Toggle delete mode - you can implement this functionality
                  alert("Right-click on a space card to delete it, or implement a delete mode toggle here");
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              
              {/* Create New Space */}
              <Button 
                onClick={handleCreateNewSpace}
                className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white shadow-lg shadow-cyan-900/30"
                size="lg"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        )}
      </div>
      </div>
    </div>
  );
}