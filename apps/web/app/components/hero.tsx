"use client"

import { useState } from "react"

import { Button } from "@/app/components/ui/button"
import DeciballLogo from "@/components/ui/deciball-logo"

export default function HeroSection() {


  return (
    <section className="min-h-screen relative overflow-hidden">
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <DeciballLogo/>
        
       
      </div>
    </section>
  )
}
