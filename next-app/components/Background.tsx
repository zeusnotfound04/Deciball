"use client"

import { type ReactNode } from "react"

interface DarkGradientBackgroundProps {
  children?: ReactNode
}

export default function DarkGradientBackground({ children }: DarkGradientBackgroundProps) {
  return (
    <div className="relative min-h-screen">
      {/* Pure Black Base */}
      <div className="fixed inset-0 bg-black -z-20" />
      
      {/* Very Dark Grey Gradients */}
      <div 
        className="fixed inset-0 -z-15"
        style={{
          background: `
            radial-gradient(circle at 20% 20%, rgba(18, 18, 18, 0.6) 0%, transparent 60%),
            radial-gradient(circle at 80% 80%, rgba(25, 25, 25, 0.5) 0%, transparent 65%),
            radial-gradient(circle at 60% 40%, rgba(12, 12, 12, 0.55) 0%, transparent 55%),
            linear-gradient(135deg, rgba(0, 0, 0, 0.99) 0%, rgba(8, 8, 8, 0.98) 25%, rgba(3, 3, 3, 0.99) 50%, rgba(5, 5, 5, 0.98) 75%, rgba(0, 0, 0, 1) 100%)
          `,
        }}
      />

      {/* More Subtle Purple & Pink Creative Accents */}
      <div 
        className="fixed inset-0 -z-12"
        style={{
          background: `
            radial-gradient(ellipse at 15% 25%, rgba(139, 69, 219, 0.03) 0%, transparent 75%),
            radial-gradient(ellipse at 85% 75%, rgba(236, 72, 153, 0.04) 0%, transparent 70%),
            radial-gradient(circle at 70% 20%, rgba(168, 85, 247, 0.02) 0%, transparent 65%),
            radial-gradient(circle at 30% 80%, rgba(219, 39, 119, 0.025) 0%, transparent 60%)
          `,
        }}
      />

      {/* Darker Grey Texture */}
      <div 
        className="fixed inset-0 -z-10 opacity-20"
        style={{
          background: `
            radial-gradient(circle at 25% 25%, rgba(22, 22, 22, 0.12) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(18, 18, 18, 0.10) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(139, 69, 219, 0.008) 0%, transparent 40%),
            linear-gradient(45deg, rgba(10, 10, 10, 0.08) 25%, transparent 25%, transparent 50%, rgba(10, 10, 10, 0.08) 50%, rgba(10, 10, 10, 0.08) 75%, transparent 75%)
          `,
          backgroundSize: '100% 100%, 350px 350px, 500px 500px, 40px 40px',
        }}
      />

      {/* Enhanced Dark Vignette */}
      <div 
        className="fixed inset-0 -z-5"
        style={{
          background: `
            radial-gradient(ellipse at center, transparent 25%, rgba(0, 0, 0, 0.4) 65%, rgba(0, 0, 0, 0.8) 100%),
            radial-gradient(ellipse at 20% 80%, rgba(139, 69, 219, 0.008) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(236, 72, 153, 0.006) 0%, transparent 50%)
          `,
        }}
      />

      <div className="relative z-10">{children}</div>
    </div>
  )
}
