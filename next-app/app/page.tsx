"use client"

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Loader2, Play } from "lucide-react";
import BackgroundAnimation from "@/components/Background";
import { signikaNegative, lexend, poppins, spaceGrotesk } from "@/lib/font";
import GlitchText from "@/components/ui/glitch-text";
import SignInDialog from "@/components/ui/SignInDialog";
import { useUserSpaces, useCreateSpace, usePrefetchUserSpaces } from "@/app/hooks/useSpaces";
import { SpacesGridSkeleton } from "@/app/components/ui/SpaceSkeleton";

interface Space {
  id: string;
  name: string;
  hostId: string;
  isActive: boolean;
  _count?: {
    streams: number;
  };
}

export default function Page() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [spaceName, setSpaceName] = useState("");
  const [showPastSpaces, setShowPastSpaces] = useState(false);
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // React Query hooks
  const { 
    data: spaces = [], 
    isLoading: spacesLoading, 
    error: spacesError,
    refetch: refetchSpaces 
  } = useUserSpaces();
  
  const createSpaceMutation = useCreateSpace();
  const prefetchUserSpaces = usePrefetchUserSpaces();

  // Auto-show spaces if user is authenticated and has spaces
  useEffect(() => {
    if (status === 'authenticated' && !initialLoadComplete) {
      // Prefetch spaces for better UX
      prefetchUserSpaces();
      
      // If user has spaces, show them automatically
      if (spaces.length > 0) {
        setShowPastSpaces(true);
      }
      setInitialLoadComplete(true);
    } else if (status !== 'loading' && status !== 'authenticated') {
      setInitialLoadComplete(true);
    }
  }, [status, spaces.length, initialLoadComplete, prefetchUserSpaces]);

  const handleCreateSpace = async () => {
    if (!spaceName.trim()) return;
    
    if (status !== 'authenticated') {
      setShowSignInDialog(true);
      return;
    }

    try {
      const newSpace = await createSpaceMutation.mutateAsync({
        spaceName: spaceName.trim()
      });
      
      if (newSpace) {
        router.push(`/space/${newSpace.id}`);
      }
    } catch (error) {
      console.error('Error creating space:', error);
      // Error is handled by the mutation's onError callback
      // You could add a toast notification here if needed
    }
  };

  const handleJoinSpace = (spaceId: string) => {
    router.push(`/space/${spaceId}`);
  };

  const handleViewPastSpaces = () => {
    if (status !== 'authenticated') {
      setShowSignInDialog(true);
      return;
    }
    
    setShowPastSpaces(true);
    // The data should already be cached, but we can trigger a background refetch if needed
    if (spaces.length === 0) {
      refetchSpaces();
    }
  };

  const handleCreateNewSpace = () => {
    setShowPastSpaces(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateSpace();
    }
  };

  const textVariants = {
    hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)" }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 z-0">
        <BackgroundAnimation />
      </div>
      
      <div className="relative z-10 min-h-screen">
        {/* Show loading during initial authentication and space fetch */}
        {(status === 'loading' || (status === 'authenticated' && !initialLoadComplete)) && (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
              <p className="text-white text-lg">Loading your spaces...</p>
            </div>
          </div>
        )}

        {/* Main content when not loading */}
        {status !== 'loading' && initialLoadComplete && (
          <AnimatePresence mode="wait">
            {!showPastSpaces ? (
            <motion.div
              key="onboarding"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.6 }}
              className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-6 sm:py-8 lg:py-0"
            >
              <motion.h1
                variants={textVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.8, delay: 0.2 }}
                className={`${spaceGrotesk.className} text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-bold text-center text-white mb-3 sm:mb-4 lg:mb-6 leading-tight px-2 mobile-text-shadow`}
              >
                Sync the Beat, Vote the Heat!
              </motion.h1>

              <motion.div
                variants={textVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.8, delay: 0.6 }}
                className="relative mb-6 sm:mb-8 lg:mb-12"
              >
                <GlitchText
                  speed={1}
                  enableShadows={true}
                  enableOnHover={false}
                  className={`${lexend.className} text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold text-center gradient-text px-2`}
                >
                  Deciball
                </GlitchText>

              </motion.div>

              <motion.div
                variants={textVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.8, delay: 1.0 }}
                className="w-full max-w-xs xs:max-w-sm sm:max-w-md md:max-w-lg relative mb-4 sm:mb-6 lg:mb-8 px-2 xs:px-4 sm:px-0"
              >
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Enter your space name..."
                  value={spaceName}
                  onChange={(e) => setSpaceName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full px-3 xs:px-4 sm:px-6 md:px-8 py-3 xs:py-4 sm:py-5 md:py-6 bg-white text-black placeholder-gray-500 text-base xs:text-lg sm:text-xl border-2 border-gray-300 rounded-xl focus:border-black focus:ring-0 focus:outline-none transition-all duration-300"
                  disabled={createSpaceMutation.isPending}
                />
              </motion.div>

              <motion.div
                variants={textVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.8, delay: 1.2 }}
                className="mb-8 xs:mb-12 sm:mb-16 lg:mb-20 px-2 xs:px-4 sm:px-0"
              >
                <motion.button
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)"
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCreateSpace}
                  disabled={!spaceName.trim() || createSpaceMutation.isPending}
                  className={`${poppins.className} bg-black text-white px-6 xs:px-8 sm:px-12 md:px-16 py-3 xs:py-4 sm:py-5 text-base xs:text-lg sm:text-xl font-semibold rounded-2xl hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 border-2 border-transparent hover:border-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-300/50 w-full sm:w-auto min-w-[200px] mobile-touch-target active:scale-95`}
                >
                  {createSpaceMutation.isPending ? (
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 animate-spin" />
                      <span>Creating...</span>
                    </div>
                  ) : (
                    "Jam Now"
                  )}
                </motion.button>
              </motion.div>

              <motion.div
                variants={textVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.8, delay: 1.4 }}
                className="fixed bottom-0 left-0 right-0 pb-4 xs:pb-6 sm:pb-8 pt-3 xs:pt-4 sm:pt-6 bg-gradient-to-t from-black/30 via-black/10 to-transparent mobile-backdrop px-3 xs:px-4"
              >
                <div className="flex justify-center">
                  {status === 'authenticated' ? (
                    <motion.button
                      whileHover={{ 
                        scale: 1.05,
                        y: -2
                      }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleViewPastSpaces}
                      onMouseEnter={() => {
                        // Prefetch spaces on hover for better UX
                        if (status === 'authenticated') {
                          prefetchUserSpaces();
                        }
                      }}
                      className={`${poppins.className} text-white/80 hover:text-white transition-all duration-300 text-sm xs:text-base sm:text-lg font-medium group bg-white/10 backdrop-blur-md px-4 xs:px-6 sm:px-8 py-2 xs:py-2.5 sm:py-3 rounded-full border border-white/20 hover:border-white/40 hover:bg-white/20 w-full sm:w-auto max-w-xs xs:max-w-sm text-center`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-xs xs:text-sm sm:text-base">View Past Created Spaces</span>
                        <motion.div
                          initial={{ width: 0 }}
                          whileHover={{ width: "100%" }}
                          className="h-0.5 bg-gradient-to-r from-cyan-400 to-teal-400 rounded-full transition-all duration-300"
                        />
                      </div>
                    </motion.button>
                  ) : (
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-full sm:w-auto max-w-sm mx-auto"
                    >
                      <Button
                        onClick={() => setShowSignInDialog(true)}
                        variant="outline"
                        className={`${poppins.className} border-white/30 text-white/80 hover:text-white hover:border-white/60 hover:bg-white/10 transition-all duration-300 px-4 xs:px-6 sm:px-8 py-2 xs:py-2.5 sm:py-3 text-sm xs:text-base sm:text-lg font-medium rounded-full backdrop-blur-md w-full sm:w-auto max-w-xs xs:max-w-sm`}
                      >
                        Sign In
                      </Button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="past-spaces"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="min-h-screen py-4 xs:py-6 sm:py-8"
            >
              <div className="container mx-auto px-3 xs:px-4 sm:px-6 max-w-4xl">
                <div className="text-center mb-6 xs:mb-8 sm:mb-12">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCreateNewSpace}
                    className="text-zinc-400 hover:text-cyan-400 transition-colors duration-300 mb-3 xs:mb-4 sm:mb-6 inline-flex items-center gap-2 text-xs xs:text-sm sm:text-base"
                  >
                    ← Create New Space
                  </motion.button>
                  
                  <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${lexend.className} text-xl xs:text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 xs:mb-3 sm:mb-4 px-2`}
                  >
                    Your Past Spaces
                  </motion.h1>
                  
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-zinc-400 text-sm xs:text-base sm:text-lg px-2"
                  >
                    Join your previously created music rooms
                  </motion.p>
                </div>

                {spacesLoading ? (
                  <div className="py-8 xs:py-12 sm:py-16">
                    <SpacesGridSkeleton count={3} />
                  </div>
                ) : spacesError ? (
                  <div className="text-center py-8 xs:py-12 sm:py-16 px-3 xs:px-4">
                    <h3 className="text-base xs:text-lg sm:text-xl font-bold text-red-400 mb-2 xs:mb-3 sm:mb-4">Error Loading Spaces</h3>
                    <p className="text-zinc-500 mb-3 xs:mb-4 sm:mb-6 text-xs xs:text-sm sm:text-base">
                      {spacesError instanceof Error ? spacesError.message : 'Something went wrong while loading your spaces.'}
                    </p>
                    <Button
                      onClick={() => refetchSpaces()}
                      className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 w-full sm:w-auto"
                    >
                      Try Again
                    </Button>
                  </div>
                ) : spaces.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8 xs:py-12 sm:py-16 px-3 xs:px-4"
                  >
                    <h3 className="text-base xs:text-lg sm:text-xl font-bold text-zinc-300 mb-2 xs:mb-3 sm:mb-4">No Spaces Found</h3>
                    <p className="text-zinc-500 mb-3 xs:mb-4 sm:mb-6 text-xs xs:text-sm sm:text-base">You haven't created any spaces yet.</p>
                    <Button
                      onClick={() => setShowPastSpaces(false)}
                      className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 w-full sm:w-auto"
                    >
                      Create Your First Space
                    </Button>
                  </motion.div>
                ) : (
                  <div>
                    {/* Create New Space Button */}
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center mb-6 xs:mb-8 sm:mb-10"
                    >
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCreateNewSpace}
                        className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white px-6 xs:px-8 sm:px-10 py-3 xs:py-4 sm:py-5 text-sm xs:text-base sm:text-lg font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-cyan-500/25"
                      >
                        + Create New Space
                      </motion.button>
                    </motion.div>

                    {/* Past Spaces Grid */}
                    <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 xs:gap-4 sm:gap-6">
                      {spaces.map((space, index) => (
                        <motion.div
                          key={space.id}
                          variants={cardVariants}
                          initial="hidden"
                          animate="visible"
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                          <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800 hover:border-cyan-400/50 transition-all duration-300 group hover:shadow-lg hover:shadow-cyan-400/10">
                            <CardContent className="p-3 xs:p-4 sm:p-6">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-sm xs:text-base sm:text-lg font-semibold text-white mb-1 xs:mb-1 sm:mb-2 group-hover:text-cyan-400 transition-colors duration-300 truncate">
                                    {space.name}
                                  </h3>
                                  <p className="text-xs text-zinc-400 mb-1 xs:mb-2 sm:mb-4">
                                    {space.isActive ? 'Active' : 'Inactive'} • {space._count?.streams || 0} tracks
                                  </p>
                                </div>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => handleJoinSpace(space.id)}
                                  className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white p-1.5 xs:p-2 sm:p-2.5 rounded-full transition-all duration-300 shadow-lg flex-shrink-0 hover:shadow-cyan-500/25 flex items-center justify-center"
                                >
                                  <Play className="w-3 h-3 sm:w-4 sm:h-4" />
                                </motion.button>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        )}
      </div>
      
      <SignInDialog
        isOpen={showSignInDialog}
        onClose={() => setShowSignInDialog(false)}
        title="Welcome to Deciball"
        description="Sign in to create and join music spaces with your friends!"
        callbackURL="/"
      />
    </div>
  );
}