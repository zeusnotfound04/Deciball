'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Home, Plus } from 'lucide-react';


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
            className="fixed inset-0 bg-void-black/80 z-50"
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
            <div className="bg-midnight-surface border border-graphite rounded-cards max-w-md w-full mx-4 overflow-hidden">
              {/* Header */}
              <div className="relative p-6 pb-4">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-1 rounded-full hover:bg-charcoal transition-colors text-steel-gray hover:text-paper-white"
                >
                  <X size={20} />
                </button>
                
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-graphite rounded-full flex items-center justify-center">
                    <div className="w-6 h-6 bg-electric-cyan rounded-full animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-electric-cyan font-serif">
                      Space Ended
                    </h2>
                    {spaceName && (
                      <p className="text-sm text-steel-gray font-satoshi">
                        "{spaceName}"
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 pb-6">
                <div className="mb-6">
                  <p className="text-steel-gray leading-relaxed font-satoshi">
                    {message}
                  </p>
                  
                  {reason === 'admin-left' && (
                    <div className="mt-3 p-3 bg-graphite border border-graphite rounded-cards">
                      <p className="text-sm text-steel-gray font-satoshi">
                        <span className="font-medium text-electric-cyan">Admin disconnected:</span> The space creator has left and the session has ended.
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
                    className="w-full bg-graphite text-paper-white py-3 px-4 rounded-full font-mono text-sm hover:bg-charcoal transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    Create New Space
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onGoHome}
                    className="w-full bg-void-black hover:bg-charcoal border border-graphite text-paper-white py-3 px-4 rounded-full font-mono text-sm transition-all duration-300 flex items-center justify-center gap-2"
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
