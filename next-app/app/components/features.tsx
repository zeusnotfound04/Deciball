"use client"

import { motion } from "framer-motion"
import { Music, Users, Zap } from "lucide-react"

const features = [
  {
    icon: <Music className="w-12 h-12 text-secondary" />,
    title: "Crowd-Powered Playlists",
    description: "Let your audience vote on the next track to play during your stream.",
  },
  {
    icon: <Users className="w-12 h-12 text-secondary" />,
    title: "Real-Time Interaction",
    description: "Engage with your fans through live music requests and dedications.",
  },
  {
    icon: <Zap className="w-12 h-12 text-secondary" />,
    title: "Seamless Integration",
    description: "Easily integrate with popular streaming platforms and music services.",
  },
]

export default function Features() {
  return (
    <section className="py-20 bg-primary-light">
      <div className="container mx-auto px-4">
        <motion.h2
          initial={{ opacity: 0, y: -30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-4xl font-bold mb-12 text-center font-display text-gradient"
        >
          Unleash the Power of Interactive Streaming
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="bg-glass p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <motion.div whileHover={{ scale: 1.1, rotate: 5 }} whileTap={{ scale: 0.9 }} className="mb-4">
                {feature.icon}
              </motion.div>
              <h3 className="text-xl font-semibold mb-2 text-secondary">{feature.title}</h3>
              <p className="text-gray-300">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

