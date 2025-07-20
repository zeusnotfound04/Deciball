'use client';

import { useState, useEffect, useRef, ReactNode, MouseEventHandler, UIEvent } from 'react';
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
// Assuming searchResults type is not directly used for the Track type, but if it is, ensure it's compatible.
// import { searchResults } from '@/types'; 
import { useSocket } from '@/context/socket-context';
import { motion, useInView } from "framer-motion";

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

// --- AnimatedItem Component ---
interface AnimatedItemProps {
  children: ReactNode;
  delay?: number;
  index: number;
  onMouseEnter?: MouseEventHandler<HTMLDivElement>;
  onClick?: MouseEventHandler<HTMLDivElement>;
  className?: string; // Add className prop for flexibility
}

const AnimatedItem: React.FC<AnimatedItemProps> = ({
  children,
  delay = 0,
  index,
  onMouseEnter,
  onClick,
  className,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5, once: false }); // Changed once to false for continuous animation if needed
  return (
    <motion.div
      ref={ref}
      data-index={index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      initial={{ scale: 0.9, opacity: 0 }} // Slightly adjusted initial scale for smoother entry
      animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.9, opacity: 0 }}
      transition={{ duration: 0.3, delay: delay + index * 0.05 }} // Added index-based delay for staggered effect
      className={cn("mb-2 cursor-pointer", className)} // Adjusted margin and added cn for class merging
    >
      {children}
    </motion.div>
  );
};

// --- AnimatedList Component ---
interface AnimatedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number, isSelected: boolean) => ReactNode;
  onItemSelect?: (item: T, index: number) => void;
  showGradients?: boolean;
  enableArrowNavigation?: boolean;
  className?: string;
  itemClassName?: string;
  displayScrollbar?: boolean;
  initialSelectedIndex?: number;
  selectedItemIds?: string[]; // New prop to track selected items by ID
}

