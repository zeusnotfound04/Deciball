"use client"

import { useState, useEffect } from "react"
import { motion, useAnimation } from "framer-motion"
import { Card, CardContent, CardFooter } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { Play, Pause, ExternalLink } from "lucide-react"
import { Skeleton } from "@/app/components/ui/skeleton"
import { useInView } from "react-intersection-observer"

interface Beat {
  id: string
  name: string
  price: string
  audio: string
  image: string
  beatstarsUrl: string
}

export default function BeatsSection() {
  const [beats, setBeats] = useState<Beat[]>([])
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState<string | null>(null)
  const controls = useAnimation()
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  useEffect(() => {
    if (inView) {
      controls.start("visible")
    }
  }, [controls, inView])

  useEffect(() => {
    fetchBeats()
  }, [])

  const fetchBeats = async () => {
    setTimeout(() => {
      setBeats([
        {
          id: "1",
          name: "Urban Groove",
          price: "$49.99",
          audio: "/placeholder.mp3",
          image: "/placeholder.svg?height=200&width=200",
          beatstarsUrl: "https://www.beatstars.com/beat/urban-groove",
        },
        {
          id: "2",
          name: "Chill Vibes",
          price: "$39.99",
          audio: "/placeholder.mp3",
          image: "/placeholder.svg?height=200&width=200",
          beatstarsUrl: "https://www.beatstars.com/beat/chill-vibes",
        },
        {
          id: "3",
          name: "Trap Fusion",
          price: "$59.99",
          audio: "/placeholder.mp3",
          image: "/placeholder.svg?height=200&width=200",
          beatstarsUrl: "https://www.beatstars.com/beat/trap-fusion",
        },
      ])
      setLoading(false)
    }, 1500)
  }

  const togglePlay = (id: string) => {
    setPlaying((current) => (current === id ? null : id))
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  }

  return (
    <section id="beats" className="py-20" ref={ref}>
      <motion.h2
        className="text-5xl font-bold mb-10 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        Featured Beats
      </motion.h2>
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        variants={containerVariants}
        initial="hidden"
        animate={controls}
      >
        {loading
          ? Array(3)
              .fill(0)
              .map((_, index) => (
                <Card key={index} className="bg-gray-900 border-purple-500">
                  <CardContent className="p-6">
                    <Skeleton className="h-40 w-full mb-4" />
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/4" />
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-10 w-full" />
                  </CardFooter>
                </Card>
              ))
          : beats.map((beat) => (
              <motion.div key={beat.id} variants={itemVariants} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Card className="bg-gray-900 border-purple-500 hover:border-purple-400 transition-colors">
                  <CardContent className="p-6">
                    <div className="relative h-40 bg-purple-900 rounded-md overflow-hidden mb-4">
                      <img
                        src={beat.image || "/placeholder.svg"}
                        alt={beat.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity">
                        <Button
                          variant="outline"
                          size="icon"
                          className="bg-white text-purple-900 hover:bg-purple-100"
                          onClick={() => togglePlay(beat.id)}
                        >
                          {playing === beat.id ? <Pause /> : <Play />}
                        </Button>
                      </div>
                    </div>
                    <h3 className="text-2xl font-semibold mb-2">{beat.name}</h3>
                    <p className="text-purple-400 mb-4">{beat.price}</p>
                  </CardContent>
                  <CardFooter>
                    <Button asChild className="w-full bg-purple-600 hover:bg-purple-700">
                      <a href={beat.beatstarsUrl} target="_blank" rel="noopener noreferrer">
                        View on BeatStars <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
      </motion.div>
    </section>
  )
}
