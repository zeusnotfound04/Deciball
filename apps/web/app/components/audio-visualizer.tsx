"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"

export default function AudioVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = 200

    const bars = 64
    const barWidth = canvas.width / bars
    const barHeights = Array(bars).fill(0)
    const targetHeights = Array(bars).fill(0)

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let i = 0; i < bars; i++) {
        barHeights[i] += (targetHeights[i] - barHeights[i]) * 0.1

        const height = barHeights[i]

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - height)
        gradient.addColorStop(0, "rgba(56, 189, 248, 0.2)")
        gradient.addColorStop(1, "rgba(56, 189, 248, 0.8)")

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.moveTo(i * barWidth, canvas.height)
        ctx.lineTo(i * barWidth + barWidth / 2, canvas.height - height)
        ctx.lineTo(i * barWidth + barWidth, canvas.height)
        ctx.closePath()
        ctx.fill()
      }

      if (Math.random() < 0.05) {
        for (let i = 0; i < bars; i++) {
          targetHeights[i] = Math.random() * canvas.height * 0.8
        }
      }

      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animate as any)
    }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="w-full h-[200px] overflow-hidden bg-primary-dark"
    >
      <canvas ref={canvasRef} className="w-full h-full"></canvas>
    </motion.div>
  )
}

