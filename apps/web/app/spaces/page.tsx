"use client"

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Play } from "lucide-react";
import DarkGradientBackground from "@/components/Background";
import axios from "axios";
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

  const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <DarkGradientBackground>
      <div className="min-h-screen">
        <AnimatePresence mode="wait">
          {!showPastSpaces ? (
            <motion.div
              key="onboarding"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6"
            >
              {/* Tagline */}
              <motion.p
                variants={textVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.6, delay: 0.2 }}
                className="font-mono text-xs sm:text-sm tracking-[0.02em] uppercase text-steel-gray mb-6"
              >
                Sync the Beat, Share the Vibe
              </motion.p>

              {/* Brand wordmark */}
              <motion.h1
                variants={textVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.6, delay: 0.4 }}
                className="font-serif italic text-[48px] sm:text-[72px] md:text-[96px] leading-[0.9] tracking-[-0.04em] text-paper-white mb-10 sm:mb-14"
              >
                Deciball
              </motion.h1>

              {/* Space name input */}
              <motion.div
                variants={textVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.6, delay: 0.6 }}
                className="w-full max-w-md mb-6 px-2 sm:px-0"
              >
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Enter your space name..."
                  value={spaceName}
                  maxLength={30}
                  onChange={(e) => setSpaceName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateSpace()}
                  className="w-full bg-midnight-surface border border-graphite rounded-cards px-6 py-4 font-mono text-sm text-paper-white placeholder:text-steel-gray focus:outline-none focus:border-slate-custom transition-colors"
                  disabled={isCreating}
                />
              </motion.div>

              {/* Jam Now button */}
              <motion.div
                variants={textVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.6, delay: 0.8 }}
                className="mb-20"
              >
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCreateSpace}
                  disabled={!spaceName.trim() || isCreating}
                  className="font-mono text-sm bg-graphite text-paper-white px-10 py-4 rounded-full hover:bg-charcoal disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreating ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    "Jam Now"
                  )}
                </motion.button>
              </motion.div>

              {/* Bottom action */}
              <motion.div
                variants={textVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.6, delay: 1.0 }}
                className="fixed bottom-0 left-0 right-0 pb-6 pt-4 px-4 flex justify-center"
              >
                {status === 'authenticated' ? (
                  <button
                    onClick={handleViewPastSpaces}
                    className="font-mono text-sm text-steel-gray hover:text-paper-white border border-graphite hover:border-slate-custom rounded-full px-6 py-2.5 transition-colors"
                  >
                    View Past Created Spaces
                  </button>
                ) : (
                  <button
                    onClick={() => setShowSignInDialog(true)}
                    className="font-mono text-sm text-steel-gray hover:text-paper-white border border-graphite hover:border-slate-custom rounded-full px-6 py-2.5 transition-colors"
                  >
                    Sign In
                  </button>
                )}
              </motion.div>
            </motion.div>
          ) : (
            /* Past spaces view */
            <motion.div
              key="past-spaces"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="min-h-screen py-8"
            >
              <div className="mx-auto px-4 sm:px-6 max-w-page">
                <div className="text-center mb-12">
                  <button
                    onClick={() => setShowPastSpaces(false)}
                    className="font-mono text-sm text-steel-gray hover:text-electric-cyan transition-colors mb-6 inline-flex items-center gap-2"
                  >
                    ← Back to Create
                  </button>

                  <h1 className="font-serif italic text-[40px] sm:text-[48px] leading-[1.1] tracking-[-0.03em] text-paper-white mb-3">
                    Your Past Spaces
                  </h1>

                  <p className="font-satoshi text-[17px] text-steel-gray">
                    Join your previously created music spaces
                  </p>
                </div>

                {loading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-electric-cyan" />
                  </div>
                ) : spaces.length === 0 ? (
                  <div className="text-center py-16">
                    <h3 className="font-mono text-sm text-ghost-gray mb-3">No Spaces Found</h3>
                    <p className="font-satoshi text-sm text-steel-gray mb-6">You haven&apos;t created any spaces yet.</p>
                    <button
                      onClick={() => setShowPastSpaces(false)}
                      className="font-mono text-sm bg-graphite text-paper-white rounded-full px-6 py-2.5 hover:bg-charcoal transition-colors"
                    >
                      Create Your First Space
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {spaces.map((space, index) => (
                      <motion.div
                        key={space.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="bg-midnight-surface border border-graphite rounded-cards p-6 hover:border-slate-custom transition-colors group"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-serif italic text-lg text-paper-white mb-1 truncate group-hover:text-electric-cyan transition-colors">
                              {space.name}
                            </h3>
                            <p className="font-mono text-[10px] tracking-[0.02em] text-steel-gray">
                              {space.isActive ? 'Active' : 'Inactive'} · {space._count?.streams || 0} tracks
                            </p>
                          </div>
                          <button
                            onClick={() => handleJoinSpace(space.id)}
                            className="bg-graphite text-paper-white p-2.5 rounded-full hover:bg-charcoal transition-colors flex-shrink-0"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        </div>
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
