"use client"
import Header from "./components/header"
import HeroSection from "./components/hero"
import LicenseOptionsSection from "./components/LicenseOption"
import AboutSection from "./components/AboutSection"
import ContactSection from "./components/ContactSection"
import Footer from "./components/Footer"
import InteractiveBackground from "./components/InteractiveBackground"

export default function Home() {
  // const [beats, setBeats] = useState([])

  // useEffect(() => {
  //   // In a real scenario, you'd fetch this data from the BeatStars API
  //   // For this example, we'll use mock data
  //   setBeats([
  //     { id: "1", name: "Urban Groove", audio: "/placeholder.mp3" },
  //     { id: "2", name: "Chill Vibes", audio: "/placeholder.mp3" },
  //     { id: "3", name: "Trap Fusion", audio: "/placeholder.mp3" },
  //   ])
  // }, [])

  return (
    <div className="min-h-screen text-white relative">
      <InteractiveBackground />
      <div className="relative z-10">
        <Header />
        <main className="container mx-auto px-4">
          <HeroSection />
          <LicenseOptionsSection />
          <AboutSection />
          <ContactSection />
        </main>
        <Footer />
        {/* <FloatingPlayer beats={beats} /> */}
      </div>
    </div>
  )
}
