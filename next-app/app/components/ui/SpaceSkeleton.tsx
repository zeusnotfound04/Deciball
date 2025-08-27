'use client';

import { motion } from "framer-motion";

export function SpaceCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-lg p-3 xs:p-4 sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Space name skeleton */}
          <div className="h-4 sm:h-5 bg-zinc-700/50 rounded-md mb-2 w-3/4 animate-pulse" />
          {/* Status skeleton */}
          <div className="h-3 bg-zinc-700/50 rounded-md w-1/2 animate-pulse" />
        </div>
        {/* Play button skeleton */}
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-zinc-700/50 rounded-full animate-pulse flex-shrink-0" />
      </div>
    </motion.div>
  );
}

export function SpacesGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 xs:gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <SpaceCardSkeleton key={index} />
      ))}
    </div>
  );
}
