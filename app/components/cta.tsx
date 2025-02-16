"use client"

import { motion } from "framer-motion"
import { Button } from "@/app/components/ui/button"

export default function CTA() {
  return (
    <section className="py-20 bg-gradient-to-b from-primary-light to-primary relative overflow-hidden">
      <div className="container mx-auto px-4 text-center relative z-10">
        <motion.h2
          initial={{ opacity: 0, y: -30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-4xl font-bold mb-6 font-display text-gradient"
        >
          Ready to Revolutionize Your Streams?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-xl mb-8 text-gray-300 max-w-2xl mx-auto"
        >
          Join thousands of creators who are taking their streams to the next level
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: 0.4,
          }}
        >
          <Button
            size="lg"
            className="bg-secondary hover:bg-secondary-dark text-primary font-bold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-lg glow-effect"
          >
            Start Your Free Trial
          </Button>
        </motion.div>
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

