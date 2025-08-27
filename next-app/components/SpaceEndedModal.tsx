'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Home, Plus } from 'lucide-react';
import { inter, outfit } from '@/lib/font';

interface SpaceEndedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateNewSpace: () => void;
  onGoHome: () => void;
  spaceName?: string;
  reason?: string;
  message?: string;
}

const SpaceEndedModal: React.FC<SpaceEndedModalProps> = ({
  isOpen,
  onClose,
  onCreateNewSpace,
  onGoHome,
  spaceName,
  reason = 'admin-left',
  message = 'The space admin has left. You can create a new space or join another one.'
}) => {
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ 
              type: "spring", 
              duration: 0.4,
              bounce: 0.25
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
              {/* Header */}
              <div className="relative p-6 pb-4">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                >
                  <X size={20} />
                </button>
                
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-cyan-400/20 rounded-full flex items-center justify-center">
                    <div className="w-6 h-6 bg-gradient-to-r from-cyan-400 to-teal-400 rounded-full animate-pulse" />
                  </div>
                  <div>
                    <h2 className={`text-xl font-semibold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent ${outfit.className}`}>
                      Space Ended
                    </h2>
                    {spaceName && (
                      <p className={`text-sm text-white/70 ${inter.className}`}>
                        "{spaceName}"
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 pb-6">
                <div className="mb-6">
                  <p className={`text-white/70 leading-relaxed ${inter.className}`}>
                    {message}
                  </p>
                  
                  {reason === 'admin-left' && (
                    <div className="mt-3 p-3 bg-white/5 border border-white/20 rounded-lg">
                      <p className={`text-sm text-white/70 ${inter.className}`}>
                        <span className="font-medium text-cyan-400">Admin disconnected:</span> The space creator has left and the session has ended.
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onCreateNewSpace}
                    className={`w-full bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-white py-3 px-4 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${outfit.className}`}
                  >
                    <Plus size={18} />
                    Create New Space
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onGoHome}
                    className={`w-full bg-white/5 hover:bg-white/10 border border-white/20 hover:border-white/30 text-white py-3 px-4 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${outfit.className}`}
                  >
                    <Home size={18} />
                    Go to Dashboard
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SpaceEndedModal;
