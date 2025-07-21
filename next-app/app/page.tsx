"use client"
import Header from "./components/header"
import HeroSection from "./components/hero"
import LicenseOptionsSection from "./components/LicenseOption"
import AboutSection from "./components/AboutSection"
import ContactSection from "./components/ContactSection"
import Footer from "./components/Footer"
import InteractiveBackground from "./components/InteractiveBackground"
import useRedirect from "@/hooks/useRedirect"
import { Loader2 } from "lucide-react"

export default function Home() {
  const { isLoading, hasSpaces, isAuthenticated } = useRedirect({
    redirectTo: 'manual',
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black to-zinc-900">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-zinc-400 text-lg">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen text-white relative">

      <div className="relative z-10">
        <main className="container mx-auto px-4">
          <HeroSection />
        </main>
      </div>
    </div>
  )
}
