"use client"

import { useState, useRef, useEffect } from "react"
import { motion, useAnimation, useInView } from "framer-motion"
import { Check, X, Crown, Zap, Star, Globe } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent } from "@/app/components/ui/card"

const licenseOptions = [
  {
    name: "Standard License",
    price: "$2.99",
    icon: <Star className="w-6 h-6" />,
    features: [
      "Used for Music Recording",
      "Distribute up to 5,000 copies",
      "75,000 Online Audio Streams",
      "1 Music Video",
      "For Profit Live Performances",
      "Radio Broadcasting rights (2 Stations)",
    ],
    bulkDeal: "BUY 1 TRACK, GET 1 FREE!",
  },
  {
    name: "Advanced License",
    price: "$4.99",
    icon: <Zap className="w-6 h-6" />,
    features: [
      "Used for Music Recording",
      "Distribute up to 10,000 copies",
      "150,000 Online Audio Streams",
      "1 Music Video",
      "For Profit Live Performances",
      "Radio Broadcasting rights (UNLIMITED Stations)",
    ],
    popular: true,
  },
  {
    name: "Premium License",
    price: "$7.99",
    icon: <Crown className="w-6 h-6" />,
    features: [
      "Used for Music Recording",
      "Distribute up to 20,000 copies",
      "500,000 Online Audio Streams",
      "1 Music Video",
      "Non-profit Live Performances only",
    ],
    notIncluded: ["No Radio Broadcasting rights"],
  },
  {
    name: "Commercial License",
    price: "$8.99",
    icon: <Globe className="w-6 h-6" />,
    features: [
      "Used for Music Recording",
      "Distribute up to UNLIMITED copies",
      "UNLIMITED Online Audio Streams",
      "UNLIMITED Music Video",
      "For Profit Live Performances",
      "Radio Broadcasting rights (UNLIMITED Stations)",
    ],
  },
]

export default function LicenseOptionsSection() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)
  const controls = useAnimation()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (inView) {
      controls.start("visible")
    }
  }, [controls, inView])

  return (
    <section ref={ref} id="license-options" className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-900/20 to-black"></div>

      <div className="container mx-auto px-4 relative">
        <motion.div
          initial="hidden"
          animate={controls}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
          }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-6">Choose Your License</h2>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Select the perfect license for your needs and start creating amazing music today
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {licenseOptions.map((option, index) => (
            <motion.div
              key={option.name}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: index * 0.1 } },
              }}
              initial="hidden"
              animate={controls}
              onHoverStart={() => setHoveredCard(index)}
              onHoverEnd={() => setHoveredCard(null)}
            >
              <Card
                className={`relative h-full ${
                  hoveredCard === index ? "scale-105" : "scale-100"
                } transition-all duration-300`}
              >
                <div className="absolute inset-0 rounded-lg p-[1px] bg-gradient-to-br from-white/20 to-white/0">
                  <div className="absolute inset-0 rounded-lg bg-black"></div>
                </div>

                {option.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-white text-black px-4 py-1 rounded-full text-sm font-semibold animate-pulse">
                      Most Popular
                    </span>
                  </div>
                )}

                <CardContent className="relative p-6 rounded-lg h-full flex flex-col">
                  <div className="text-center mb-6">
                    <div className="inline-flex p-3 rounded-full bg-zinc-900 border border-white/10 mb-4">
                      {option.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-2">{option.name}</h3>
                    <div className="text-3xl font-bold">{option.price}</div>
                  </div>

                  <div className="flex-grow">
                    <ul className="space-y-3 mb-6">
                      {option.features.map((feature, i) => (
                        <motion.li
                          key={i}
                          className="flex items-start"
                          initial={{ opacity: 0, x: -20 }}
                          animate={hoveredCard === index ? { opacity: 1, x: 0 } : {}}
                          transition={{ duration: 0.3, delay: i * 0.05 }}
                        >
                          <Check className="h-5 w-5 text-white mr-2 shrink-0 mt-0.5" />
                          <span className="text-sm text-zinc-300">{feature}</span>
                        </motion.li>
                      ))}
                      {option.notIncluded?.map((feature, i) => (
                        <motion.li
                          key={i}
                          className="flex items-start text-zinc-500"
                          initial={{ opacity: 0, x: -20 }}
                          animate={hoveredCard === index ? { opacity: 1, x: 0 } : {}}
                          transition={{ duration: 0.3, delay: (option.features.length + i) * 0.05 }}
                        >
                          <X className="h-5 w-5 text-zinc-500 mr-2 shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>

                  {option.bulkDeal && (
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-white bg-white/5 py-2 px-3 rounded-lg border border-white/10 animate-pulse">
                        {option.bulkDeal}
                      </p>
                    </div>
                  )}

                  <Button asChild className={`w-full bg-white text-black hover:bg-zinc-200 transition-colors`}>
                    <a href="https://drqnnel.beatstars.com" target="_blank" rel="noopener noreferrer">
                      Get Started
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
