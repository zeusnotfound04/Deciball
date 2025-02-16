"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import { Menu, X } from "lucide-react"
import { signIn, signOut, useSession } from "next-auth/react"
import { Button } from "./ui/button"
import Link from "next/link"

export default function Header() {
  const session = useSession()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed w-full z-50 bg-[rgba(15,15,15,0.75)] backdrop-blur-lg shadow-lg border-b border-gray-800"
    >
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="text-3xl font-extrabold font-display bg-gradient-to-r from-teal-400 to-blue-500 text-transparent bg-clip-text"
        >
          StreamSync
        </motion.div>

      
        <nav className="hidden md:flex space-x-6 items-center">
          {session.data?.user ? (
            <>

              <motion.div
                whileHover={{ scale: 1.05 }}
                className="text-gray-300 font-semibold px-5 py-2 rounded-lg border border-gray-700 bg-gray-900 shadow-md"
              >
                {session.data.user.username}
              </motion.div>

              {/* Sign Out Button */}
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-500 transition-all duration-200"
                  onClick={() => signOut()}
                >
                  Sign Out
                </Button>
              </motion.div>
            </>
          ) : (
            <>
              
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Link href="/signup">
                  <Button className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-500 transition-all duration-200">
                    Sign Up
                  </Button>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Link href="/login">
                  <Button className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-500 transition-all duration-200">
                    Login
                  </Button>
                </Link>
              </motion.div>
            </>
          )}
        </nav>

 
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-gray-300 hover:text-white transition-colors"
        >
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </motion.button>
      </div>

      {isOpen && (
        <motion.nav
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="md:hidden bg-gray-900 py-6 space-y-4 text-center"
        >
          {session.data?.user ? (
            <>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="text-gray-300 font-semibold px-5 py-2 rounded-lg border border-gray-700 bg-gray-900 mx-auto inline-block shadow-md"
              >
                {session.data.user.username}
              </motion.div>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-500 transition-all duration-200"
                  onClick={() => signOut()}
                >
                  Sign Out
                </Button>
              </motion.div>
            </>
          ) : (
            <>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Link href="/signup">
                  <Button className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-500 transition-all duration-200">
                    Sign Up
                  </Button>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Link href="/login">
                  <Button className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-500 transition-all duration-200">
                    Login
                  </Button>
                </Link>
              </motion.div>
            </>
          )}
        </motion.nav>
      )}
    </motion.header>
  )
}
