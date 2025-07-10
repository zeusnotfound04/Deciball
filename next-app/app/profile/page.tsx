"use client"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { Edit3, Save, X, Camera, User, AtSign } from "lucide-react"
import BeamsBackground from "@/components/Background"

export default function ProfileSection() {
  const { data: session, status } = useSession()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [profile, setProfile] = useState({
    name: "",
    username: "",
    pfpUrl: "",
  })
  const [editForm, setEditForm] = useState(profile)

  // Initialize profile data from session when available
  useEffect(() => {
    if (session?.user) {
      const initialProfile = {
        name: session.user.name || "",
        username: session.user.username || session.user.email?.split('@')[0] || "",
        pfpUrl: session.user.pfpUrl || "",
      }
      setProfile(initialProfile)
      setEditForm(initialProfile)
    }
  }, [session])

  const handleEdit = () => {
    setIsEditing(true)
    setEditForm(profile)
  }

  const handleSave = async () => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editForm.name,
          username: editForm.username,
          pfpUrl: editForm.pfpUrl,
        }),
      })

      if (response.ok) {
        const updatedProfile = await response.json()
        setProfile(updatedProfile)
        setIsEditing(false)
      } else {
        console.error('Failed to save profile')
        // You might want to show an error message to the user
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      // You might want to show an error message to the user
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setEditForm(profile)
    setIsEditing(false)
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('files', file)
      formData.append('imageType', 'profile')

      const response = await fetch('/api/pfpUpload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.fileUrls.length > 0) {
          setEditForm({ ...editForm, pfpUrl: result.fileUrls[0] })
        }
      } else {
        console.error('Failed to upload image')
        // You might want to show an error message to the user
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      // You might want to show an error message to the user
    } finally {
      setIsUploadingImage(false)
    }
  }

  // Show loading state while session is being fetched
  if (status === "loading") {
    return (
      <BeamsBackground>
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-6">
          <div className="w-full max-w-md relative z-10">
            <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl shadow-2xl p-8 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                className="w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"
              />
              <p className="text-gray-300">Loading profile...</p>
            </div>
          </div>
        </div>
      </BeamsBackground>
    )
  }

  // Show message if user is not authenticated
  if (status === "unauthenticated") {
    return (
      <BeamsBackground>
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-6">
          <div className="w-full max-w-md relative z-10">
            <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl shadow-2xl p-8 text-center">
              <p className="text-gray-300">Please sign in to view your profile.</p>
            </div>
          </div>
        </div>
      </BeamsBackground>
    )
  }

  // Smooth animation variants
 const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1] as const, // Add 'as const' assertion
      staggerChildren: 0.08,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { 
      duration: 0.6, 
      ease: [0.22, 1, 0.36, 1] as const, // Add 'as const' assertion
    },
  },
}

// Alternative approach using string easing names
const containerVariantsAlt = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: "easeOut", // Use predefined easing strings
      staggerChildren: 0.08,
    },
  },
}

