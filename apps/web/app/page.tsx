"use client"

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Play } from "lucide-react";
import Loader from "@/components/ui/Loader";
import AnimatedButton from "@/components/ui/AnimatedButton";
import SignInDialog from "@/components/ui/SignInDialog";
import StableFuzzyText from "@/components/ui/StableFuzzyText";
import StableShinyText from "@/components/ui/StableShinyText";
import StableAudioWaves from "@/components/ui/StableAudioWaves";
import AlbumGrid from "@/components/ui/AlbumGrid";
import { useUserSpaces, useCreateSpace, usePrefetchUserSpaces } from "@/app/hooks/useSpaces";
import { SpacesGridSkeleton } from "@/app/components/ui/SpaceSkeleton";


export default function Page() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [spaceName, setSpaceName] = useState("");
  const [showPastSpaces, setShowPastSpaces] = useState(false);
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [exitSpaceId, setExitSpaceId] = useState<string | null>(null);

  const {
    data: spaces = [],
    isLoading: spacesLoading,
    error: spacesError,
    refetch: refetchSpaces
  } = useUserSpaces();

  const createSpaceMutation = useCreateSpace();
  const prefetchUserSpaces = usePrefetchUserSpaces();

  useEffect(() => {
    if (status === 'authenticated' && !initialLoadComplete) {
      prefetchUserSpaces();
      if (spaces.length > 0) {
        setShowPastSpaces(true);
      }
      setInitialLoadComplete(true);
    } else if (status !== 'loading' && status !== 'authenticated') {
      setInitialLoadComplete(true);
    }
  }, [status, spaces.length, initialLoadComplete, prefetchUserSpaces]);

  const navigateToSpace = (spaceId: string) => {
    setIsExiting(true);
    setExitSpaceId(spaceId);
    setTimeout(() => {
      router.push(`/space/${spaceId}`);
    }, 600);
  };

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
        navigateToSpace(newSpace.id);
      }
    } catch (error) {
      console.error('Error creating space:', error);
    }
  };

  const handleJoinSpace = (spaceId: string) => {
    navigateToSpace(spaceId);
  };

  const handleViewPastSpaces = () => {
    if (status !== 'authenticated') {
      setShowSignInDialog(true);
      return;
    }

    setShowPastSpaces(true);
    if (spaces.length === 0) {
      refetchSpaces();
    }
  };

  const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      className="bg-void-black min-h-screen relative"
      animate={isExiting ? { opacity: 0, scale: 0.97, filter: 'blur(8px)' } : { opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Background layers */}
      <div className="fixed inset-0 z-0">
        {/* Layer 1: Album cover mosaic */}
        <AlbumGrid />
        {/* Layer 2: Audio waveform overlay on top */}
        <div className="absolute inset-0">
          <StableAudioWaves color="#ffffff" barCount={64} speed={0.8} opacity={0.10} />
        </div>
      </div>

      {/* Page content — above CRT */}
      <div className="relative z-10">
      {/* Loading state */}
      {(status === 'loading' || (status === 'authenticated' && !initialLoadComplete)) && (
        <Loader fullScreen />
      )}

      {/* Main content */}
      {status !== 'loading' && initialLoadComplete && (
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
              <motion.div
                variants={textVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mb-6"
              >
                <StableFuzzyText
                  fontSize="clamp(1rem, 3vw, 1.25rem)"
                  fontWeight={600}
                  color="#ffffff"
                  enableHover={true}
                  baseIntensity={0.03}
                  hoverIntensity={0.15}
                  fuzzRange={8}
                  fps={30}
                  className="font-mono tracking-[0.08em] uppercase"
                >
                  Sync the Beat, Share the Vibe
                </StableFuzzyText>
              </motion.div>

              {/* Brand wordmark */}
              <motion.div
                variants={textVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mb-10 sm:mb-14"
              >
                <StableShinyText
                  text="Deciball"
                  speed={2}
                  color="#7f7f7f"
                  shineColor="#ffffff"
                  spread={90}
                  className="font-serif italic text-[64px] sm:text-[96px] md:text-[128px] leading-[0.9] tracking-[-0.04em] pr-[0.15em]"
                />
              </motion.div>

              {/* Space name — the typing IS the visual */}
              <motion.div
                variants={textVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.6, delay: 0.6 }}
                className="w-full max-w-2xl mb-12 px-4 sm:px-0 text-center"
              >
                <div className="relative">
                  <input
                    type="text"
                    placeholder="name your space..."
                    value={spaceName}
                    maxLength={30}
                    onChange={(e) => setSpaceName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateSpace()}
                    className="w-full bg-transparent border-b-2 border-paper-white/40 focus:border-paper-white/80 font-satoshi font-medium text-[32px] sm:text-[44px] md:text-[56px] leading-[1.2] tracking-[-0.01em] text-paper-white placeholder:text-paper-white/40 text-center focus:outline-none caret-paper-white py-4 transition-colors duration-300"
                    disabled={createSpaceMutation.isPending}
                  />
                </div>

                <motion.div
                  className="mt-8"
                  animate={{ opacity: spaceName.trim() ? 1 : 0, y: spaceName.trim() ? 0 : 10 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleCreateSpace}
                    disabled={!spaceName.trim() || createSpaceMutation.isPending || isExiting}
                    className="font-mono text-sm tracking-[0.1em] uppercase text-paper-white/70 hover:text-paper-white bg-paper-white/10 hover:bg-paper-white/20 border border-paper-white/20 hover:border-paper-white/40 rounded-full px-10 py-3.5 transition-all duration-300 disabled:cursor-not-allowed backdrop-blur-sm"
                  >
                    {createSpaceMutation.isPending || isExiting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {isExiting ? 'entering...' : 'creating...'}
                      </span>
                    ) : (
                      "enter the space \u2192"
                    )}
                  </motion.button>
                </motion.div>
              </motion.div>

              {/* Bottom action */}
              <motion.div
                variants={textVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.6, delay: 1.0 }}
                className="fixed bottom-0 left-0 right-0 pb-6 pt-4 px-4 flex justify-center"
              >
                <div className="bg-paper-white/[0.05] backdrop-blur-md border border-paper-white/[0.08] rounded-2xl px-2 py-2">
                {status === 'authenticated' ? (
                  <button
                    onClick={handleViewPastSpaces}
                    onMouseEnter={() => prefetchUserSpaces()}
                    className="font-mono text-sm text-ghost-gray hover:text-paper-white rounded-full px-6 py-2.5 transition-colors"
                  >
                    View Past Created Spaces
                  </button>
                ) : (
                  <button
                    onClick={() => setShowSignInDialog(true)}
                    className="font-mono text-sm text-ghost-gray hover:text-paper-white rounded-full px-6 py-2.5 transition-colors"
                  >
                    Sign In
                  </button>
                )}
                </div>
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
                    ← Create New Space
                  </button>

                  <h1 className="font-serif italic text-[40px] sm:text-[48px] leading-[1.1] tracking-[-0.03em] text-paper-white mb-3">
                    Your Past Spaces
                  </h1>

                  <p className="font-satoshi text-[17px] text-steel-gray">
                    Join your previously created music spaces
                  </p>
                </div>

                {spacesLoading ? (
                  <div className="py-16">
                    <SpacesGridSkeleton count={3} />
                  </div>
                ) : spacesError ? (
                  <div className="text-center py-16">
                    <h3 className="font-mono text-sm text-red-400 mb-3">Error Loading Spaces</h3>
                    <p className="font-satoshi text-sm text-steel-gray mb-6">
                      {spacesError instanceof Error ? spacesError.message : 'Something went wrong while loading your spaces.'}
                    </p>
                    <button
                      onClick={() => refetchSpaces()}
                      className="font-mono text-sm bg-graphite text-paper-white rounded-full px-6 py-2.5 hover:bg-charcoal transition-colors"
                    >
                      Try Again
                    </button>
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
                  <div>
                    <div className="text-center mb-10">
                      <button
                        onClick={() => setShowPastSpaces(false)}
                        className="font-mono text-sm bg-graphite text-paper-white rounded-full px-8 py-3 hover:bg-charcoal transition-colors"
                      >
                        + Create New Space
                      </button>
                    </div>

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
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <SignInDialog
        isOpen={showSignInDialog}
        onClose={() => setShowSignInDialog(false)}
        title="Welcome to Deciball"
        description="Sign in to create and join music spaces with your friends!"
        callbackURL="/"
      />
      </div>
    </motion.div>
  );
}
