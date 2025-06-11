"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { Button } from "@/app/components/ui/button"
import { Play, Disc3, Music2, AudioWaveformIcon as Waveform } from "lucide-react"

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  })

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  const [isHovered, setIsHovered] = useState(false)


  return (
    <section ref={containerRef} className="min-h-screen relative overflow-hidden">
      {/* The InteractiveBackground is expected to be rendered by a parent component, like page.tsx */}
      {/* Ensure the div below does not obscure the InteractiveBackground if it's meant to be behind this section's content */}
      <div className="absolute inset-0 overflow-hidden">
        {/* This gradient can remain to darken the InteractiveBackground if desired, or be removed/adjusted */}
        <div className="absolute inset-0 bg-gradient-to-b from-black to-zinc-900 opacity-75"></div>
      </div>

      <motion.div style={{ y, opacity }} className="relative pt-32 pb-16 px-4 z-10"> {/* Ensure content is above background */}
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <motion.h1
              className="text-7xl md:text-8xl font-bold mb-6 tracking-tight relative inline-block"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                DeciBall
              </span>
              <motion.span
                className="absolute bottom-0 left-0 right-0 h-1 bg-white"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.7, ease: "circOut" }}
              />
            </motion.h1>
            <motion.p
              className="text-xl md:text-2xl mb-8 text-zinc-300 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Where Code Meets Chaos & Beats Hit Harder! Experience beat-driven, real-time, and electrifying data flows.
            </motion.p>
            <div className="relative inline-block">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative z-10">
                <Button
                  size="lg"
                  className="bg-white text-black hover:bg-zinc-200 text-lg px-8 py-6 rounded-full transition-colors relative overflow-hidden group shadow-lg hover:shadow-xl"
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                >
                  <span className="relative z-10 font-semibold">Explore DeciBall</span>
                  <motion.span
                    className="absolute inset-0 bg-gradient-to-r from-zinc-100 to-white"
                    initial={{ x: "-100%" }}
                    animate={{ x: isHovered ? "0%" : "-100%" }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  />
                  <motion.span
                    animate={{ x: isHovered ? 5 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="ml-2 relative z-10"
                  >
                    →
                  </motion.span>
                </Button>
              </motion.div>
            </div>
          </motion.div>


        </div>
      </motion.div>
    </section>
  )
}
