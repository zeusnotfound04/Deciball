"use client"

import { useRef, useEffect, useState } from "react"
import { motion } from "framer-motion"
import PixelCard from "@/app/components/ui/PixelCard"
import useRedirect from "@/hooks/useRedirect"

export default function Component() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isMobile, setIsMobile] = useState(false)
  
  const { handleRedirect, isLoading: redirectLoading, redirectDestination } = useRedirect({
    redirectTo: 'manual',
  })

  const handleStartListening = () => {
    if (redirectDestination) {
      handleRedirect(redirectDestination)
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const updateCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = window.innerWidth + 'px'
      canvas.style.height = window.innerHeight + 'px'
      ctx.scale(dpr, dpr)
      setIsMobile(window.innerWidth < 768)
    }

    updateCanvasSize()

    let particles: {
      x: number
      y: number
      baseX: number
      baseY: number
      size: number
      color: string
      scatteredColor: string
      life: number
      isTeal: boolean
    }[] = []

    let textImageData: ImageData | null = null

    function createTextImage() {
      if (!ctx || !canvas) return 0

      ctx.save()

            const fontSize = isMobile ? 120 : 240
      ctx.font = `bold ${fontSize}px "Arial", sans-serif`
      ctx.textAlign = "left"
      ctx.textBaseline = "middle"

      const deciText = "deci"
      const ballText = "ball"
      
      const deciMetrics = ctx.measureText(deciText)
      const ballMetrics = ctx.measureText(ballText)
      const deciWidth = deciMetrics.width
      const ballWidth = ballMetrics.width
      
      const gap = fontSize * 0.05
      const totalWidth = deciWidth + ballWidth + gap
      
      const startX = (window.innerWidth - totalWidth) / 2
      const centerY = window.innerHeight / 2
      
      ctx.fillStyle = "white"
      ctx.fillText(deciText, startX, centerY)

      ctx.fillStyle = "#1e3a8a"
      ctx.fillText(ballText, startX + deciWidth + gap, centerY)

      ctx.restore()

      textImageData = ctx.getImageData(0, 0, window.innerWidth, window.innerHeight)
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

      return 1
    }

    function createParticle(scale: number) {
      if (!ctx || !canvas || !textImageData) return null

      const data = textImageData.data

      for (let attempt = 0; attempt < 100; attempt++) {
        const x = Math.floor(Math.random() * window.innerWidth)
        const y = Math.floor(Math.random() * window.innerHeight)

        const index = (y * window.innerWidth + x) * 4

        if (data[index + 3] > 128) {
          const isDarkBlue = data[index] < 100 && data[index + 1] < 100 && data[index + 2] > 100

          return {
            x: x,
            y: y,
            baseX: x,
            baseY: y,
            size: Math.random() * 1 + 0.5,
            color: isDarkBlue ? "#1e3a8a" : "white",
            scatteredColor: isDarkBlue ? "#1e3a8a" : "#FFFFFF",
            isTeal: isDarkBlue,
            life: Math.random() * 100 + 50,
          }
        }
      }

      return null
    }

    function createInitialParticles(scale: number) {
      const baseParticleCount = 10000
      const particleCount = Math.floor(baseParticleCount * Math.sqrt((window.innerWidth * window.innerHeight) / (1920 * 1080)))
      for (let i = 0; i < particleCount; i++) {
        const particle = createParticle(scale)
        if (particle) particles.push(particle)
      }
    }

    let animationFrameId: number

    function animate(scale: number) {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        ctx.fillStyle = p.color
        ctx.fillRect(p.x, p.y, p.size, p.size)

        p.life--
        if (p.life <= 0) {
          const newParticle = createParticle(scale)
          if (newParticle) {
            particles[i] = newParticle
          } else {
            particles.splice(i, 1)
            i--
          }
        }
      }

      const baseParticleCount = 10000
      const targetParticleCount = Math.floor(
        baseParticleCount * Math.sqrt((window.innerWidth * window.innerHeight) / (1920 * 1080)),
      )
      while (particles.length < targetParticleCount) {
        const newParticle = createParticle(scale)
        if (newParticle) particles.push(newParticle)
      }

      animationFrameId = requestAnimationFrame(() => animate(scale))
    }

    const scale = createTextImage()
    createInitialParticles(scale)
    animate(scale)

    const handleResize = () => {
      updateCanvasSize()
      const newScale = createTextImage()
      particles = []
      createInitialParticles(newScale)
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [isMobile])

  return (
    <>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div className="relative w-screen h-screen flex flex-col items-center justify-center bg-transparent overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 touch-none"
        style={{ width: '100vw', height: '100vh' }}
        aria-label="Interactive particle effect with Deciball logo"
      />
         <div className="absolute text-center z-10" style={{ 
           top: `calc(50% + ${isMobile ? 80 : 140}px)`, 
           left: '50%', 
           transform: 'translateX(-50%)' 
         }}>        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="cursor-pointer"
          onClick={handleStartListening}
        >
          <div className="relative overflow-hidden rounded-[25px] p-[2px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50">
            <span className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#1e3a8a_25%,#ffffff_50%,#1e3a8a_75%,#E2CBFF_100%)]" />
            <PixelCard
              variant="default"
              className="h-[80px] w-[250px] bg-black border-0 transition-all duration-300 group relative z-10"
            >
              <div className="absolute inset-0 flex items-center justify-center z-30">
                <span className="text-white group-hover:text-white text-xl font-bold tracking-wide pointer-events-none transition-colors duration-300">
                  {redirectLoading ? "Loading..." : "Start Listening"}
                </span>
              </div>
            </PixelCard>
          </div>
        </motion.div>
      
      </div>
    
    </div>
    </>
  )
}