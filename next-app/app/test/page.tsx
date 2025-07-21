'use client';

import { useState } from 'react';
import SearchSongPopup from '@/app/components/Search';
import { MusicIcon, ExternalLink, Clock, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Separator } from '@/app/components/ui/separator';
import MusicPlayer from '../components/MusicPlayer';
import { useAudio } from '@/store/audioStore';
import PLayerCoverComp from "@/app/components/PlayerCover"
import AudioController from '../components/Controller';
type Track = {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { images: { url: string }[] };
  external_urls: { spotify: string };
};

export default function TestPage() {
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

  const handleSelect = (track: Track) => {
    console.log('Selected track:', track);
    setSelectedTrack(track);
  };
  const { currentSong} = useAudio()
  console.log("Current Song Playing" , currentSong)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 flex flex-col items-center justify-center p-4">
      <div className="max-w-3xl w-full space-y-6">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-zinc-200 to-zinc-400 bg-clip-text text-transparent">Song Search</h1>
          <p className="text-zinc-400 mt-2">Discover and select tracks from Spotify</p>
        </header>

        <Card className="w-full border-zinc-800 bg-zinc-900/80 shadow-xl">
          <CardHeader className="border-b border-zinc-800/60">
            <CardTitle className="text-zinc-200">Search Demo</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <SearchSongPopup onSelect={handleSelect} buttonClassName="w-full max-w-xs" />
          </CardContent>
        </Card>
        
        {selectedTrack && (
          <Card className="w-full border-zinc-800 bg-zinc-900/80 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-zinc-800/60">
              <CardTitle className="text-zinc-200">Selected Track</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                <div className="w-full sm:w-40 h-40 sm:h-full overflow-hidden flex-shrink-0">
                  <img 
                    src={selectedTrack.album.images[0]?.url} 
                    alt={selectedTrack.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 p-6 bg-gradient-to-br from-zinc-900 to-zinc-950">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-zinc-100">{selectedTrack.name}</h2>
                      <p className="text-zinc-400 mt-1">
                        {selectedTrack.artists.map(artist => artist.name).join(', ')}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-full"
                      onClick={() => window.open(selectedTrack.external_urls.spotify, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    <Badge className="bg-zinc-800 hover:bg-zinc-800 text-zinc-300 flex gap-1 items-center rounded-full">
                      <MusicIcon className="w-3 h-3" />
                      <span>Track</span>
                    </Badge>
                    <Badge variant="outline" className="text-xs text-zinc-400 border-zinc-700">
                      ID: {selectedTrack.id.substring(0, 8)}...
                    </Badge>
                    <Badge variant="outline" className="text-xs text-zinc-400 border-zinc-700 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Spotify</span>
                    </Badge>
                  </div>
                  
                  <Separator className="my-5 bg-zinc-800" />
                  
                  <div className="flex gap-3">
                    <Button 
                      variant="default" 
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => window.open(selectedTrack.external_urls.spotify, '_blank')}
                    >
                      <Play className="mr-2 h-4 w-4" /> Play on Spotify
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                      onClick={() => setSelectedTrack(null)}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      {currentSong && currentSong.downloadUrl?.[0]?.url && (
  <div>
  <PLayerCoverComp/>
  <AudioController/>
  </div>
)}
        {!selectedTrack && (
          <div className="text-center py-16 px-6 border border-dashed border-zinc-800 rounded-lg bg-zinc-900/30">
            <MusicIcon className="h-12 w-12 mx-auto text-zinc-700 mb-3" />
            <p className="text-zinc-400">Search and select a track to see details</p>
          </div>
        )}
        <MusicPlayer compact className="mb-4" />
        <footer className="text-center mt-4 text-xs text-zinc-600">
          <p>Powered by Spotify API • Built with shadcn/ui</p>
        </footer>
      </div>
    </div>
  );
}
