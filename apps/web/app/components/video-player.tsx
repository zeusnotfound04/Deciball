export default function VideoPlayer() {
    return (
      <div className="aspect-video w-full bg-black rounded-lg overflow-hidden shadow-lg shadow-cyan-400/20 border border-cyan-400/30">
        <iframe
          width="100%"
          height="100%"
          src="https://www.youtube.com/embed/dQw4w9WgXcQ"
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    )
  }
  
  