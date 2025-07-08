'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Search as SearchIcon, Loader2, Music, Plus, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { cn } from "@/app/lib/utils";
import axios from 'axios';
import { searchResults } from '@/types';
import { useSocket } from '@/context/socket-context';

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
interface Artist {
    external_urls : string[];
    href : string;
    id : string;
    name : string;
    type : string;
    uri : string
}

interface SearchSongPopupProps {
  onSelect?: (track: Track) => void;
  onBatchSelect?: (tracks: Track[]) => void;
  buttonClassName?: string;
  maxResults?: number;
  isAdmin?: boolean;
  enableBatchSelection?: boolean;
  spaceId?: string; // Add spaceId as a prop
}

export default function SearchSongPopup({
  onSelect,
  onBatchSelect,
  buttonClassName = '',
  maxResults = 10,
  isAdmin = false,
  enableBatchSelection = false,
  spaceId = '' // Add spaceId prop with default value
}: SearchSongPopupProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [selectedTracks, setSelectedTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Get socket and user context for WebSocket communication
  const { sendMessage, user: socketUser, socket } = useSocket();
  
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
      setSelectedTracks([]);
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
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      
      if (!res.ok) {
        const errorText = await res.text();
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
      
      if (!data || !data.body.tracks || !Array.isArray(data.body.tracks.items)) {
        setError('Unexpected data structure from API');
        setResults([]);
        return;
      }
      
      const tracks = data.body.tracks.items;
      setResults(tracks.slice(0, maxResults));
    } catch (error) {
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

  // Helper function to try multiple YouTube search results until one works
  const tryMultipleResults = async (searchResults: any[], track: any, spaceId: string, autoPlay: boolean = false): Promise<boolean> => {
    for (let i = 0; i < searchResults.length; i++) {
      // const result = searchResults[i];
      // const videoId = result.downloadUrl[0].url;
      const { downloadUrl: [{ url: videoId }] } = searchResults[i];
      // Validate video ID format
      if (!videoId || videoId.length !== 11 || !/^[a-zA-Z0-9_-]+$/.test(videoId)) {
        continue;
      }
      
      
      
      const title : string = track.name.replace(/\s*\(.*?\)\s*/g, '').trim();
      
      try {
        // ✅ Send WebSocket message with Spotify album image (not YouTube thumbnail)
        const success = sendMessage("add-to-queue", {
          spaceId: spaceId,
          addedByUser : socketUser?.username || "",
          userId: socketUser?.id || '',
          url: `https://www.youtube.com/watch?v=${videoId}`,
          autoPlay: autoPlay,
          trackData: {
            title: title,
            artist:  track.artists.map((artist: Artist) => artist.name).join(', ') || 'Unknown Artist',
            image: track.album?.images?.[0]?.url || '', // 🎯 SPOTIFY ALBUM IMAGE - NOT YOUTUBE
            source: 'Youtube',
            spotifyId: track.id,
            youtubeId: videoId,
            addedByUser: {
              id: socketUser?.id || '',
              username: socketUser?.username || 'Unknown'
            }
          },
          // Legacy fields for backward compatibility - ALSO USE SPOTIFY IMAGE
          title: track.name,
          artist: track.artists?.[0]?.name || 'Unknown Artist',
          image: track.album?.images?.[0]?.url || '', // 🎯 SPOTIFY ALBUM IMAGE - NOT YOUTUBE
          source: 'Youtube',
          spotifyId: track.id,
          youtubeId: videoId
        });

        if (success) {
          return true;
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error adding track ${track.name} with video ID ${videoId}:`, error);
      }
    }
    
    return false;
  };

  const handleTrackSelect = async (track: Track) => {
 
    if (enableBatchSelection && isAdmin) {
      const isSelected = selectedTracks.some(t => t.id === track.id);
      if (isSelected) {
        setSelectedTracks(prev => prev.filter(t => t.id !== track.id));
      } else {
        setSelectedTracks(prev => [...prev, track]);
      }
      return;
    }

  
    try {
      console.log("Sending the fuckinnn Track ", track);
      const response = await axios.post("/api/spotify/getTrack", track);
      
      if (!response.data?.body || response.data.body.length === 0) {
        throw new Error("No search results found for this track");
      }
      
      const searchResults = response.data.body;
      
      if (!spaceId) {
        setError('Room ID not found. Please rejoin the room.');
        return;
      }
      // Try multiple results using fallback logic with autoPlay enabled for single selection
      const success = await tryMultipleResults(searchResults, track, spaceId, true);
      
      if (success) {
        if (onSelect) {
          onSelect(track);
        }
        setOpen(false);
      } else {
        throw new Error("Failed to add track - all video sources failed");
      }
    } catch (error) {
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Invalid response structure')) {
          setError('Failed to convert Spotify track to YouTube. Please try a different song.');
        } else if (error.message.includes('Invalid YouTube video ID')) {
          setError('Could not find a valid YouTube version of this song.');
        } else if (error.message.includes('Invalid YouTube URL format')) {
          setError('The YouTube video format is invalid. Please try a different song.');
        } else if (error.message.includes('WebSocket')) {
          setError('Connection lost. Please refresh the page and try again.');
        } else {
          setError(`Failed to add song: ${error.message}`);
        }
      } else {
        setError('Failed to add the selected track to queue');
      }
    }
  };

  const handleAddSelectedToQueue = async () => {
    if (selectedTracks.length === 0) return;

    try {
      // Use spaceId prop instead of extracting from URL
      if (!spaceId) {
        setError('Room ID not found. Please rejoin the room.');
        return;
      }

      // Process each selected track with fallback logic
      const results = [];
      let trackIndex = 0;
      for (const track of selectedTracks) {
        try {
          console.log("Processing track:", track);
          const response = await axios.post("/api/spotify/getTrack", track);
          const searchResults = response.data.body; 
          
          if (!searchResults || searchResults.length === 0) {
            results.push({ track: track.name, success: false, error: "No search results" });
            continue;
          }
          
          // Auto-play the first song in batch selection
          const shouldAutoPlay = trackIndex === 0;
          
          // Try multiple results using fallback logic
          const success = await tryMultipleResults(searchResults, track, spaceId, shouldAutoPlay);
          results.push({ track: track.name, success, error: success ? null : "All video sources failed" });
          
          trackIndex++;
          
          // Small delay between tracks
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          results.push({ track: track.name, success: false, error: error instanceof Error ? error.message : "Unknown error" });
          trackIndex++;
        }
      }

      // Show results summary
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      console.log(`Batch complete: ${successful} successful, ${failed} failed`);

      if (onBatchSelect) {
        onBatchSelect(selectedTracks);
      }
      
      setOpen(false);
      setSelectedTracks([]);
    } catch (error) {
      setError('Failed to add selected tracks to queue');
    }
  };

  const handleSelectAll = () => {
    if (selectedTracks.length === results.length) {
      setSelectedTracks([]);
    } else {
      setSelectedTracks([...results]);
    }
  };

  const isTrackSelected = (track: Track) => {
    return selectedTracks.some(t => t.id === track.id);
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
      </DialogTrigger>        <DialogContent hideCloseButton={true} className="w-[90vw] max-w-2xl p-0 gap-0 border-zinc-800 bg-zinc-900 shadow-2xl rounded-lg overflow-hidden h-[600px] flex flex-col">
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
                    placeholder="Search for songs... (⌘K)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full pl-2 py-6 border-0 bg-transparent text-zinc-200 text-base ring-offset-zinc-950 focus-visible:ring-0 focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>
            </div>
            
            {/* Batch Selection Controls */}
            {enableBatchSelection && isAdmin && results.length > 0 && (
              <div className="mt-2 flex items-center justify-between bg-zinc-800 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="bg-zinc-700 border-zinc-600 text-zinc-200 hover:bg-zinc-600"
                  >
                    {selectedTracks.length === results.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <span className="text-sm text-zinc-400">
                    {selectedTracks.length} of {results.length} selected
                  </span>
                </div>
                {selectedTracks.length > 0 && (
                  <Button
                    onClick={handleAddSelectedToQueue}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add {selectedTracks.length} to Queue
                  </Button>
                )}
              </div>
            )}
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
                      className={cn(
                        "flex items-center gap-3 p-3 cursor-pointer border-b border-zinc-800/50 last:border-b-0 transition-colors",
                        enableBatchSelection && isAdmin 
                          ? "hover:bg-zinc-800/60" 
                          : "hover:bg-zinc-800/80",
                        isTrackSelected(track) && "bg-blue-900/30 border-blue-700/50"
                      )}
                      onClick={() => handleTrackSelect(track)}
                    >
                      {/* Selection checkbox for admins */}
                      {enableBatchSelection && isAdmin && (
                        <div className="flex-shrink-0">
                          <div className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                            isTrackSelected(track) 
                              ? "bg-blue-600 border-blue-600" 
                              : "border-zinc-600 hover:border-zinc-500"
                          )}>
                            {isTrackSelected(track) && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                        </div>
                      )}
                      
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
                          {isTrackSelected(track) && (
                            <span className="text-[10px] text-blue-400 bg-blue-900/20 px-1.5 py-0.5 rounded-full">
                              ✓ SELECTED
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