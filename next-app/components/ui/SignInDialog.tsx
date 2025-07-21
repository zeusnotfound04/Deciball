"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/app/components/ui/button";
import { signIn } from "next-auth/react";
import { X, LogIn } from "lucide-react";
import { poppins } from "@/lib/font";

interface SignInDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export default function SignInDialog({ 
  isOpen, 
  onClose, 
  title = "Sign In Required",
  description = "Please sign in to continue using Deciball"
}: SignInDialogProps) {
  
  const handleGoogleSignIn = async () => {
    try {
      await signIn("google", { 
        callbackUrl: window.location.href 
      });
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <motion.h2 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className={`${poppins.className} text-xl sm:text-2xl font-bold text-white`}
                >
                  {title}
                </motion.h2>
                
                <motion.button
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors duration-200 p-1"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-gray-300 mb-8 text-center text-sm sm:text-base"
              >
                {description}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                <motion.button
                  whileHover={{ 
                    scale: 1.02,
                    boxShadow: "0 8px 25px rgba(59, 130, 246, 0.3)"
                  }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGoogleSignIn}
                  className={`${poppins.className} w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 border border-blue-500/30 hover:border-blue-400/50`}
                >
                  <LogIn className="w-5 h-5" />
                  <span>Continue with Google</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className={`${poppins.className} w-full bg-zinc-800 hover:bg-zinc-700 text-gray-300 hover:text-white font-medium py-3 px-6 rounded-xl transition-all duration-300 border border-zinc-700 hover:border-zinc-600`}
                >
                  Cancel
                </motion.button>
              </motion.div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