const AnimatedList = <T extends { id: string } | string>({ // Generic type T, requires 'id' if object
  items = [],
  renderItem,
  onItemSelect,
  showGradients = true,
  enableArrowNavigation = true,
  className = "",
  itemClassName = "",
  displayScrollbar = true,
  initialSelectedIndex = -1,
  selectedItemIds = [], // Default to empty array
}: AnimatedListProps<T>) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(initialSelectedIndex);
  const [keyboardNav, setKeyboardNav] = useState<boolean>(false);
  const [topGradientOpacity, setTopGradientOpacity] = useState<number>(0);
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState<number>(1);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target as HTMLDivElement;
    setTopGradientOpacity(Math.min(scrollTop / 50, 1));
    const bottomDistance = scrollHeight - (scrollTop + clientHeight);
    setBottomGradientOpacity(
      scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1)
    );
  };

  useEffect(() => {
    if (!enableArrowNavigation) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
      } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        if (selectedIndex >= 0 && selectedIndex < items.length) {
          e.preventDefault();
          if (onItemSelect) {
            onItemSelect(items[selectedIndex], selectedIndex);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, selectedIndex, onItemSelect, enableArrowNavigation]);

  useEffect(() => {
    if (!keyboardNav || selectedIndex < 0 || !listRef.current) return;
    const container = listRef.current;
    const selectedItem = container.querySelector(
      `[data-index="${selectedIndex}"]`
    ) as HTMLElement | null;
    if (selectedItem) {
      const extraMargin = 50;
      const containerScrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const itemTop = selectedItem.offsetTop;
      const itemBottom = itemTop + selectedItem.offsetHeight;
      if (itemTop < containerScrollTop + extraMargin) {
        container.scrollTo({ top: itemTop - extraMargin, behavior: "smooth" });
      } else if (
        itemBottom >
        containerScrollTop + containerHeight - extraMargin
      ) {
        container.scrollTo({
          top: itemBottom - containerHeight + extraMargin,
          behavior: "smooth",
        });
      }
    }
    setKeyboardNav(false);
  }, [selectedIndex, keyboardNav]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div
        ref={listRef}
        className={`h-full overflow-y-auto p-2 ${
          displayScrollbar
            ? "[&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-zinc-800/50 [&::-webkit-scrollbar-thumb]:bg-zinc-600/50 [&::-webkit-scrollbar-thumb]:rounded-[3px] [&::-webkit-scrollbar-thumb:hover]:bg-zinc-500/70"
            : "[&::-webkit-scrollbar]:w-0 scrollbar-width:none -ms-overflow-style:none"
        }`}
        onScroll={handleScroll}
        style={{
          scrollbarWidth: displayScrollbar ? "thin" : "none",
          scrollbarColor: displayScrollbar ? "#52525b #27272a" : "transparent",
          msOverflowStyle: displayScrollbar ? "auto" : "none"
        }}
      >
        {items.map((item, index) => {
          const itemId = typeof item === 'string' ? item : item.id;
          const isSelected = selectedItemIds.includes(itemId);
          return (
            <AnimatedItem
              key={itemId} // Use item.id as key if available, otherwise index
              delay={0.05} // Small delay for staggered animation
              index={index}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => {
                setSelectedIndex(index);
                if (onItemSelect) {
                  onItemSelect(item, index);
                }
              }}
              className={cn(itemClassName, selectedIndex === index && "bg-zinc-800/60 rounded-lg")} // Apply selected style here
            >
              {renderItem(item, index, isSelected)}
            </AnimatedItem>
          );
        })}
      </div>
      {showGradients && (
        <>
          <div
            className="absolute top-0 left-0 right-0 h-[50px] bg-gradient-to-b from-zinc-900 to-transparent pointer-events-none transition-opacity duration-300 ease" // Adjusted gradient color
            style={{ opacity: topGradientOpacity }}
          ></div>
          <div
            className="absolute bottom-0 left-0 right-0 h-[50px] bg-gradient-to-t from-zinc-900 to-transparent pointer-events-none transition-opacity duration-300 ease" // Adjusted gradient color and height
            style={{ opacity: bottomGradientOpacity }}
          ></div>
        </>
      )}
    </div>
  );
};


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
  const [hasSearched, setHasSearched] = useState(false); // Track if user has searched
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
      } else {
        // Reset search state when query is empty
        setHasSearched(false);
        setResults([]);
        setError(null);
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
      setHasSearched(false); // Reset search state
    }
  }, [open]);

  const handleSearch = async () => {
    if (!query) {
      setResults([]);
      setError(null);
      setHasSearched(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    setHasSearched(true); // Mark that user has searched
    
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

  // Helper function to try multiple Youtube results until one works
  const tryMultipleResults = async (searchResults: any[], track: any, spaceId: string, autoPlay: boolean = false): Promise<boolean> => {
    for (let i = 0; i < searchResults.length; i++) {
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
          addedByUser : socketUser?.name || "",
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
              name: socketUser?.name || 'Unknown'
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
            "group relative flex items-center gap-3 px-6 py-3 border-zinc-700/50 bg-gradient-to-r from-zinc-900/90 to-zinc-800/90 text-zinc-200 hover:from-zinc-800/90 hover:to-zinc-700/90 hover:text-white transition-all duration-300 shadow-lg hover:shadow-xl backdrop-blur-sm border",
            "before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-r before:from-cyan-500/20 before:to-purple-500/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
            buttonClassName
          )}
        >
          <div className="relative z-10 flex items-center gap-3">
            <div className="p-1 rounded-full bg-zinc-800/50 group-hover:bg-zinc-700/50 transition-colors duration-300">
              <SearchIcon className="w-4 h-4 text-zinc-400 group-hover:text-cyan-400 transition-colors duration-300" />
            </div>
            <span className="font-medium">Search Songs</span>
            <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded-md border border-zinc-600/50 bg-zinc-800/50 px-2 font-mono text-[10px] font-medium text-zinc-400 opacity-100 group-hover:border-zinc-500/50 group-hover:bg-zinc-700/50 transition-all duration-300">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent 
        hideCloseButton={true} 
        className={cn(
          "w-[90vw] max-w-3xl p-0 gap-0 border-zinc-700/50 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-2xl rounded-xl overflow-hidden flex flex-col backdrop-blur-xl",
          // Dynamic height based on whether results should be shown
          hasSearched ? "h-[650px]" : "h-auto"
        )}
      >
        <DialogHeader className="p-0 m-0 h-0">
          <VisuallyHidden>
            <DialogTitle>Search Songs</DialogTitle>
          </VisuallyHidden>
        </DialogHeader>
        
        <div className="flex flex-col h-full">
          {/* Enhanced Search Input - Fixed height */}
          <div className="flex-shrink-0 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-4 border-b border-zinc-800/50">
            <div className="flex rounded-xl overflow-hidden shadow-xl ring-1 ring-zinc-700/50">
              <div className="relative flex-1">
                <div className="flex items-center bg-gradient-to-r from-zinc-800/90 to-zinc-900/90 rounded-xl backdrop-blur-sm">
                  <div className="p-3">
                    <SearchIcon className="h-5 w-5 text-cyan-400" />
                  </div>
                  <Input
                    ref={inputRef}
                    placeholder="Search for songs, artists, albums... (⌘K)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full py-6 border-0 bg-transparent text-zinc-100 text-lg placeholder:text-zinc-400 ring-offset-zinc-950 focus-visible:ring-0 focus:outline-none font-medium"
                    autoFocus
                  />
                  {query && (
                    <button
                      onClick={() => setQuery('')}
                      className="p-2 mr-2 hover:bg-zinc-700/50 rounded-lg transition-colors"
                    >
                      <X className="h-4 w-4 text-zinc-400 hover:text-zinc-200" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Enhanced Batch Selection Controls */}
            {enableBatchSelection && isAdmin && hasSearched && results.length > 0 && (
              <div className="mt-4 flex items-center justify-between bg-gradient-to-r from-zinc-800/50 to-zinc-700/50 rounded-xl p-4 backdrop-blur-sm border border-zinc-600/30">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="bg-zinc-700/50 border-zinc-600/50 text-zinc-200 hover:bg-zinc-600/50 hover:border-zinc-500/50 transition-all duration-300"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {selectedTracks.length === results.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                    <span className="text-sm text-zinc-300 font-medium">
                      {selectedTracks.length} of {results.length} selected
                    </span>
                  </div>
                </div>
                {selectedTracks.length > 0 && (
                  <Button
                    onClick={handleAddSelectedToQueue}
                    className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add {selectedTracks.length} to Queue
                  </Button>
                )}
              </div>
            )}
          </div>
          
          {/* Enhanced Results container */}
          {hasSearched && (
            <div className="flex-1 bg-gradient-to-b from-zinc-900/50 to-zinc-950/80 border-t border-zinc-700/30 shadow-inner overflow-hidden flex flex-col min-h-0 backdrop-blur-sm">
              {/* Enhanced loading indicator */}
              {loading && (
                <div className="flex items-center justify-center py-12 flex-1">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                      <div className="absolute inset-0 h-8 w-8 animate-ping bg-cyan-400/20 rounded-full"></div>
                    </div>
                    <div className="text-center">
                      <span className="text-lg text-zinc-200 font-medium">Searching...</span>
                      <p className="text-sm text-zinc-400 mt-1">Finding the perfect tracks for you</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Enhanced results display */}
              {!loading && results.length > 0 && (
                <div className="flex-1 relative min-h-0">
                  <AnimatedList<Track>
                    items={results}
                    onItemSelect={handleTrackSelect}
                    selectedItemIds={selectedTracks.map(t => t.id)}
                    className="h-full"
                    displayScrollbar={true}
                    renderItem={(track, index, isSelected) => (
                      <div
                        className={cn(
                          "group flex items-center gap-4 p-4 border-b border-zinc-800/30 last:border-b-0 transition-all duration-300 hover:bg-gradient-to-r hover:from-zinc-800/40 hover:to-zinc-700/40",
                          enableBatchSelection && isAdmin 
                            ? "hover:bg-zinc-800/50" 
                            : "hover:bg-zinc-800/60 hover:scale-[1.01]",
                          "backdrop-blur-sm"
                        )}
                      >
                        {/* Enhanced selection checkbox */}
                        {enableBatchSelection && isAdmin && (
                          <div className="flex-shrink-0">
                            <div className={cn(
                              "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-300 cursor-pointer",
                              isSelected 
                                ? "bg-gradient-to-r from-cyan-500 to-blue-500 border-cyan-500 shadow-lg shadow-cyan-500/25" 
                                : "border-zinc-500/50 hover:border-zinc-400/70 hover:bg-zinc-700/30"
                            )}>
                              {isSelected && (
                                <Check className="w-3 h-3 text-white drop-shadow-sm" />
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Enhanced album artwork */}
                        <div className="w-14 h-14 overflow-hidden rounded-xl flex-shrink-0 border-2 border-zinc-700/50 shadow-lg bg-gradient-to-br from-zinc-800 to-zinc-900 group-hover:border-zinc-600/50 transition-all duration-300">
                          {track.album?.images && track.album.images[0]?.url ? (
                            <img
                              src={track.album.images[0].url}
                              alt={track.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder.svg';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-zinc-500">
                              <Music className="w-7 h-7 text-zinc-400" />
                            </div>
                          )}
                        </div>
                        
                        {/* Enhanced track information */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate text-zinc-100 group-hover:text-white text-base leading-tight">
                            {track.name}
                          </h3>
                          <p className="text-sm text-zinc-400 truncate mt-1 group-hover:text-zinc-300">
                            {track.artists?.map(artist => artist.name).join(', ') || 'Unknown Artist'}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="flex items-center text-xs text-zinc-500 bg-zinc-800/60 px-2 py-1 rounded-full border border-zinc-700/50">
                              <Music className="w-3 h-3 mr-1 text-zinc-400" />
                              {track.preview_url ? 'PREVIEW' : 'TRACK'}
                            </span>
                            {track.preview_url && (
                              <span className="text-xs text-emerald-300 bg-emerald-900/30 px-2 py-1 rounded-full border border-emerald-700/50">
                                ▶ PLAYABLE
                              </span>
                            )}
                            {isSelected && (
                              <span className="text-xs text-cyan-300 bg-cyan-900/30 px-2 py-1 rounded-full border border-cyan-700/50">
                                ✓ SELECTED
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Hover indicator */}
                        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="p-2 rounded-full bg-zinc-700/50 text-zinc-300">
                            <Plus className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    )}
                  />
                </div>
              )}
              
              {/* Enhanced empty state */}
              {!loading && results.length === 0 && (
                <div className="py-16 text-center flex-1 flex items-center justify-center">
                  <div className="max-w-md">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center mx-auto mb-6 border border-zinc-700/50">
                      <SearchIcon className="w-10 h-10 text-zinc-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-zinc-300 mb-2">
                      {error ? 'Search Error' : 'No Results Found'}
                    </h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      {error 
                        ? `${error}. Please check your connection and try again.` 
                        : 'Try different keywords, artist names, or song titles to find what you\'re looking for.'}
                    </p>
                    {error && (
                      <Button
                        variant="outline"
                        onClick={handleSearch}
                        className="mt-4 bg-zinc-800/50 border-zinc-600/50 text-zinc-300 hover:bg-zinc-700/50"
                      >
                        Try Again
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}