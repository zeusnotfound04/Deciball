"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnimatedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline';
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  loadingText = "Loading...",
  className,
  size = 'md',
  variant = 'primary'
}) => {
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 xs:px-8 sm:px-12 md:px-16 py-3 xs:py-4 sm:py-5 text-base xs:text-lg sm:text-xl',
    lg: 'px-8 py-4 text-lg'
  };

  const variantClasses = {
    primary: 'bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 text-white border-zinc-600/50',
    secondary: 'bg-gradient-to-r from-zinc-700 via-zinc-600 to-zinc-700 text-white border-zinc-500/50',
    outline: 'bg-transparent text-white border-zinc-500/70 hover:bg-zinc-800/30'
  };

  return (
    <div className="relative group perspective-1000">
      {/* Static background border */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-zinc-600/50 via-zinc-500/50 to-zinc-600/50 p-[1px]">
        <div className="w-full h-full bg-transparent rounded-2xl" />
      </div>

      {/* Subtle background glow */}
      <div className="absolute inset-1 bg-gradient-to-r from-zinc-900/30 via-zinc-800/30 to-zinc-900/30 rounded-2xl blur-sm" />

      {/* Main button */}
      <motion.button
        onClick={onClick}
        disabled={disabled || loading}
        className={cn(
          "relative z-10 font-bold rounded-2xl transition-all duration-500 border-2",
          "focus:outline-none focus:ring-4 focus:ring-zinc-400/30",
          "w-full sm:w-auto min-w-[200px]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "overflow-hidden backdrop-blur-sm",
          "shadow-2xl hover:shadow-zinc-500/25",
          "transform-gpu",
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        whileHover={!disabled && !loading ? { 
          scale: 1.05,
          y: -4,
          rotateX: 5,
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        } : {}}
        whileTap={!disabled && !loading ? { 
          scale: 0.95,
          y: 0,
          rotateX: 0,
        } : {}}
        initial={{ opacity: 0, y: 30, rotateX: -10 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ 
          duration: 0.8,
          type: "spring",
          stiffness: 300,
          damping: 20
        }}
      >
        {/* Inner gradient overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-zinc-600/0 via-zinc-400/20 to-zinc-600/0 opacity-0"
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />

        {/* Ripple effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-radial from-white/10 via-transparent to-transparent opacity-0"
          whileTap={{ 
            opacity: [0, 1, 0],
            scale: [0, 1.5, 2] 
          }}
          transition={{ duration: 0.6 }}
        />

        {/* Button content with enhanced typography */}
        <div className="relative z-10 flex items-center justify-center gap-3">
          {loading ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="relative"
              >
                <Loader2 className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6" />
                <motion.div
                  className="absolute inset-0 border-2 border-t-white/60 border-r-transparent border-b-transparent border-l-transparent rounded-full"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                />
              </motion.div>
              <motion.span 
                className="font-bold tracking-wide"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {loadingText}
              </motion.span>
            </>
          ) : (
            <motion.span
              className="font-bold tracking-wider text-shadow-lg relative"
              initial={{ opacity: 0, letterSpacing: "0.05em" }}
              animate={{ opacity: 1, letterSpacing: "0.1em" }}
              whileHover={{ letterSpacing: "0.15em" }}
              transition={{ duration: 0.3 }}
            >
              {children}
              {/* Text glow effect */}
              <motion.span
                className="absolute inset-0 text-white/60 blur-sm"
                animate={{
                  opacity: disabled || loading ? 0 : [0, 0.8, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {children}
              </motion.span>
            </motion.span>
          )}
        </div>

        {/* Corner accents */}
        <div className="absolute top-1 left-1 w-3 h-3 border-l-2 border-t-2 border-zinc-400/50 rounded-tl-xl" />
        <div className="absolute top-1 right-1 w-3 h-3 border-r-2 border-t-2 border-zinc-400/50 rounded-tr-xl" />
        <div className="absolute bottom-1 left-1 w-3 h-3 border-l-2 border-b-2 border-zinc-400/50 rounded-bl-xl" />
        <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-zinc-400/50 rounded-br-xl" />
      </motion.button>

      {/* Enhanced particle system */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-gradient-to-r from-zinc-400 to-zinc-300 rounded-full shadow-lg"
            style={{
              left: `${10 + (i * 8) % 80}%`,
              top: `${20 + (i % 3) * 30}%`,
            }}
            animate={{
              opacity: disabled || loading ? 0 : [0, 1, 0],
              scale: disabled || loading ? 0 : [0, 1.5, 0],
              y: disabled || loading ? 0 : [0, -30, -60],
              x: disabled || loading ? 0 : [0, Math.sin(i) * 20, Math.sin(i) * 40],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeOut"
            }}
          />
        ))}
      </div>

      {/* Floating orbs */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-zinc-400/30 rounded-full blur-sm"
            style={{
              left: `${25 + i * 20}%`,
              top: `${50}%`,
            }}
            animate={{
              y: disabled || loading ? 0 : [0, -20, 0],
              opacity: disabled || loading ? 0 : [0.3, 0.8, 0.3],
              scale: disabled || loading ? 0 : [1, 1.5, 1],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default AnimatedButton;
