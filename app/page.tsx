"use client"
import { motion } from "framer-motion"
import Header from "@/app/components/header"
import Hero from "@/app/components/hero"
import Features from "@/app/components/features"
import AudioVisualizer from "@/app/components/audio-visualizer"
import Testimonials from "@/app/components/testimonlials"
import CTA from "@/app/components/cta"
import Redirect from "./components/Redirect"

export default function Page() {
  return (
    <div className="min-h-screen bg-primary text-white overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial from-primary-light to-primary-dark opacity-50 z-0"></div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative z-10"
      >
        <Header />
        <Redirect/>
        <Hero />
        <AudioVisualizer />
        <Features />
        <Testimonials />
        <CTA />
      </motion.div>
    </div>
  )
}

