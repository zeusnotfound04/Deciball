import VideoPlayer from "@/app/components/video-player"
import VideoSubmission from "@/app/components/video-submission"
import VideoQueue from "@/app/components/video-queue"

export default function Page() {
  return (
    <div className="min-h-screen bg-[#0a0a2a] text-white p-4 md:p-8">
      <h1 className="text-5xl font-bold mb-12 text-center text-cyan-400 glow">Music Voting Stream</h1>
      <div className="max-w-6xl mx-auto space-y-12">
        <VideoPlayer />
        <div className="grid md:grid-cols-2 gap-8">
          <VideoSubmission />
          <VideoQueue />
        </div>
      </div>
    </div>
  )
}

