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
  // Use redirect hook to auto-redirect users with spaces
  const { isLoading, hasSpaces, isAuthenticated } = useRedirect({
    redirectTo: 'manual', // This will auto-redirect only if user has spaces
  });

  // Show loading while checking user state
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

  // If user is authenticated and has spaces, they will be auto-redirected by the hook
  // This component will only render for:
  // 1. Unauthenticated users
  // 2. Authenticated users with no spaces
  
  return (
    <div className="min-h-screen text-white relative">

      <div className="relative z-10">
        {/* <Header />   */}
        <main className="container mx-auto px-4">
          <HeroSection />
        </main>
      </div>
    </div>
  )
}
