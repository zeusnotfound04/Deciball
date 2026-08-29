'use client';

import { motion } from 'framer-motion';

export const Trademark = () => {
  const handleClick = () => {
    window.open('https://zeusnotfound.tech', '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div
      className="fixed bottom-4 right-4 z-50 cursor-pointer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1, duration: 0.6, ease: "easeOut" }}
      onClick={handleClick}
    >
      <motion.div
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="bg-midnight-surface border border-graphite rounded-cards px-3 py-2"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] tracking-[0.02em] uppercase text-steel-gray font-mono">
            Built by
          </span>
          <span className="text-xs text-paper-white font-mono">
            Zeus Notfound
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
};
