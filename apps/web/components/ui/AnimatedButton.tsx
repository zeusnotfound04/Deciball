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

const sizeClasses = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-base',
} as const;

const variantClasses = {
  primary: 'bg-graphite text-paper-white hover:bg-charcoal',
  secondary: 'bg-midnight-surface text-paper-white border border-graphite hover:bg-charcoal',
  outline: 'bg-transparent text-paper-white border border-slate-custom hover:bg-charcoal',
} as const;

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  loadingText = "Loading...",
  className,
  size = 'md',
  variant = 'primary',
}) => {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'font-mono rounded-full transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-paper-white/40',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      whileTap={!disabled && !loading ? { scale: 0.97 } : undefined}
    >
      <span className="flex items-center justify-center gap-2">
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{loadingText}</span>
          </>
        ) : (
          children
        )}
      </span>
    </motion.button>
  );
};

export default AnimatedButton;
