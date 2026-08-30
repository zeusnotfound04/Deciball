"use client";

import React, { memo } from "react";
import dynamic from "next/dynamic";

const AudioWaves = dynamic(() => import("./AudioWaves"), { ssr: false });

interface StableAudioWavesProps {
  color?: string;
  barCount?: number;
  speed?: number;
  opacity?: number;
  className?: string;
}

const StableAudioWaves = memo(
  function StableAudioWaves(props: StableAudioWavesProps) {
    return <AudioWaves {...props} />;
  },
  () => true
);

export default StableAudioWaves;
