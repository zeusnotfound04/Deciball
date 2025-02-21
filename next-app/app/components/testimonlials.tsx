"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

const testimonials = [
  {
    name: "Alex Johnson",
    role: "Twitch Streamer",
    content:
      "StreamSync has revolutionized my streams. My audience loves being able to influence the music, and it's increased engagement tenfold!",
  },
  {
    name: "Sarah Lee",
    role: "YouTube Content Creator",
    content:
      "The integration with my existing setup was seamless. StreamSync has added a whole new dimension to my live streams.",
  },
  {
    name: "Mike Chen",
    role: "Podcast Host",
    content:
      "As a podcast host, I was skeptical at first. But StreamSync has made our live recordings so much more interactive and fun!",
  },
]

export default function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0)

  const nextTestimonial = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length)
  }

  const prevTestimonial = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length)
  }

  return (
    <section className="py-20 bg-primary relative overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.h2
          initial={{ opacity: 0, y: -30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-4xl font-bold mb-12 text-center font-display text-gradient"
        >
          What Our Users Say
        </motion.h2>
        <div className="relative">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.5 }}
            className="bg-glass p-8 rounded-lg shadow-lg max-w-2xl mx-auto"
          >
            <p className="text-gray-300 mb-4 italic">&ldquo;{testimonials[currentIndex].content}&rdquo;</p>
            <p className="text-secondary font-semibold">{testimonials[currentIndex].name}</p>
            <p className="text-gray-400">{testimonials[currentIndex].role}</p>
          </motion.div>
          <button
            onClick={prevTestimonial}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-secondary text-primary p-2 rounded-full"
          >
            <ChevronLeft />
          </button>
          <button
            onClick={nextTestimonial}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-secondary text-primary p-2 rounded-full"
          >
            <ChevronRight />
          </button>
        </div>
      </div>
      <div className="absolute inset-0 z-0">
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
          className="absolute inset-0 bg-gradient-radial from-secondary to-transparent opacity-5"
        ></motion.div>
      </div>
    </section>
  )
}

