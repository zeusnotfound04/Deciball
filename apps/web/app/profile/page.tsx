"use client"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { Edit3, Save, X, User, AtSign, Mail, Calendar, Shield, CheckCircle2, AlertCircle, Upload } from "lucide-react"
import DarkGradientBackground from "@/components/Background"
import { UploadButton } from "@/lib/uploadthing"
import "../uploadthing.css"
import { Loader2 } from "lucide-react"
import Loader from "@/components/ui/Loader"

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          username: editForm.username.trim(),
          pfpUrl: editForm.pfpUrl,
        }),
      })
      const data = await response.json()

      if (response.ok) {
        const updatedProfile = { ...profile, name: data.name, username: data.username, pfpUrl: data.pfpUrl || "" }
        setProfile(updatedProfile)
        setIsEditing(false)
        showNotification('success', 'Profile updated successfully!')
        await update()
        setTimeout(async () => {
          const refreshedSession = await update()
          if (refreshedSession?.user) {
            const refreshedProfile: ProfileData = {
              name: String(refreshedSession.user.name || ""),
              username: refreshedSession.user.username || refreshedSession.user.email?.split('@')[0] || "",
              pfpUrl: refreshedSession.user.pfpUrl || "",
              email: refreshedSession.user.email || "",
              createdAt: profile.createdAt || new Date().toISOString()
            }
            setProfile(refreshedProfile)
            setEditForm(refreshedProfile)
          }
        }, 1000)
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

  const handleImageUpload = async (url: string) => {
    setIsUploadingImage(true)
    try {
      setEditForm({ ...editForm, pfpUrl: url })
      try {
        const saveResponse = await fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editForm.name.trim(),
            username: editForm.username.trim(),
            pfpUrl: url,
          }),
        })
        const saveData = await saveResponse.json()
        if (saveResponse.ok) {
          const updatedProfile = { ...profile, name: saveData.name, username: saveData.username, pfpUrl: saveData.pfpUrl || "" }
          setProfile(updatedProfile)
          await update()
          showNotification('success', 'Profile image uploaded successfully!')
          setTimeout(async () => {
            const refreshedSession = await update()
            if (refreshedSession?.user) {
              const refreshedProfile: ProfileData = {
                name: String(refreshedSession.user.name || ""),
                username: refreshedSession.user.username || refreshedSession.user.email?.split('@')[0] || "",
                pfpUrl: refreshedSession.user.pfpUrl || "",
                email: refreshedSession.user.email || "",
                createdAt: profile.createdAt || new Date().toISOString()
              }
              setProfile(refreshedProfile)
              setEditForm(refreshedProfile)
            }
          }, 1000)
        } else {
          showNotification('error', 'Image uploaded but failed to save to profile. Please click Save to complete.')
        }
      } catch (saveError) {
        console.error('Error saving profile after image upload:', saveError)
        showNotification('error', 'Image uploaded but failed to save to profile. Please click Save to complete.')
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      showNotification('error', 'Network error occurred while uploading')
    } finally {
      setIsUploadingImage(false)
    }
  }

  if (status === "loading") {
    return (
      <Loader fullScreen label="Loading profile" />
    )
  }

  if (status === "unauthenticated") {
    return (
      <DarkGradientBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="bg-midnight-surface border border-graphite rounded-cards p-8 text-center">
            <p className="font-satoshi text-[17px] text-steel-gray">Please sign in to view your profile.</p>
          </div>
        </div>
      </DarkGradientBackground>
    )
  }

  const NotificationToast = () => (
    <AnimatePresence>
      {notification.show && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 z-50 max-w-md"
        >
          <div
            className={`px-5 py-3 rounded-lg border flex items-center gap-3 ${
              notification.type === 'success'
                ? 'bg-midnight-surface border-electric-cyan/30 text-electric-cyan'
                : 'bg-midnight-surface border-red-400/30 text-red-400'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <p className="font-mono text-sm">{notification.message}</p>
            <button
              onClick={() => setNotification({ ...notification, show: false })}
              className="ml-auto text-current hover:opacity-70 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      <NotificationToast />
      <DarkGradientBackground>
        <div className="min-h-screen flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <div
              className={`bg-midnight-surface border border-graphite rounded-cards p-8 relative ${
                isLoading ? 'pointer-events-none' : ''
              }`}
            >
              {/* Loading overlay */}
              <AnimatePresence>
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-void-black/50 rounded-cards flex items-center justify-center z-50"
                  >
                    <Loader2 className="w-6 h-6 animate-spin text-electric-cyan" />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="text-center space-y-8">
                {/* Avatar */}
                <div className="relative mx-auto w-fit">
                  <div className={`relative w-24 h-24 rounded-full overflow-hidden ${
                    isEditing ? 'ring-2 ring-electric-cyan/30' : 'border border-graphite'
                  }`}>
                    <img
                      src={editForm.pfpUrl || profile.pfpUrl || "/placeholder.svg?height=120&width=120"}
                      alt={profile.name}
                      className="w-full h-full object-cover"
                    />
                    {!(editForm.pfpUrl || profile.pfpUrl) && (
                      <div className="absolute inset-0 bg-graphite flex items-center justify-center text-paper-white text-xl font-serif italic">
                        {profile.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                    )}
                    {isEditing && (
                      <div className="absolute inset-0 bg-void-black/60 flex items-center justify-center profile-upload-button">
                        <UploadButton
                          endpoint="profileImageUploader"
                          onClientUploadComplete={(res) => {
                            if (res?.[0]?.url) {
                              handleImageUpload(res[0].url);
                            }
                          }}
                          onUploadError={(error: Error) => {
                            console.error("Upload error:", error);
                            showNotification('error', `Upload failed: ${error.message}`);
                            setIsUploadingImage(false);
                          }}
                          onUploadBegin={() => {
                            setIsUploadingImage(true);
                          }}
                          appearance={{
                            button: "w-full h-full bg-transparent border-none rounded-full flex items-center justify-center cursor-pointer p-0 m-0 min-h-0",
                            allowedContent: "hidden",
                            container: "w-full h-full flex items-center justify-center",
                          }}
                          content={{
                            button: ({ ready, isUploading }) => {
                              if (isUploading || isUploadingImage) {
                                return (
                                  <div className="flex flex-col items-center gap-1">
                                    <Loader2 className="w-5 h-5 animate-spin text-paper-white" />
                                    <span className="font-mono text-[10px] text-ghost-gray">Uploading...</span>
                                  </div>
                                )
                              }
                              if (ready) {
                                return (
                                  <div className="flex flex-col items-center gap-1">
                                    <Upload className="w-5 h-5 text-paper-white" />
                                    <span className="font-mono text-[10px] text-ghost-gray">Change</span>
                                  </div>
                                )
                              }
                              return (
                                <span className="font-mono text-[10px] text-steel-gray">Ready...</span>
                              )
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <AnimatePresence mode="wait">
                  {isEditing ? (
                    <motion.div
                      key="editing"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-5"
                    >
                      {/* Name field */}
                      <div className="text-left space-y-2">
                        <label className="font-mono text-[10px] tracking-[0.02em] uppercase text-steel-gray flex items-center gap-2">
                          <User className="w-3 h-3" />
                          Display Name
                        </label>
                        <input
                          value={editForm.name}
                          onChange={(e) => {
                            setEditForm({ ...editForm, name: e.target.value })
                            if (errors.name) setErrors({ ...errors, name: '' })
                          }}
                          className={`w-full bg-graphite border ${
                            errors.name ? 'border-red-400/50' : 'border-graphite'
                          } text-paper-white font-satoshi text-[17px] focus:border-slate-custom focus:outline-none rounded-lg px-4 py-3 transition-colors placeholder:text-steel-gray`}
                          placeholder="Enter your display name"
                        />
                        {errors.name && (
                          <p className="font-mono text-[10px] text-red-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.name}
                          </p>
                        )}
                      </div>

                      {/* Username field */}
                      <div className="text-left space-y-2">
                        <label className="font-mono text-[10px] tracking-[0.02em] uppercase text-steel-gray flex items-center gap-2">
                          <AtSign className="w-3 h-3" />
                          Username
                        </label>
                        <input
                          value={editForm.username}
                          onChange={(e) => {
                            setEditForm({ ...editForm, username: e.target.value })
                            if (errors.username) setErrors({ ...errors, username: '' })
                          }}
                          className={`w-full bg-graphite border ${
                            errors.username ? 'border-red-400/50' : 'border-graphite'
                          } text-paper-white font-satoshi text-[17px] focus:border-slate-custom focus:outline-none rounded-lg px-4 py-3 transition-colors placeholder:text-steel-gray`}
                          placeholder="Enter your username"
                        />
                        {errors.username && (
                          <p className="font-mono text-[10px] text-red-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.username}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="viewing"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-6"
                    >
                      <div className="text-center space-y-2">
                        <h1 className="font-serif italic text-[32px] leading-[1.1] text-paper-white">
                          {profile.name}
                        </h1>
                        <p className="font-mono text-sm text-steel-gray">
                          @{profile.username}
                        </p>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-graphite">
                        {profile.email && (
                          <div className="flex items-center gap-3 text-steel-gray">
                            <Mail className="w-4 h-4" />
                            <span className="font-mono text-xs">{profile.email}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-steel-gray">
                          <Calendar className="w-4 h-4" />
                          <span className="font-mono text-xs">
                            Member since {new Date(profile.createdAt || '').toLocaleDateString('en-US', {
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-steel-gray">
                          <Shield className="w-4 h-4" />
                          <span className="font-mono text-xs">Verified Account</span>
                          <CheckCircle2 className="w-3 h-3 text-electric-cyan" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <AnimatePresence mode="wait">
                  {isEditing ? (
                    <motion.div
                      key="edit-actions"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex gap-3"
                    >
                      <button
                        onClick={handleSave}
                        disabled={isLoading || isUploadingImage}
                        className="flex-1 font-mono text-sm bg-graphite text-paper-white border border-graphite rounded-full py-3 hover:bg-charcoal disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                      >
                        {isLoading || isUploadingImage ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={isLoading || isUploadingImage}
                        className="flex-1 font-mono text-sm text-steel-gray border border-graphite rounded-full py-3 hover:border-slate-custom hover:text-paper-white disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="edit-button"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <button
                        onClick={handleEdit}
                        className="font-mono text-sm text-steel-gray border border-graphite rounded-full px-8 py-3 hover:border-slate-custom hover:text-paper-white transition-colors flex items-center gap-2 mx-auto"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit Profile
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Brand footer */}
            <div className="text-center mt-8">
              <p className="font-serif italic text-xl text-paper-white mb-1">Deciball</p>
              <p className="font-mono text-[10px] tracking-[0.02em] text-steel-gray">
                Feel the Beat, Share the Vibe
              </p>
            </div>
          </motion.div>
        </div>
      </DarkGradientBackground>
    </>
  )
}
