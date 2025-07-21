"use client"

import { useEffect, useRef, type ReactNode } from "react"

interface HalftoneWavesBackgroundProps {
  children?: ReactNode
}

export default function HalftoneWavesBackground({ children }: HalftoneWavesBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number
    let time = 0

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const drawHalftoneWave = () => {
      const gridSize = 18
      const rows = Math.ceil(canvas.height / gridSize)
      const cols = Math.ceil(canvas.width / gridSize)

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const centerX = x * gridSize
          const centerY = y * gridSize
          const distanceFromCenter = Math.sqrt(
            Math.pow(centerX - canvas.width / 2, 2) + Math.pow(centerY - canvas.height / 2, 2),
          )
          const maxDistance = Math.sqrt(Math.pow(canvas.width / 2, 2) + Math.pow(canvas.height / 2, 2))
          const normalizedDistance = distanceFromCenter / maxDistance

          const wave = Math.sin(normalizedDistance * 5 - time) * 0.5 + 0.5
          const smoothWave = wave * wave * (3 - 2 * wave)
          const size = gridSize * smoothWave * 0.7

          ctx.beginPath()
          ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(128, 128, 128, ${smoothWave * 0.6})`
          ctx.fill()
        }
      }
    }

    const animate = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.08)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      drawHalftoneWave()

      time += 0.015
      animationFrameId = requestAnimationFrame(animate)
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    animate()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [])

  return (
    <div className="relative min-h-screen">
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full bg-black -z-10 pointer-events-none" />

      <div 
        className="fixed inset-0 -z-5 pointer-events-none"
        style={{
          background: `
            linear-gradient(135deg, rgba(30, 30, 30, 0.15) 0%, rgba(10, 10, 10, 0.25) 100%),
            radial-gradient(circle at 25% 25%, rgba(60, 60, 60, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(40, 40, 40, 0.08) 0%, transparent 50%),
            linear-gradient(45deg, rgba(20, 20, 20, 0.1) 25%, transparent 25%, transparent 50%, rgba(20, 20, 20, 0.1) 50%, rgba(20, 20, 20, 0.1) 75%, transparent 75%)
          `,
          backgroundSize: '100% 100%, 200px 200px, 150px 150px, 20px 20px',
          backdropFilter: 'blur(3px) saturate(150%)',
          WebkitBackdropFilter: 'blur(3px) saturate(150%)',
        }}
      />

      <div className="relative z-10">{children}</div>
    </div>
  )
}
