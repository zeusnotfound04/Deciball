"use client"

import { type ReactNode } from "react"

interface DarkGradientBackgroundProps {
  children?: ReactNode
}

export default function DarkGradientBackground({ children }: DarkGradientBackgroundProps) {
  return (
    <div className="relative min-h-screen bg-void-black">
      <div className="relative">{children}</div>
    </div>
  )
}
