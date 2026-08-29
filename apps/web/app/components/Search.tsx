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
import { useSocket } from '@/context/socket-context';
import { motion, useInView } from "framer-motion";

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
  preview_url?: string;
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
  spaceId?: string;
}

interface AnimatedItemProps {
  children: ReactNode;
  delay?: number;
  index: number;
  onMouseEnter?: MouseEventHandler<HTMLDivElement>;
  onClick?: MouseEventHandler<HTMLDivElement>;
  className?: string;
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
  const inView = useInView(ref, { amount: 0.5, once: false });
  return (
    <motion.div
      ref={ref}
      data-index={index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.9, opacity: 0 }}
      transition={{ duration: 0.3, delay: delay + index * 0.05 }}
      className={cn("mb-2 cursor-pointer", className)}
    >
      {children}
    </motion.div>
  );
};

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
  selectedItemIds?: string[];
}

const AnimatedList = <T extends { id: string } | string>({
  items = [],
  renderItem,
  onItemSelect,
  showGradients = true,
  enableArrowNavigation = true,
  className = "",
  itemClassName = "",
  displayScrollbar = true,
  initialSelectedIndex = -1,
  selectedItemIds = [],
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
            ? "[&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-graphite [&::-webkit-scrollbar-thumb]:bg-charcoal [&::-webkit-scrollbar-thumb]:rounded-[3px] [&::-webkit-scrollbar-thumb:hover]:bg-slate-custom"
            : "[&::-webkit-scrollbar]:w-0 scrollbar-width:none -ms-overflow-style:none"
        }`}
        onScroll={handleScroll}
        style={{
          scrollbarWidth: displayScrollbar ? "thin" : "none",
          scrollbarColor: displayScrollbar ? "#363636 #282828" : "transparent",
          msOverflowStyle: displayScrollbar ? "auto" : "none"
        }}
      >
        {items.map((item, index) => {
          const itemId = typeof item === 'string' ? item : item.id;
          const isSelected = selectedItemIds.includes(itemId);
          return (
            <AnimatedItem
              key={itemId}
              delay={0.05}
              index={index}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => {
                setSelectedIndex(index);
                if (onItemSelect) {
                  onItemSelect(item, index);
                }
              }}
              className={cn(itemClassName, selectedIndex === index && "bg-graphite rounded-lg")}
            >
              {renderItem(item, index, isSelected)}
            </AnimatedItem>
          );
        })}
      </div>
      {showGradients && (
        <>
          <div
            className="absolute top-0 left-0 right-0 h-[50px] bg-gradient-to-b from-midnight-surface to-transparent pointer-events-none transition-opacity duration-300 ease"
            style={{ opacity: topGradientOpacity }}
          ></div>
          <div
            className="absolute bottom-0 left-0 right-0 h-[50px] bg-gradient-to-t from-midnight-surface to-transparent pointer-events-none transition-opacity duration-300 ease"
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
  spaceId = ''
}: SearchSongPopupProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [selectedTracks, setSelectedTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingToQueue, setAddingToQueue] = useState(false);
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Batch processing progress states
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    percentage: number;
    currentTrack?: string;
    status: string;
  } | null>(null);
  const [batchResults, setBatchResults] = useState<{
    successful: number;
    failed: number;
    total: number;
    details: Array<{ track: string; success: boolean; error?: string }>;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { sendMessage, user: socketUser, socket } = useSocket();
  
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
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        handleSearch();
      } else {
        setHasSearched(false);
        setResults([]);
        setError(null);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setSelectedTracks([]);
      setError(null);
      setHasSearched(false);
      setLoadingTrackId(null);
      setAddingToQueue(false);
      setBatchProgress(null);
      setBatchResults(null);
    }
  }, [open]);

  // Add event listeners for batch processing
  useEffect(() => {
    const handleBatchProcessingResult = (event: CustomEvent) => {
      
      
      setBatchResults({
        successful: event.detail.successful || 0,
        failed: event.detail.failed || 0,
        total: event.detail.results?.length || 0,
        details: event.detail.results || []
      });
      
      setBatchProgress(null);
      setAddingToQueue(false);
      
      // Show success/error feedback
      if (event.detail.successful > 0) {
        
      }
      if (event.detail.failed > 0) {
        console.warn(`⚠️ ${event.detail.failed} tracks failed to process`);
      }
    };

    const handleProcessingProgress = (event: CustomEvent) => {
      
      
      setBatchProgress({
        current: event.detail.current || 0,
        total: event.detail.total || 0,
        percentage: event.detail.percentage || 0,
        currentTrack: event.detail.currentTrack || '',
        status: event.detail.status || 'Processing...'
      });
    };

    window.addEventListener('batch-processing-result', handleBatchProcessingResult as EventListener);
    window.addEventListener('processing-progress', handleProcessingProgress as EventListener);

    return () => {
      window.removeEventListener('batch-processing-result', handleBatchProcessingResult as EventListener);
      window.removeEventListener('processing-progress', handleProcessingProgress as EventListener);
    };
  }, []);

  const handleSearch = async () => {
    if (!query) {
      setResults([]);
      setError(null);
      setHasSearched(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    setHasSearched(true);
    
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

  const convertTrackFormat = (spotifyTrack: Track): any => {
    return {
      id: spotifyTrack.id,
      name: spotifyTrack.name,
      type: 'song',
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
      image: spotifyTrack.album?.images?.map(img => ({
        quality: img.height >= 300 ? '500x500' : '150x150',
        url: img.url
      })) || [],
      downloadUrl: spotifyTrack.preview_url ? [
        {
          quality: '128kbps',
          url: spotifyTrack.preview_url
        }
      ] : [],
      year: new Date().getFullYear().toString(),
      releaseDate: new Date().toISOString().split('T')[0],
      duration: '30',
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

  const tryMultipleResults = async (searchResults: any[], track: any, spaceId: string, autoPlay: boolean = false): Promise<boolean> => {
    for (let i = 0; i < searchResults.length; i++) {
      const { downloadUrl: [{ url: videoId }] } = searchResults[i];
      if (!videoId || videoId.length !== 11 || !/^[a-zA-Z0-9_-]+$/.test(videoId)) {
        continue;
      }
      
      const title : string = track.name.replace(/\s*\(.*?\)\s*/g, '').trim();
      
      try {
        const success = sendMessage("add-to-queue", {
          spaceId: spaceId,
          addedByUser : socketUser?.name || "",
          userId: socketUser?.id || '',
          url: `https://www.youtube.com/watch?v=${videoId}`,
          autoPlay: autoPlay,
          trackData: {
            title: title,
            artist:  track.artists.map((artist: Artist) => artist.name).join(', ') || 'Unknown Artist',
            image: track.album?.images?.[0]?.url || '',
            source: 'Youtube',
            spotifyId: track.id,
            youtubeId: videoId,
            addedByUser: {
              id: socketUser?.id || '',
              name: socketUser?.name || 'Unknown'
            }
          },
          title: track.name,
          artist: track.artists?.[0]?.name || 'Unknown Artist',
          image: track.album?.images?.[0]?.url || '',
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

    setLoadingTrackId(track.id);
    setAddingToQueue(true);
    try {
      
      
      if (!spaceId) {
        setError('Room ID not found. Please rejoin the room.');
        return;
      }

      // Send simplified track metadata - let backend worker pool handle YouTube search
      const success = sendMessage('add-to-queue', {
        spaceId,
        userId: socketUser?.id,
        autoPlay: true,
        // Send track metadata for backend worker pool to process
        trackData: {
          title: track.name,
          artist: track.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
          album: track.album?.name || '',
          spotifyId: track.id,
          spotifyUrl: track.external_urls?.spotify || '',
          smallImg: track.album?.images?.[track.album?.images.length - 1]?.url || '',
          bigImg: track.album?.images?.[0]?.url || '',
          duration: 30000, // Default duration since Spotify API doesn't provide duration in search results
          source: 'Spotify' // Backend will convert to YouTube
        }
      });

      if (success) {
        
        if (onSelect) {
          onSelect(track);
        }
        setOpen(false);
      } else {
        throw new Error("Failed to send track to backend worker pool");
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(`Failed to add song: ${error.message}`);
      } else {
        setError('Failed to add the selected track to queue');
      }
    } finally {
      setLoadingTrackId(null);
      setAddingToQueue(false);
    }
  };

  const handleAddSelectedToQueue = async () => {
    if (selectedTracks.length === 0) return;

    setAddingToQueue(true);
    try {
      if (!spaceId) {
        setError('Room ID not found. Please rejoin the room.');
        return;
      }

      // Send simplified track metadata for backend worker pool processing
      
      
      const songsForBatch = selectedTracks.map((track) => ({
        title: track.name,
        artist: track.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
        album: track.album?.name || '',
        spotifyId: track.id,
        spotifyUrl: track.external_urls?.spotify || '',
        smallImg: track.album?.images?.[track.album?.images.length - 1]?.url || '',
        bigImg: track.album?.images?.[0]?.url || '',
        duration: 30000, // Default duration since Spotify API doesn't provide duration in search results
        source: 'Spotify' // Backend worker pool will convert to YouTube
      }));

      // Send batch request to backend worker pool
      const batchSent = sendMessage('add-batch-to-queue', {
        spaceId,
        songs: songsForBatch,
        userId: socketUser?.id,
        autoPlay: true // Auto-play first successful song
      });

      if (!batchSent) {
        throw new Error('Failed to send batch request to server');
      }

      

      if (onBatchSelect) {
        onBatchSelect(selectedTracks);
      }
      
      setOpen(false);
      setSelectedTracks([]);
    } catch (error) {
      setError('Failed to add selected tracks to queue');
    } finally {
      setAddingToQueue(false);
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
          variant="ghost"
          className={cn(
            "group flex items-center gap-2 text-steel-gray hover:text-paper-white transition-colors rounded-full px-4 py-2",
            buttonClassName
          )}
        >
          <SearchIcon className="w-4 h-4" />
          <span className="font-satoshi text-sm">Search</span>
          <kbd className="hidden sm:inline-flex ml-1 font-mono text-[10px] text-steel-gray/40">⌘K</kbd>
        </Button>
      </DialogTrigger>

      <DialogContent
        hideCloseButton={true}
        className={cn(
          "w-[95vw] max-w-xl p-0 gap-0 bg-void-black border border-paper-white/10 rounded-[28px] overflow-hidden flex flex-col",
          hasSearched ? "h-[75vh] max-h-[600px]" : "h-auto"
        )}
      >
        <DialogHeader className="p-0 m-0 h-0">
          <VisuallyHidden><DialogTitle>Search Songs</DialogTitle></VisuallyHidden>
        </DialogHeader>

        <div className="flex flex-col h-full">
          {/* Input row */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-paper-white/[0.06]">
            <SearchIcon className="w-5 h-5 text-paper-white/30 flex-shrink-0" />
            <Input
              ref={inputRef}
              placeholder="Search songs, artists, albums..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 border-0 bg-transparent text-paper-white text-[15px] placeholder:text-paper-white/20 focus-visible:ring-0 focus:outline-none font-satoshi p-0 h-auto shadow-none"
              autoFocus
            />
            {query ? (
              <button onClick={() => setQuery('')} className="text-steel-gray hover:text-paper-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            ) : (
              <kbd className="font-mono text-[10px] text-paper-white/15 border border-paper-white/10 rounded px-1.5 py-0.5">ESC</kbd>
            )}
          </div>

          {/* Batch status bar */}
          {batchProgress && (
            <div className="px-5 py-2.5 border-b border-paper-white/[0.06] flex items-center gap-3">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-electric-cyan flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="w-full h-[3px] bg-paper-white/[0.06] rounded-full">
                  <div className="h-full bg-electric-cyan rounded-full transition-all" style={{ width: `${batchProgress.percentage}%` }} />
                </div>
              </div>
              <span className="font-mono text-[10px] text-steel-gray flex-shrink-0">{batchProgress.current}/{batchProgress.total}</span>
            </div>
          )}

          {batchResults && !batchProgress && (
            <div className="px-5 py-2 border-b border-paper-white/[0.06] flex items-center justify-between">
              <span className="font-mono text-[11px] text-green-400">{batchResults.successful} added{batchResults.failed > 0 ? `, ${batchResults.failed} failed` : ''}</span>
              <button onClick={() => setBatchResults(null)}><X className="w-3 h-3 text-steel-gray" /></button>
            </div>
          )}

          {enableBatchSelection && isAdmin && hasSearched && results.length > 0 && (
            <div className="px-5 py-2 border-b border-paper-white/[0.06] flex items-center justify-between">
              <button onClick={handleSelectAll} className="font-mono text-[11px] text-paper-white/40 hover:text-paper-white transition-colors">
                {selectedTracks.length === results.length ? 'Deselect all' : 'Select all'}
              </button>
              {selectedTracks.length > 0 && (
                <button
                  onClick={handleAddSelectedToQueue}
                  disabled={addingToQueue}
                  className="font-mono text-[11px] text-paper-white hover:text-electric-cyan transition-colors disabled:opacity-40 flex items-center gap-1"
                >
                  {addingToQueue ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Add {selectedTracks.length} to queue
                </button>
              )}
            </div>
          )}

          {/* Results */}
          {hasSearched && (
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-paper-white/20" />
                </div>
              ) : results.length > 0 ? (
                <div className="flex-1 relative min-h-0">
                  <AnimatedList<Track>
                    items={results}
                    onItemSelect={handleTrackSelect}
                    selectedItemIds={selectedTracks.map(t => t.id)}
                    className="h-full"
                    displayScrollbar={true}
                    renderItem={(track, index, isSelected) => {
                      const isLoading = loadingTrackId === track.id;
                      return (
                        <div className={cn(
                          "group flex items-center gap-3 px-5 py-2.5 transition-colors cursor-pointer",
                          "hover:bg-paper-white/[0.05]",
                          isLoading && "opacity-40 pointer-events-none"
                        )}>
                          {enableBatchSelection && isAdmin && (
                            <div className={cn(
                              "w-4 h-4 rounded-[4px] border flex items-center justify-center flex-shrink-0",
                              isSelected ? "bg-paper-white border-paper-white" : "border-paper-white/15"
                            )}>
                              {isSelected && <Check className="w-2.5 h-2.5 text-void-black" />}
                            </div>
                          )}

                          <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-midnight-surface">
                            {track.album?.images?.[0]?.url ? (
                              <img src={track.album.images[0].url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><Music className="w-4 h-4 text-paper-white/10" /></div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-satoshi text-[13px] text-paper-white truncate leading-tight">{track.name}</p>
                            <p className="font-satoshi text-[12px] text-paper-white/40 truncate">{track.artists?.map(a => a.name).join(', ')}</p>
                          </div>

                          <div className="flex-shrink-0 w-8 flex justify-center">
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-paper-white/30" />
                            ) : (
                              <Plus className="w-4 h-4 text-paper-white/0 group-hover:text-paper-white/50 transition-colors" />
                            )}
                          </div>
                        </div>
                      );
                    }}
                  />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center px-6">
                  <div className="text-center">
                    <p className="font-satoshi text-sm text-paper-white/30 mb-1">{error ? 'Search failed' : 'No results found'}</p>
                    <p className="font-satoshi text-[12px] text-paper-white/15">{error || 'Try different keywords'}</p>
                    {error && (
                      <button onClick={handleSearch} className="mt-3 font-mono text-[11px] text-paper-white/30 hover:text-paper-white transition-colors">
                        Retry
                      </button>
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