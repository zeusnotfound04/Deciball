"use client"

import type React from "react"

import { useState } from "react"
import { Input } from "@/app/components/ui/input"
import { Button } from "@/app/components/ui/button"
import { Search } from "lucide-react"

export default function VideoSubmission() {
  const [videoUrl, setVideoUrl] = useState("")
  const [previewUrl, setPreviewUrl] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Submitted video:", videoUrl)
    setVideoUrl("")
    setPreviewUrl("")
  }

  const handlePreview = () => {
    const videoId = videoUrl.split("v=")[1]
    if (videoId) {
      setPreviewUrl(`https://img.youtube.com/vi/${videoId}/0.jpg`)
    }
  }

  return (
    <div className="bg-[#0f0f3d] p-6 rounded-lg border border-cyan-400/30 shadow-lg shadow-cyan-400/20">
      <h2 className="text-2xl font-semibold mb-4 text-cyan-400">Submit a Song</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="Paste YouTube URL here"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="flex-grow bg-[#1a1a4a] border-cyan-400/50 text-white placeholder-cyan-200/50"
          />
          <Button
            type="button"
            onClick={handlePreview}
            variant="outline"
            className="bg-[#1a1a4a] border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/20"
          >
            <Search className="w-4 h-4 mr-2" />
            Preview
          </Button>
        </div>
        {previewUrl && (
          <div className="mt-4">
            <img
              src={previewUrl || "/placeholder.svg"}
              alt="Video thumbnail"
              className="w-full max-w-sm mx-auto rounded-lg border border-cyan-400/30"
            />
          </div>
        )}
        <Button
          type="submit"
          className="w-full bg-cyan-400 text-[#0a0a2a] hover:bg-cyan-300 transition-colors duration-300"
        >
          Submit Song
        </Button>
      </form>
    </div>
  )
}

