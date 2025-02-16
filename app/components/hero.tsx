"use client"

import { motion } from "framer-motion"
import { Button } from "@/app/components/ui/button"
import { Music } from "lucide-react"
import { Spotlight } from "./ui/Spotlight-new"

export default function Hero() {
  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary to-primary-light overflow-hidden">
        <Spotlight/>
      <div className="container mx-auto px-4 text-center relative z-10">
        <motion.h1
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-5xl md:text-7xl font-bold mb-6 font-display text-gradient"
        >
          Sync Your Stream
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-xl md:text-2xl mb-8 text-gray-300 max-w-2xl mx-auto"
        >
          Empower your audience to shape your stream&apos;s soundtrack in real-time
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Button
            size="lg"
            className="bg-secondary hover:bg-secondary-dark text-primary font-bold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-lg glow-effect"
          >
            Get Started
          </Button>
        </motion.div>
      </div>
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-radial from-secondary-dark to-transparent opacity-10"></div>
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 20,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
          }}
          className="absolute inset-0 bg-gradient-radial from-accent to-transparent opacity-5"
        ></motion.div>
      </div>
      {[...Array(5)].map((_, index) => (
        <motion.div
          key={index}
          className="absolute text-secondary opacity-20"
          initial={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
          }}
          animate={{
            y: [0, -20, 0],
            rotate: [0, 360],
          }}
          transition={{
            duration: 10 + Math.random() * 10,
            repeat: Number.POSITIVE_INFINITY,
            delay: Math.random() * 5,
          }}
        >
          <Music size={24 + Math.random() * 24} />
        </motion.div>
      ))}
    </section>
  )
}

