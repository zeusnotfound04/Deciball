'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Search as SearchIcon, Loader2,  Music,  } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { cn } from "@/app/lib/utils";

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
    images: {
      height: number;
      width: number;
      url: string;
    }[];
  };
  external_urls: { spotify: string };
};

interface SearchSongPopupProps {
  onSelect?: (track: Track) => void;
  buttonClassName?: string;
  maxResults?: number;
}

export default function SearchSongPopup({
  onSelect,
  buttonClassName = '',
  maxResults = 5
}: SearchSongPopupProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
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
      
      if (!data || !data.tracks || !Array.isArray(data.tracks.items)) {
        console.error('Unexpected data structure:', data);
        setError('Unexpected data structure from API');
        setResults([]);
        return;
      }
      
      const tracks = data.tracks.items;
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

  const handleTrackSelect = (track: Track) => {
    if (onSelect) {
      onSelect(track);
    }
    setOpen(false);
  };



  return (
    <Dialog open={open}  onOpenChange={setOpen}>
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
        </Button>
      </DialogTrigger>
      <DialogContent   hideCloseButton={true}  className="w-[90vw] max-w-md p-0 gap-0 border-zinc-800 bg-zinc-900 shadow-2xl rounded-lg overflow-hidden">
        <DialogHeader className="p-0 m-0 h-0">
          <VisuallyHidden>
            <DialogTitle>Search Songs</DialogTitle>
          </VisuallyHidden>
        </DialogHeader>
        
        <div className="relative">
          {/* Search Input with Enhanced Close Button */}
          <div className="relative bg-zinc-950 p-2">
            <div className="flex rounded-lg overflow-hidden shadow-lg">
              <div className="relative flex-1">
                <div className="flex items-center bg-zinc-900 rounded-lg">
                  <SearchIcon className="h-4 w-4 ml-3 text-zinc-400" />
                  <Input
                    ref={inputRef}
                    placeholder="Search for a song..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full pl-2  py-6 border-0 bg-transparent text-zinc-200 text-base ring-offset-zinc-950 focus-visible:ring-0 focus:outline-none"
                    autoFocus
                  />
          
                  
                </div>
              </div>
            </div>
          </div>
          
          {/* Results container */}
          {(loading || results.length > 0 || (query && results.length === 0)) && (
            <div className="bg-zinc-900 border-t border-zinc-800 shadow-xl max-h-[60vh] overflow-y-auto custom-scrollbar">
              {/* Show loading indicator when searching */}
              {loading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin mr-2 text-zinc-400" />
                  <span className="text-sm text-zinc-400">Searching...</span>
                </div>
              )}
              
              {/* Show results when available */}
              {!loading && results.length > 0 && (
                <ul className="py-1">
                  {results.map((track, index) => (
                    <li
                      key={track.id || index}
                      onClick={() => handleTrackSelect(track)}
                      className="flex items-center gap-3 p-3 hover:bg-zinc-800/80 cursor-pointer border-b border-zinc-800/50 last:border-b-0"
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
                            TRACK
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              
              {/* Show error state when search returns no results */}
              {!loading && query && results.length === 0 && (
                <div className="py-6 text-center">
                  <p className="text-zinc-400 font-medium">
                    {error ? 'Error searching' : 'No results found'}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {error 
                      ? `${error}. Please try again.` 
                      : 'Try a different search term'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}