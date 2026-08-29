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
    <div className="bg-midnight-surface p-6 border border-graphite rounded-cards">
      <h2 className="text-paper-white font-serif italic text-[32px] mb-4">Submit a Song</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="Paste YouTube URL here"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="flex-grow bg-graphite border-graphite text-paper-white placeholder:text-steel-gray font-satoshi"
          />
          <Button
            type="button"
            onClick={handlePreview}
            variant="outline"
            className="bg-graphite border-slate-custom text-ghost-gray hover:bg-charcoal font-mono"
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
              className="w-full max-w-sm mx-auto rounded-album-art border border-graphite"
            />
          </div>
        )}
        <Button
          type="submit"
          className="w-full bg-graphite text-paper-white hover:bg-charcoal font-mono rounded-full transition-colors duration-300"
        >
          Submit Song
        </Button>
      </form>
    </div>
  )
}

