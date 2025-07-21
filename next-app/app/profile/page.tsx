"use client"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { Edit3, Save, X, Camera, User, AtSign, Mail, Calendar, Shield, CheckCircle2, AlertCircle, Upload } from "lucide-react"
import BeamsBackground from "@/components/Background"

interface ProfileData {
  name: string
  username: string
  pfpUrl: string
  email?: string
  createdAt?: string
}

interface NotificationState {
  show: boolean
  type: 'success' | 'error'
  message: string
}

export default function ProfileSection() {
  const { data: session, status, update } = useSession()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [notification, setNotification] = useState<NotificationState>({
    show: false,
    type: 'success',
    message: ''
  })
  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    username: "",
    pfpUrl: "",
    email: "",
    createdAt: ""
  })
  const [editForm, setEditForm] = useState<ProfileData>(profile)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ show: true, type, message })
    setTimeout(() => {
      setNotification({ show: false, type: 'success', message: '' })
    }, 5000)
  }

  useEffect(() => {
    if (session?.user) {
      const initialProfile: ProfileData = {
        name: String(session.user.name || ""),
        username: session.user.username || session.user.email?.split('@')[0] || "",
        pfpUrl: session.user.pfpUrl || "",
        email: session.user.email || "",
        createdAt: new Date().toISOString()
      }
      setProfile(initialProfile)
      setEditForm(initialProfile)
    }
  }, [session])
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}
    
    if (!editForm.name.trim()) {
      newErrors.name = "Name is required"
    } else if (editForm.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters"
    }
    
    if (!editForm.username.trim()) {
      newErrors.username = "Username is required"
    } else if (editForm.username.trim().length < 3) {
      newErrors.username = "Username must be at least 3 characters"
    } else if (!/^[a-zA-Z0-9_]+$/.test(editForm.username.trim())) {
      newErrors.username = "Username can only contain letters, numbers, and underscores"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleEdit = () => {
    setIsEditing(true)
    setEditForm(profile)
    setErrors({})
  }

  const handleSave = async () => {
    if (!validateForm()) {
      showNotification('error', 'Please fix the errors and try again')
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editForm.name.trim(),
          username: editForm.username.trim(),
          pfpUrl: editForm.pfpUrl,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        const updatedProfile = {
          ...profile,
          name: data.name,
          username: data.username,
          pfpUrl: data.pfpUrl || ""
        }
        setProfile(updatedProfile)
        setIsEditing(false)
        showNotification('success', 'Profile updated successfully!')
        
        await update({
          ...session,
          user: {
            ...session?.user,
            name: data.name,
            username: data.username,
            pfpUrl: data.pfpUrl
          }
        })
      } else {
        showNotification('error', data.error || 'Failed to save profile')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      showNotification('error', 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setEditForm(profile)
    setIsEditing(false)
    setErrors({})
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      showNotification('error', 'Image size must be less than 5MB')
      return
    }

    if (!file.type.startsWith('image/')) {
      showNotification('error', 'Please select a valid image file')
      return
    }

    setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('files', file)
      formData.append('imageType', 'profile')

      const response = await fetch('/api/pfpUpload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (response.ok && result.success && result.fileUrls.length > 0) {
        setEditForm({ ...editForm, pfpUrl: result.fileUrls[0] })
        showNotification('success', 'Profile image uploaded successfully!')
      } else {
        showNotification('error', result.error || 'Failed to upload image')
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      showNotification('error', 'Failed to upload image')
    } finally {
      setIsUploadingImage(false)
      event.target.value = ''
    }
  }

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

  const NotificationToast = () => (
    <AnimatePresence>
      {notification.show && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          className="fixed top-4 right-4 z-50 max-w-md"
        >
          <motion.div
            className={`px-6 py-4 rounded-2xl backdrop-blur-xl shadow-2xl border-2 flex items-center space-x-3 ${
              notification.type === 'success' 
                ? 'bg-green-500/20 border-green-500/30 text-green-300' 
                : 'bg-red-500/20 border-red-500/30 text-red-300'
            }`}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </motion.div>
            <p className="font-medium">{notification.message}</p>
            <motion.button
              onClick={() => setNotification({ ...notification, show: false })}
              className="ml-auto text-current hover:opacity-70 transition-opacity"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-4 h-4" />
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1] as const,
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
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  }

  const floatingAnimation = {
    y: [-8, 8, -8],
    opacity: [0.3, 0.6, 0.3],
    transition: {
      duration: 8,
      repeat: Number.POSITIVE_INFINITY,
      ease: "easeInOut" as const,
    },
  }

  const pulseAnimation = {
    scale: [1, 1.02, 1],
    transition: {
      duration: 4,
      repeat: Number.POSITIVE_INFINITY,
      ease: "easeInOut" as const,
    },
  }

  return (
    <>
      <NotificationToast />
      <BeamsBackground>
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-6">
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-slate-800/5 rounded-full blur-3xl"
          animate={floatingAnimation}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gray-700/5 rounded-full blur-3xl"
          animate={floatingAnimation}
          transition={{ delay: 3 }}
        />
        <motion.div
          className="absolute top-3/4 left-1/3 w-32 h-32 bg-slate-600/5 rounded-full blur-3xl"
          animate={floatingAnimation}
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
          animate={pulseAnimation}
          className={`${
            isEditing 
              ? 'bg-white/5 backdrop-blur-2xl border border-white/10' 
              : 'bg-gray-900/40 backdrop-blur-xl border border-gray-800/50'
          } rounded-2xl shadow-2xl p-8 relative overflow-hidden transition-all duration-500 ${
            isLoading ? 'pointer-events-none' : ''
          }`}
        >
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-2xl flex items-center justify-center z-50"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  className="w-8 h-8 border-2 border-white border-t-transparent rounded-full"
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className={`absolute inset-0 rounded-2xl ${
            isEditing 
              ? 'bg-[#1C1E1F] backdrop-blur-xl' 
              : 'bg-[#1C1E1F] backdrop-blur-xl '
          } transition-all duration-500`} />
          
          {isEditing && (
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/3 via-transparent to-white/3 opacity-50" />
          )}
          
          <div className="text-center space-y-8 relative">
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
                        className="flex flex-col items-center space-y-1"
                      >
                        {isUploadingImage ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                              className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                            />
                            <span className="text-xs text-white/80">Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-white" />
                            <span className="text-xs text-white/80">Change</span>
                          </>
                        )}
                      </motion.div>
                    </motion.div>
                  )}
                </div>
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
                      onChange={(e) => {
                        setEditForm({ ...editForm, name: e.target.value })
                        if (errors.name) setErrors({ ...errors, name: '' })
                      }}
                      className={`w-full bg-white/5 backdrop-blur-sm border ${
                        errors.name ? 'border-red-500/50' : 'border-white/10'
                      } text-white focus:border-white/20 focus:outline-none rounded-lg px-4 py-3 transition-all duration-300 focus:bg-white/10 placeholder-gray-400`}
                      placeholder="Enter your display name"
                    />
                    {errors.name && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-400 text-xs flex items-center gap-1"
                      >
                        <AlertCircle className="w-3 h-3" />
                        {errors.name}
                      </motion.p>
                    )}
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
                      onChange={(e) => {
                        setEditForm({ ...editForm, username: e.target.value })
                        if (errors.username) setErrors({ ...errors, username: '' })
                      }}
                      className={`w-full bg-white/5 backdrop-blur-sm border ${
                        errors.username ? 'border-red-500/50' : 'border-white/10'
                      } text-white focus:border-white/20 focus:outline-none rounded-lg px-4 py-3 transition-all duration-300 focus:bg-white/10 placeholder-gray-400`}
                      placeholder="Enter your username"
                    />
                    {errors.username && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-400 text-xs flex items-center gap-1"
                      >
                        <AlertCircle className="w-3 h-3" />
                        {errors.username}
                      </motion.p>
                    )}
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="viewing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-3">
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
                  </div>

                  <motion.div 
                    className="space-y-4 pt-4 border-t border-white/10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {profile.email && (
                      <motion.div 
                        className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors duration-300"
                        whileHover={{ x: 5 }}
                      >
                        <Mail className="w-4 h-4 opacity-70" />
                        <span className="text-sm">{profile.email}</span>
                      </motion.div>
                    )}
                    
                    <motion.div 
                      className="flex items-center gap-3 text-gray-300"
                      whileHover={{ x: 5 }}
                    >
                      <Calendar className="w-4 h-4 opacity-70" />
                      <span className="text-sm">
                        Member since {new Date(profile.createdAt || '').toLocaleDateString('en-US', { 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </span>
                    </motion.div>

                    <motion.div 
                      className="flex items-center gap-3 text-gray-300"
                      whileHover={{ x: 5 }}
                    >
                      <Shield className="w-4 h-4 opacity-70" />
                      <span className="text-sm">Verified Account</span>
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

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
    </>
  )
}