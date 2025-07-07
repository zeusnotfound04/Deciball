"use client"

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Loader2, Plus, Users, Music, Trash2, ExternalLink } from "lucide-react";
import useRedirect from "@/hooks/useRedirect";
import BeamsBackground from "@/components/Background";
import ChromaGrid, { ChromaItem } from "@/app/components/ui/ChromaGrid";
import axios from "axios";

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
}

export default function SpacesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string>('');
  
  // Remove the redirect logic - users will only reach this page if they have spaces
  const { isLoading: redirectLoading, isAuthenticated } = useRedirect({
    redirectTo: 'manual'
  });

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
      // Get the first track's image if available from Redis data
      const firstTrackImage = space.streams?.[0]?.bigImg || 
                             space.streams?.[0]?.smallImg || 
                             `https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&crop=entropy&auto=format&q=80&random=${index}`;
      
      // Generate gradient colors based on space activity
      const gradientColors = space.isActive 
        ? ["#10B981", "#000"] // Green gradient for active spaces
        : ["#6B7280", "#000"]; // Gray gradient for inactive spaces
      
      const borderColor = space.isActive ? "#10B981" : "#6B7280";
      
      return {
        image: firstTrackImage,
        title: space.name,
        subtitle: `${space._count?.streams || 0} tracks`,
        handle: space.isActive ? "Active" : "Inactive",
        location: "Hosted by you",
        borderColor: borderColor,
        gradient: `linear-gradient(145deg, ${gradientColors[0]}, ${gradientColors[1]})`,
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

  useEffect(() => {
    if (isAuthenticated && !redirectLoading) {
      fetchSpaces();
    }
  }, [isAuthenticated, redirectLoading]);

  if (status === 'loading' || redirectLoading || loading) {
    return (
      <BeamsBackground intensity="medium">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
            <p className="text-zinc-400 text-lg">Loading your spaces...</p>
          </div>
        </div>
      </BeamsBackground>
    );
  }

  if (!isAuthenticated) {
    return (
      <BeamsBackground intensity="medium">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Please Sign In</h1>
            <p className="text-zinc-400">You need to be signed in to view your spaces.</p>
          </div>
        </div>
      </BeamsBackground>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Fixed background that doesn't scroll */}
      <div className="fixed inset-0 z-0">
        <BeamsBackground intensity="medium" />
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
            <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-50">
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