const itemVariantsAlt = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { 
      duration: 0.6, 
      ease: "easeOut", // Use predefined easing strings
    },
  },
}

  const floatingVariants = {
    animate: {
      y: [-8, 8, -8],
      opacity: [0.3, 0.6, 0.3],
      transition: {
        duration: 8,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
      },
    },
  }

  const pulseVariants = {
    animate: {
      scale: [1, 1.02, 1],
      transition: {
        duration: 4,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
      },
    },
  }

  return (
    <BeamsBackground>
    <div className="min-h-screen  relative overflow-hidden flex items-center justify-center p-6">
      {/* Subtle animated background elements */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-slate-800/5 rounded-full blur-3xl"
          variants={floatingVariants}
          animate="animate"
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gray-700/5 rounded-full blur-3xl"
          variants={floatingVariants}
          animate="animate"
          transition={{ delay: 3 }}
        />
        <motion.div
          className="absolute top-3/4 left-1/3 w-32 h-32 bg-slate-600/5 rounded-full blur-3xl"
          variants={floatingVariants}
          animate="animate"
          transition={{ delay: 6 }}
        />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md relative z-10"
      >
        <motion.div
          variants={pulseVariants}
          animate="animate"
          className={`${
            isEditing 
              ? 'bg-white/5 backdrop-blur-2xl border border-white/10' 
              : 'bg-gray-900/40 backdrop-blur-xl border border-gray-800/50'
          } rounded-2xl shadow-2xl p-8 relative overflow-hidden transition-all duration-500`}
        >
          {/* Glass-like border glow */}
          <div className={`absolute inset-0 rounded-2xl ${
            isEditing 
              ? 'bg-gradient-to-r from-white/5 via-transparent to-white/5 opacity-70' 
              : 'bg-gradient-to-r from-gray-700/10 via-transparent to-gray-700/10 opacity-50'
          } transition-all duration-500`} />
          
          {/* Additional glass effect for edit mode */}
          {isEditing && (
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/3 via-transparent to-white/3 opacity-50" />
          )}
          
          <div className="text-center space-y-8 relative">
            {/* Profile Picture */}
            <motion.div variants={itemVariants} className="relative">
              <motion.div
                whileHover={{ 
                  scale: 1.03,
                  transition: { duration: 0.3, ease: "easeOut" }
                }}
                className="relative group mx-auto w-fit"
              >
                <motion.div
                  className="absolute -inset-1 bg-gradient-to-r from-gray-600/20 to-gray-700/20 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                />
                <div className={`relative w-28 h-28 rounded-full ${
                  isEditing 
                    ? 'border border-white/20 shadow-xl bg-white/5' 
                    : 'border border-gray-700/30 shadow-2xl bg-gray-800/50'
                } overflow-hidden transition-all duration-500`}>
                  <img 
                    src={editForm.pfpUrl || profile.pfpUrl || "/placeholder.svg?height=120&width=120"} 
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                  {!(editForm.pfpUrl || profile.pfpUrl) && (
                    <div className="absolute inset-0 bg-gray-800 flex items-center justify-center text-white text-2xl font-bold">
                      {profile.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                  )}
                  {isEditing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer group-hover:bg-black/70 transition-colors duration-300"
                      onClick={() => document.getElementById('profile-image-input')?.click()}
                    >
                      <motion.div 
                        whileHover={{ scale: 1.1 }} 
                        whileTap={{ scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                      >
                        {isUploadingImage ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                            className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                          />
                        ) : (
                          <Camera className="w-6 h-6 text-white" />
                        )}
                      </motion.div>
                    </motion.div>
                  )}
                </div>
                {/* Hidden file input */}
                <input
                  id="profile-image-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isUploadingImage}
                />
              </motion.div>
            </motion.div>

            {/* Profile Info */}
            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.div
                  key="editing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-6"
                >
                  <motion.div
                    className="text-left space-y-2"
                    whileHover={{ 
                      scale: 1.01,
                      transition: { duration: 0.2 }
                    }}
                  >
                    <label className="text-gray-300 text-sm flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 opacity-70" />
                      Display Name
                    </label>
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full bg-white/5 backdrop-blur-sm border border-white/10 text-white focus:border-white/20 focus:outline-none rounded-lg px-4 py-3 transition-all duration-300 focus:bg-white/10 placeholder-gray-400"
                      placeholder="Enter your display name"
                    />
                  </motion.div>
                  <motion.div
                    className="text-left space-y-2"
                    whileHover={{ 
                      scale: 1.01,
                      transition: { duration: 0.2 }
                    }}
                  >
                    <label className="text-gray-300 text-sm flex items-center gap-2 mb-2">
                      <AtSign className="w-4 h-4 opacity-70" />
                      Username
                    </label>
                    <input
                      value={editForm.username}
                      onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                      className="w-full bg-white/5 backdrop-blur-sm border border-white/10 text-white focus:border-white/20 focus:outline-none rounded-lg px-4 py-3 transition-all duration-300 focus:bg-white/10 placeholder-gray-400"
                      placeholder="Enter your username"
                    />
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="viewing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-3"
                >
                  <motion.h1
                    className="text-3xl font-bold text-white tracking-tight"
                    whileHover={{ 
                      scale: 1.02,
                      transition: { duration: 0.2 }
                    }}
                  >
                    {profile.name}
                  </motion.h1>
                  <motion.p
                    className="text-gray-400 text-lg"
                    whileHover={{ 
                      scale: 1.02,
                      color: "#9CA3AF",
                      transition: { duration: 0.2 }
                    }}
                  >
                    @{profile.username}
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            <motion.div variants={itemVariants}>
              <AnimatePresence mode="wait">
                {isEditing ? (
                  <motion.div
                    key="edit-actions"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="flex gap-4 justify-center"
                  >
                    <motion.button
                      onClick={handleSave}
                      disabled={isLoading || isUploadingImage}
                      whileHover={{ 
                        scale: 1.02,
                        transition: { duration: 0.2 }
                      }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 bg-white/10 backdrop-blur-sm hover:bg-white/15 text-white border border-white/20 rounded-lg px-6 py-3 transition-all duration-300 relative overflow-hidden group disabled:opacity-50"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative flex items-center justify-center">
                        {isLoading || isUploadingImage ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                          />
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save
                          </>
                        )}
                      </div>
                    </motion.button>
                    <motion.button
                      onClick={handleCancel}
                      disabled={isLoading || isUploadingImage}
                      whileHover={{ 
                        scale: 1.02,
                        transition: { duration: 0.2 }
                      }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 border border-white/20 text-gray-300 hover:bg-white/5 bg-transparent backdrop-blur-sm rounded-lg px-6 py-3 transition-all duration-300 disabled:opacity-50"
                    >
                      <X className="w-4 h-4 mr-2 inline" />
                      Cancel
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="edit-button"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <motion.button
                      onClick={handleEdit}
                      whileHover={{ 
                        scale: 1.02,
                        transition: { duration: 0.2 }
                      }}
                      whileTap={{ scale: 0.98 }}
                      className="border border-gray-600/30 text-gray-300 hover:bg-gray-800/30 bg-transparent px-8 py-3 rounded-lg transition-all duration-300 relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gray-800/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative flex items-center">
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit Profile
                      </div>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>

        {/* Enhanced Brand Footer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mt-8"
        >
          <motion.div
            className="text-2xl font-bold text-white mb-2 tracking-tight"
            whileHover={{ 
              scale: 1.05,
              transition: { duration: 0.2 }
            }}
          >
            Deciball
          </motion.div>
          <motion.div
            className="text-gray-500 text-sm tracking-wide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
          >
            Feel the Beat, Share the Vibe
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
    </BeamsBackground>  
  )
}