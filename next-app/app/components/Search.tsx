'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Search as SearchIcon, Loader2, Music } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { cn } from "@/app/lib/utils";
import { useAudio } from '@/store/audioStore'; // Import the audio store
import { getSpotifyTrack } from '@/actions/spotify/getSpotifyTrack';
import axios from 'axios';
import { searchResults } from '@/types';

// Track type to match Spotify API structure
type Track = {
  id: string;
  name: string;
  artists: {
    external_urls: { spotify: string };
    href: string;
    id: string;
    name: string;
    type: string;
    uri: string;
  }[];
  album: {
    id : string
    name: string
    images: {
      height: number;
      width: number;
      url: string;
    }[];
  };
  external_urls: { spotify: string };
  preview_url?: string; // Add preview_url for audio playback
};

interface SearchSongPopupProps {
  onSelect?: (track: Track) => void;
  buttonClassName?: string;
  maxResults?: number;
}

export default function SearchSongPopup({
  onSelect,
  buttonClassName = '',
  maxResults = 10
}: SearchSongPopupProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Get audio store functions
  const { play } = useAudio();
  
  // Add keyboard shortcut to open search with Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Auto search when query changes (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        handleSearch();
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [query]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Clear results when dialog is closed
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setError(null);
    }
  }, [open]);

  const handleSearch = async () => {
    if (!query) {
      setResults([]);
      setError(null);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Searching for: "${query}"`);
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Error response:', errorText);
        try {
          const errorData = JSON.parse(errorText);
          setError(errorData.error || 'Error searching for tracks');
        } catch (e) {
          setError('Error searching for tracks');
        }
        setResults([]);
        return;
      }
      
      const data = await res.json();
      
      console.log('Search response data:', data);
      
      if (!data || !data.body.tracks || !Array.isArray(data.body.tracks.items)) {
        console.error('Unexpected data structure:', data);
        setError('Unexpected data structure from API');
        setResults([]);
        return;
      }
      
      const tracks = data.body.tracks.items;

      console.log(`Found ${tracks.length} tracks`);
      setResults(tracks.slice(0, maxResults));
    } catch (error) {
      console.error('Error fetching search results:', error);
      setError('Failed to fetch search results');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Convert Spotify track format to your music player format
  const convertTrackFormat = (spotifyTrack: Track): any => {
    return {
      id: spotifyTrack.id,
      name: spotifyTrack.name,
      type: 'song',
      // Convert artists array to your expected format
      artistes: {
        primary: spotifyTrack.artists?.map(artist => ({
          id: artist.id,
          name: artist.name,
          role: 'primary_artists',
          image: [],
          type: 'artist',
          url: artist.external_urls?.spotify || ''
        })) || [],
        featured: [],
        all: spotifyTrack.artists?.map(artist => ({
          id: artist.id,
          name: artist.name,
          role: 'primary_artists',
          image: [],
          type: 'artist',
          url: artist.external_urls?.spotify || ''
        })) || []
      },
      // Convert album images to your expected format
      image: spotifyTrack.album?.images?.map(img => ({
        quality: img.height >= 300 ? '500x500' : '150x150',
        url: img.url
      })) || [],
      // Add download URLs - use preview_url if available
      downloadUrl: spotifyTrack.preview_url ? [
        {
          quality: '128kbps',
          url: spotifyTrack.preview_url
        }
      ] : [],
      // Add other required fields with default values
      year: new Date().getFullYear().toString(),
      releaseDate: new Date().toISOString().split('T')[0],
      duration: '30', // Spotify previews are typically 30 seconds
      label: '',
      copyright: '',
      hasLyrics: false,
      lyricsId: null,
      playCount: 0,
      language: 'english',
      explicit: false,
      album: {
        id: spotifyTrack.album?.id || '',
        name: spotifyTrack.album?.name || '',
        url: ''
      },
      url: spotifyTrack.external_urls?.spotify || ''
    };
  };
const handleTrackSelect = async (track: Track) => {
    try {
      
      
      const response = await axios.post("/api/spotify/getTrack", track);
      const completeTrack = response.data.body; 
      // console.log("response track :::" , completeTrack)
      const songId = response.data.body[0].downloadUrl[0].url 
      
      
      // const convertedTrack = convertTrackFormat(completeTrack);
      // console.log("Completed Track :::", convertedTrack);
      const finalTrack : searchResults = {
      id: track.id,
      name: track.name,
      // type: 'song',
      // Convert artists array to your expected format
      artistes: {
        primary: track.artists?.map(artist => ({
          id: artist.id,
          name: artist.name,
          role: 'primary_artists',
          image: [],
          type: 'artist',
          url: artist.external_urls?.spotify || ''
        })) || [],
        // featured: [],
        // all: track.artists?.map(artist => ({
        //   id: artist.id,
        //   name: artist.name,
        //   role: 'primary_artists',
        //   image: [],
        //   type: 'artist',
        //   url: artist.external_urls?.spotify || ''
        // })) || []
      },
      image: track.album?.images?.map(img => ({
        quality: img.height >= 300 ? '500x500' : '150x150',
        url: img.url
      })) || [],
      downloadUrl:  [
        {
          quality: '320kbps',
          url: songId
        }
      ] ,
      url : "",
addedBy: "",
voteCount: 0,
isVoted: false,
source: "youtube"
      // Add other required fields with default values
      // year: new Date().getFullYear().toString(),
      // releaseDate: new Date().toISOString().split('T')[0],
      // duration: '30', // Spotify previews are typically 30 seconds
      // label: '',
      // copyright: '',
      // hasLyrics: false,
      // lyricsId: null,
      // playCount: 0,
      // language: 'english',
      // explicit: false,
      // album: {
      //   id: track.album?.id || '',
      //   name: track.album?.name || '',
      //   url: ''
      // },
      // url: track.external_urls?.spotify || ''
    }
      await play(finalTrack);
      

      if (onSelect) {
        onSelect(track);
      }
      
      setOpen(false);
      
      // console.log('Track selected and playing:', convertedTrack.name);
    } catch (error) {
      console.error('Error playing selected track:', error);
      setError('Failed to play the selected track');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline"
          className={cn(
            "flex items-center gap-2 px-4 py-2 border-zinc-800 bg-zinc-900/80 text-zinc-200 hover:bg-zinc-800 hover:text-white transition-colors shadow-lg",
            buttonClassName
          )}
        >
          <SearchIcon className="w-4 h-4" />
          Search Songs
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-zinc-400 opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </DialogTrigger>
      <DialogContent hideCloseButton={true} className="w-[90vw] max-w-md p-0 gap-0 border-zinc-800 bg-zinc-900 shadow-2xl rounded-lg overflow-hidden h-[500px] flex flex-col">
        <DialogHeader className="p-0 m-0 h-0">
          <VisuallyHidden>
            <DialogTitle>Search Songs</DialogTitle>
          </VisuallyHidden>
        </DialogHeader>
        
        <div className="flex flex-col h-full">
          {/* Search Input - Fixed height */}
          <div className="flex-shrink-0 bg-zinc-950 p-2">
            <div className="flex rounded-lg overflow-hidden shadow-lg">
              <div className="relative flex-1">
                <div className="flex items-center bg-zinc-900 rounded-lg">
                  <SearchIcon className="h-4 w-4 ml-3 text-zinc-400" />
                  <Input
                    ref={inputRef}
                    placeholder="Search for a song... (⌘K)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full pl-2 py-6 border-0 bg-transparent text-zinc-200 text-base ring-offset-zinc-950 focus-visible:ring-0 focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Results container - Fixed height with scrolling */}
          <div className="flex-1 bg-zinc-900 border-t border-zinc-800 shadow-xl overflow-hidden flex flex-col min-h-0">
            {/* Show loading indicator when searching */}
            {loading && (
              <div className="flex items-center justify-center py-6 flex-1">
                <Loader2 className="h-5 w-5 animate-spin mr-2 text-zinc-400" />
                <span className="text-sm text-zinc-400">Searching...</span>
              </div>
            )}
            
            {/* Show results when available */}
            {!loading && results.length > 0 && (
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <ul className="py-1">
                  {results.map((track, index) => (
                    <li
                      key={track.id || index}
                      onClick={() => handleTrackSelect(track)}
                      className="flex items-center gap-3 p-3 hover:bg-zinc-800/80 cursor-pointer border-b border-zinc-800/50 last:border-b-0 transition-colors"
                    >
                      <div className="w-12 h-12 overflow-hidden rounded-md flex-shrink-0 border border-zinc-800/50 shadow-md bg-zinc-800">
                        {track.album?.images && track.album.images[0]?.url ? (
                          <img
                            src={track.album.images[0].url}
                            alt={track.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder.svg';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-500">
                            <Music className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-zinc-200">{track.name}</p>
                        <p className="text-xs text-zinc-400 truncate mt-0.5">
                          {track.artists?.map(artist => artist.name).join(', ') || 'Unknown Artist'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="flex items-center text-[10px] text-zinc-500 bg-zinc-800/80 px-1.5 py-0.5 rounded-full">
                            <Music className="w-2.5 h-2.5 mr-1 text-zinc-400" />
                            {track.preview_url ? 'PREVIEW' : 'TRACK'}
                          </span>
                          {track.preview_url && (
                            <span className="text-[10px] text-emerald-400 bg-emerald-900/20 px-1.5 py-0.5 rounded-full">
                              ▶ PLAYABLE
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Show error state when search returns no results */}
            {!loading && query && results.length === 0 && (
              <div className="py-6 text-center flex-1 flex items-center justify-center">
                <div>
                  <p className="text-zinc-400 font-medium">
                    {error ? 'Error searching' : 'No results found'}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {error 
                      ? `${error}. Please try again.` 
                      : 'Try a different search term'}
                  </p>
                </div>
              </div>
            )}
            
            {/* Show empty state when no query */}
            {!loading && !query && (
              <div className="py-6 text-center flex-1 flex items-center justify-center">
                <div>
                  <p className="text-zinc-400 font-medium">Start typing to search</p>
                  <p className="text-xs text-zinc-500 mt-1">Find your favorite songs and play them instantly</p>
                  <p className="text-xs text-zinc-600 mt-2">Press ⌘K to open search anytime</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}