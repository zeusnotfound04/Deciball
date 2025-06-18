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
      await signOut({ callbackUrl: "/" }) // Redirect to home page after logout
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return (
    <header className={`fixed w-full z-10 transition-all duration-300 ${isScrolled ? "bg-black" : "bg-transparent"}`}>
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-3xl font-bold tracking-tighter">
          deciball
        </Link>
        <div className="md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <Menu />
          </Button>
        </div>
        <nav
          className={`${isMenuOpen ? "block" : "hidden"} md:block absolute md:relative top-full left-0 w-full md:w-auto bg-black md:bg-transparent`}
        >
          <ul className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-8 p-4 md:p-0">
            <li>
              <Link href="#beats" className="hover:text-purple-400 transition-colors">
                Beats
              </Link>
            </li>
            <li>
              <Link href="#about" className="hover:text-purple-400 transition-colors">
                About
              </Link>
            </li>
            <li>
              <Link href="#contact" className="hover:text-purple-400 transition-colors">
                Contact
              </Link>
            </li>
          </ul>
        </nav>
        
        {/* Conditional button based on session */}
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