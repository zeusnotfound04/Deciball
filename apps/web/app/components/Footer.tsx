import { Facebook, Twitter, Instagram } from "lucide-react"

export default function Footer() {
  return (
    <footer className="bg-black py-8 border-t border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-zinc-400 mb-4 md:mb-0">&copy; 2023 drannel. All rights reserved.</p>
          <div className="flex space-x-4">
            <a href="#" className="text-zinc-400 hover:text-white transition-colors">
              <Facebook />
            </a>
            <a href="#" className="text-zinc-400 hover:text-white transition-colors">
              <Twitter />
            </a>
            <a href="#" className="text-zinc-400 hover:text-white transition-colors">
              <Instagram />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
