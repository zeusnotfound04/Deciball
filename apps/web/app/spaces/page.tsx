"use client"

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Loader2, Play } from "lucide-react";
import DarkGradientBackground from "@/components/Background";
import { signikaNegative, lexend, poppins } from "@/lib/font";
import axios from "axios";
import GlitchText from "@/components/ui/glitch-text";
import SignInDialog from "@/components/ui/SignInDialog";

interface Space {
  id: string;
  name: string;
  hostId: string;
  isActive: boolean;
  _count?: {
    streams: number;
  };
}

export default function SpacesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(false);
  const [spaceName, setSpaceName] = useState("");
  const [showPastSpaces, setShowPastSpaces] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleCreateSpace = async () => {
    if (!spaceName.trim()) return;
    
    if (status !== 'authenticated') {
      setShowSignInDialog(true);
      return;
    }

    try {
      setIsCreating(true);
      const response = await axios.post('/api/spaces', {
        spaceName: spaceName.trim()
      });
      
      if (response.data.space) {
        router.push(`/space/${response.data.space.id}`);
      }
    } catch (error) {
      console.error('Error creating space:', error);
    } finally {
      setIsCreating(false);
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
    fetchSpaces();
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
    <DarkGradientBackground>
      <div className="relative z-10 min-h-screen">
        <AnimatePresence mode="wait">
          {!showPastSpaces ? (
            <motion.div
              key="onboarding"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.6 }}
              className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-0"
            >
              <motion.h1
                variants={textVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.8, delay: 0.2 }}
                className={`${signikaNegative.className} text-3xl sm:text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-center text-white mb-4 sm:mb-6 leading-tight px-2`}
              >
                Sync the Beat, Vote the Heat!
              </motion.h1>

              <motion.div
                variants={textVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.8, delay: 0.6 }}
                className="relative mb-8 sm:mb-12"
              >
                <GlitchText
                  speed={1}
                  enableShadows={true}
                  enableOnHover={false}
                  className={`${lexend.className} text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold text-center bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent px-2`}
                >
                  Deciball
                </GlitchText>

              </motion.div>

              <motion.div
                variants={textVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.8, delay: 1.0 }}
                className="w-full max-w-sm sm:max-w-md md:max-w-lg relative mb-6 sm:mb-8 px-4 sm:px-0"
              >
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Enter your space name..."
                  value={spaceName}
                  onChange={(e) => setSpaceName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 bg-white text-black placeholder-gray-500 text-lg sm:text-xl border-2 border-gray-300 rounded-xl focus:border-black focus:ring-0 focus:outline-none transition-all duration-300"
                  disabled={isCreating}
                />
              </motion.div>

              <motion.div
                variants={textVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.8, delay: 1.2 }}
                className="mb-16 sm:mb-20 px-4 sm:px-0"
              >
                <motion.button
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)"
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCreateSpace}
                  disabled={!spaceName.trim() || isCreating}
                  className={`${poppins.className} bg-black text-white px-8 sm:px-12 md:px-16 py-4 sm:py-5 text-lg sm:text-xl font-semibold rounded-2xl hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 border-2 border-transparent hover:border-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-300/50 w-full sm:w-auto`}
                >
                  {isCreating ? (
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
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
                className="fixed bottom-0 left-0 right-0 pb-6 sm:pb-8 pt-4 sm:pt-6 bg-gradient-to-t from-black/20 to-transparent backdrop-blur-sm px-4"
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
                      className={`${poppins.className} text-white/80 hover:text-white transition-all duration-300 text-base sm:text-lg font-medium group bg-white/10 backdrop-blur-md px-6 sm:px-8 py-2.5 sm:py-3 rounded-full border border-white/20 hover:border-white/40 hover:bg-white/20 w-full sm:w-auto max-w-sm text-center`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-sm sm:text-base">View Past Created Spaces</span>
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
                      className="w-full sm:w-auto max-w-sm"
                    >
                      <Button
                        onClick={() => setShowSignInDialog(true)}
                        variant="outline"
                        className={`${poppins.className} border-white/30 text-white/80 hover:text-white hover:border-white/60 hover:bg-white/10 transition-all duration-300 px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg font-medium rounded-full backdrop-blur-md w-full sm:w-auto`}
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
              className="min-h-screen py-6 sm:py-8"
            >
              <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-8 sm:mb-12">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowPastSpaces(false)}
                    className="text-zinc-400 hover:text-cyan-400 transition-colors duration-300 mb-4 sm:mb-6 inline-flex items-center gap-2 text-sm sm:text-base"
                  >
                    ← Back to Create
                  </motion.button>
                  
                  <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${lexend.className} text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4 px-2`}
                  >
                    Your Past Spaces
                  </motion.h1>
                  
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-zinc-400 text-base sm:text-lg px-2"
                  >
                    Join your previously created music rooms
                  </motion.p>
                </div>

                {loading ? (
                  <div className="flex justify-center py-12 sm:py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                  </div>
                ) : spaces.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12 sm:py-16 px-4"
                  >
                    <h3 className="text-lg sm:text-xl font-bold text-zinc-300 mb-3 sm:mb-4">No Spaces Found</h3>
                    <p className="text-zinc-500 mb-4 sm:mb-6 text-sm sm:text-base">You haven't created any spaces yet.</p>
                    <Button
                      onClick={() => setShowPastSpaces(false)}
                      className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 w-full sm:w-auto"
                    >
                      Create Your First Space
                    </Button>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {spaces.map((space, index) => (
                      <motion.div
                        key={space.id}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                      >
                        <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800 hover:border-cyan-400/50 transition-all duration-300 group">
                          <CardContent className="p-4 sm:p-6">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2 group-hover:text-cyan-400 transition-colors duration-300 truncate">
                                  {space.name}
                                </h3>
                                <p className="text-xs sm:text-sm text-zinc-400 mb-2 sm:mb-4">
                                  {space.isActive ? 'Active' : 'Inactive'} • {space._count?.streams || 0} tracks
                                </p>
                              </div>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleJoinSpace(space.id)}
                                className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white p-2 sm:p-2.5 rounded-full transition-all duration-300 shadow-lg ml-3 flex-shrink-0"
                              >
                                <Play className="w-3 h-3 sm:w-4 sm:h-4" />
                              </motion.button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <SignInDialog
        isOpen={showSignInDialog}
        onClose={() => setShowSignInDialog(false)}
        title="Sign In to Continue"
        description="Create your music space and start jamming with friends!"
      />
    </DarkGradientBackground>
  );
}