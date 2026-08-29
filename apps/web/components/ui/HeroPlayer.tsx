"use client";

import { motion } from "framer-motion";
import { Play, SkipBack, SkipForward, Volume2, Heart } from "lucide-react";

const ALBUMS = [
  { img: "https://i.scdn.co/image/ab67616d00001e02ff9ca10b55ce82ae553c8228", title: "After Hours", artist: "The Weeknd" },
  { img: "https://i.scdn.co/image/ab67616d00001e028863bc11d2aa12b54f5aeb36", title: "Random Access Memories", artist: "Daft Punk" },
  { img: "https://i.scdn.co/image/ab67616d00001e02de09e02aa7febf30b7c02d82", title: "Currents", artist: "Tame Impala" },
  { img: "https://i.scdn.co/image/ab67616d00001e02f907de96b9a4fbc04accc2f3", title: "Astroworld", artist: "Travis Scott" },
  { img: "https://i.scdn.co/image/ab67616d00001e02b1c4b76e23414c9f20571f54", title: "Blonde", artist: "Frank Ocean" },
  { img: "https://i.scdn.co/image/ab67616d00001e02f2d2adaa21ad616df6241e7d", title: "IGOR", artist: "Tyler, The Creator" },
  { img: "https://i.scdn.co/image/ab67616d00001e02072e9faef2ef7b6db63834a3", title: "Ctrl", artist: "SZA" },
];

// Currently "playing" album (the hero)
const NOW_PLAYING = ALBUMS[0];

export default function HeroPlayer() {
  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Floating album covers behind the player */}
      <div className="absolute inset-0 -z-10" style={{ top: "-30%", bottom: "-40%" }}>
        {ALBUMS.slice(1).map((album, i) => {
          const positions = [
            { left: "-15%", top: "10%", rotate: -12, scale: 0.55 },
            { right: "-15%", top: "5%", rotate: 8, scale: 0.5 },
            { left: "-25%", bottom: "15%", rotate: 15, scale: 0.45 },
            { right: "-20%", bottom: "10%", rotate: -10, scale: 0.5 },
            { left: "5%", bottom: "-10%", rotate: -6, scale: 0.4 },
            { right: "5%", bottom: "-15%", rotate: 12, scale: 0.45 },
          ];
          const pos = positions[i] || positions[0];

          return (
            <motion.div
              key={i}
              className="absolute"
              style={{
                ...pos,
                width: "160px",
                height: "160px",
              }}
              initial={{ opacity: 0, scale: 0, rotate: 0 }}
              animate={{
                opacity: 0.6,
                scale: pos.scale,
                rotate: pos.rotate,
              }}
              transition={{
                duration: 0.8,
                delay: 0.8 + i * 0.12,
                ease: [0.23, 1, 0.32, 1],
              }}
              whileHover={{ opacity: 0.9, scale: (pos.scale as number) * 1.1 }}
            >
              <img
                src={album.img}
                alt={album.title}
                className="w-full h-full object-cover rounded-2xl shadow-2xl shadow-void-black/80"
                draggable={false}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Main player card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="relative bg-midnight-surface/90 backdrop-blur-xl border border-paper-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-2xl shadow-void-black/50"
      >
        {/* Album art */}
        <motion.div
          className="relative aspect-square w-full rounded-2xl overflow-hidden mb-5"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <img
            src={NOW_PLAYING.img}
            alt={NOW_PLAYING.title}
            className="w-full h-full object-cover"
            draggable={false}
          />
          {/* Subtle reflection gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-midnight-surface/30 via-transparent to-transparent" />
        </motion.div>

        {/* Song info */}
        <div className="mb-4">
          <h3 className="font-satoshi font-bold text-lg text-paper-white truncate">
            {NOW_PLAYING.title}
          </h3>
          <p className="font-mono text-xs text-steel-gray">{NOW_PLAYING.artist}</p>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="w-full h-1 bg-paper-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-paper-white rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "35%" }}
              transition={{ duration: 2, delay: 1, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="font-mono text-[10px] text-steel-gray">1:24</span>
            <span className="font-mono text-[10px] text-steel-gray">3:58</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <button className="text-steel-gray hover:text-paper-white transition-colors p-1">
            <Heart className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-5">
            <button className="text-steel-gray hover:text-paper-white transition-colors">
              <SkipBack className="w-5 h-5" fill="currentColor" />
            </button>
            <button className="w-11 h-11 bg-paper-white rounded-full flex items-center justify-center hover:bg-ghost-gray transition-colors">
              <Play className="w-5 h-5 text-void-black ml-0.5" fill="currentColor" />
            </button>
            <button className="text-steel-gray hover:text-paper-white transition-colors">
              <SkipForward className="w-5 h-5" fill="currentColor" />
            </button>
          </div>

          <button className="text-steel-gray hover:text-paper-white transition-colors p-1">
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
