"use client";

import React, { memo } from "react";
import dynamic from "next/dynamic";

// Dynamically import PixelBlast with no SSR to avoid hydration issues
const PixelBlast = dynamic(() => import("./PixelBlast"), { ssr: false });

interface StablePixelBlastProps {
  variant?: "square" | "circle" | "triangle" | "diamond";
  pixelSize?: number;
  color?: string;
  speed?: number;
  patternDensity?: number;
  edgeFade?: number;
  enableRipples?: boolean;
  rippleSpeed?: number;
  rippleIntensityScale?: number;
}

// Memoized wrapper — never re-renders regardless of parent state changes
const StablePixelBlast = memo(
  function StablePixelBlast(props: StablePixelBlastProps) {
    return <PixelBlast {...props} />;
  },
  // Always return true = never re-render
  () => true
);

export default StablePixelBlast;
