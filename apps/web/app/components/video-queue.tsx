

import { ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/app/components/ui/button"

type Video = {
  id: string
  title: string
  votes: number
  thumbnailUrl: string
}

const mockVideos: Video[] = [
  {
    id: "1",
    title: "Song 1 - Artist A",
    votes: 10,
    thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg",
  },
  { id: "2", title: "Song 2 - Artist B", votes: 8, thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg" },
  { id: "3", title: "Song 3 - Artist C", votes: 5, thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg" },
]

export default function VideoQueue() {
  return (
    <div className="bg-[#0f0f3d] p-6 rounded-lg border border-fuchsia-400/30 shadow-lg shadow-fuchsia-400/20">
      <h2 className="text-2xl font-semibold mb-4 text-fuchsia-400">Upcoming Songs</h2>
      <ul className="space-y-4">
        {mockVideos.map((video) => (
          <li
            key={video.id}
            className="flex items-center justify-between bg-[#1a1a4a] p-4 rounded-lg border border-fuchsia-400/20"
          >
            <div className="flex items-center space-x-4">
              <img
                src={video.thumbnailUrl || "/placeholder.svg"}
                alt={video.title}
                className="w-20 h-20 object-cover rounded border border-fuchsia-400/30"
              />
              <span className="text-lg text-fuchsia-100">{video.title}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex flex-col items-center">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-green-400 hover:text-green-300 hover:bg-green-400/20 p-1"
                >
                  <ChevronUp className="w-6 h-6" />
                </Button>
                <span className="text-xl font-bold text-green-400">{video.votes}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-green-400 hover:text-green-300 hover:bg-green-400/20 p-1"
                >
                  <ChevronDown className="w-6 h-6" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

