"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/app/components/ui/button"
import { Menu, LogOut } from "lucide-react"

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { data: session, status } = useSession()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleLogout = async () => {
    try {
      console.log("Handle Logout clicked")
      await signOut({ callbackUrl: "/" })
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return (
    <header className={`fixed w-full z-10 transition-all duration-300 ${isScrolled ? "bg-black" : "bg-transparent"}`}>
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-3xl font-bold tracking-tighter">
          deci<span className="text-[#1e3a8a]">ball</span>
        </Link>


        
        
        {status === "loading" ? (
          <div className="hidden md:block w-20 h-9 bg-gray-700 animate-pulse rounded"></div>
        ) : session ? (
          <Button 
            variant="outline" 
            className="hidden md:flex items-center gap-2"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            Logout
          </Button>
        ) : (
          <Button asChild variant="outline" className="hidden md:block">
            <Link href="/beatstars">
              BeatStars
            </Link>
          </Button>
        )}
      </div>
    </header>
  )
}