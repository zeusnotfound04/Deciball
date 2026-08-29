"use client";

import { motion } from "framer-motion";

interface LoaderProps {
  label?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
}

const barHeights = {
  sm: [8, 14, 11, 16, 10],
  md: [12, 20, 16, 24, 14],
  lg: [16, 28, 22, 32, 18],
};

const barWidth = {
  sm: 2,
  md: 3,
  lg: 4,
};

export default function Loader({ label, size = "md", fullScreen = false }: LoaderProps) {
  const heights = barHeights[size];
  const w = barWidth[size];

  const bars = (
    <div className="flex items-center justify-center gap-[3px]">
      {heights.map((h, i) => (
        <motion.div
          key={i}
          className="rounded-full bg-electric-cyan"
          style={{ width: w }}
          animate={{ height: [h * 0.4, h, h * 0.6, h * 0.9, h * 0.4] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.12,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-void-black flex items-center justify-center">
        <div className="text-center">
          <div className="mb-5">{bars}</div>
          {label && (
            <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-steel-gray">
              {label}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {bars}
      {label && (
        <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-steel-gray">
          {label}
        </p>
      )}
    </div>
  );
}
