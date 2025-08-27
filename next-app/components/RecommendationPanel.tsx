'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/context/socket-context';
import { useUserStore } from '@/store/userStore';
import { useAudio } from '@/store/audioStore';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Music, Play, Loader2, RefreshCw, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  album: {
    id: string;
    name: string;
    images: Array<{ url: string; width?: number; height?: number }>;
  };
  popularity?: number;
  preview_url: string | null;
  external_urls: { spotify: string };
}

interface RecommendationPanelProps {
  spaceId: string;
  isAdmin: boolean;
  className?: string;
}

export const RecommendationPanel: React.FC<RecommendationPanelProps> = ({ 
  spaceId, 
  isAdmin, 
  className = '' 
}) => {
  const { sendMessage } = useSocket();
  const { user } = useUserStore();
  const { currentSong } = useAudio();
  const [newReleases, setNewReleases] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingTrack, setAddingTrack] = useState<string | null>(null);

  const fetchNewReleases = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Fetching new releases...');
      
      const response = await fetch('/api/spotify/newReleases?limit=10', {
        method: 'GET'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result && result.items) {
        const tracks: SpotifyTrack[] = result.items.map((album: any) => ({
          id: album.id,
          name: album.name,
          artists: album.artists,
          album: {
            id: album.id,
            name: album.name,
            images: album.images
          },
          popularity: 80,
          preview_url: null,
          external_urls: album.external_urls
        }));
        
        setNewReleases(tracks);
        console.log('New releases loaded:', tracks.length);
      } else {
        throw new Error('No new releases returned');
      }
    } catch (error: any) {
      console.error('Error fetching new releases:', error);
      setError(`Failed to load new releases: ${error.message}`);
      toast.error('Failed to load new releases');
    } finally {
      setLoading(false);
    }
  };

  const addToQueue = async (track: SpotifyTrack) => {
    if (!isAdmin) {
      toast.error('Only admins can add songs to queue');
      return;
    }

    if (!user) {
      toast.error('Please log in to add songs');
      return;
    }

    setAddingTrack(track.id);

    try {
      const convertResponse = await fetch('/api/spotify/getTrack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(track)
      });

      if (!convertResponse.ok) {
        throw new Error('Failed to convert Spotify track to YouTube');
      }

      const convertData = await convertResponse.json();
      const youtubeResults = convertData.body;

      if (!youtubeResults || youtubeResults.length === 0) {
        throw new Error('No YouTube video found for this track');
      }

      const firstResult = youtubeResults[0];
      const videoId = firstResult.downloadUrl?.[0]?.url;

      if (!videoId) {
        throw new Error('Invalid video ID from conversion');
      }

      const success = sendMessage("add-to-queue", {
        spaceId: spaceId,
        addedByUser: user.name || "",
        userId: user.id || '',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        autoPlay: false,
        trackData: {
          title: track.name,
          artist: track.artists.map((artist: any) => artist.name).join(', '),
          image: track.album?.images?.[0]?.url || '',
          source: 'Youtube',
          spotifyId: track.id,
          youtubeId: videoId,
          addedByUser: {
            id: user.id || '',
            name: user.name || 'Unknown'
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
        toast.success(`Added "${track.name}" to queue`);
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error adding track to queue:', error);
      toast.error(`Failed to add "${track.name}" to queue`);
    } finally {
      setAddingTrack(null);
    }
  };

  useEffect(() => {
    fetchNewReleases();
  }, []);

  const getArtistNames = (artists: Array<{ name: string }>) => {
    return artists.map(artist => artist.name).join(', ');
  };

  return (
    <>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 0px;
          height: 0px;
        }
        @media (max-width: 640px) {
          .custom-scrollbar::-webkit-scrollbar {
            height: 2px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 2px;
          }
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: transparent;
        }
        .custom-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
      `}</style>
      <div className={`border-[#424244] backdrop-blur-sm rounded-2xl shadow-lg border border-gray-600/50 p-4 sm:p-6 w-full max-w-[39rem] ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-200">New Releases</h3>
        </div>
        <Button
          onClick={fetchNewReleases}
          disabled={loading}
          size="sm"
          variant="outline"
          className="bg-transparent border-gray-500/30 hover:bg-gray-700/30 text-gray-300 w-fit self-end sm:self-auto"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          )}
        </Button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 mb-3 sm:mb-4">
          <p className="text-red-400 text-xs sm:text-sm">{error}</p>
          <Button
            onClick={fetchNewReleases}
            size="sm"
            variant="outline"
            className="mt-2 bg-transparent border-red-500/30 hover:bg-red-900/20 text-red-400 text-xs"
          >
            Try Again
          </Button>
        </div>
      )}

      <div className="bg-[#1C1E1F] border border-gray-500/30 rounded-xl p-3 sm:p-4 relative overflow-hidden">
        {newReleases.length > 2 && (
          <div className="absolute top-2 right-2 text-xs text-gray-400 opacity-60 z-10">
            Scroll
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-6 sm:py-8">
            <div className="text-center">
              <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin mx-auto mb-2 text-purple-400" />
              <p className="text-xs sm:text-sm text-gray-400">Loading new releases...</p>
            </div>
          </div>
        ) : newReleases.length > 0 ? (
          <div 
            className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 custom-scrollbar -mx-1" 
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {newReleases.map((track: SpotifyTrack) => (
              <div key={track.id} className="flex flex-col items-center gap-1.5 sm:gap-2 group hover:bg-gray-700/20 rounded-lg p-1.5 sm:p-2 transition-colors min-w-[120px] sm:min-w-[150px] max-w-[120px] sm:max-w-[150px] flex-shrink-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex-shrink-0">
                  {track.album?.images?.[0]?.url ? (
                    <img 
                      src={track.album.images[0].url} 
                      alt={track.album.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#1C1E1F] border-[#424244] flex items-center justify-center">
                      <Music className="w-4 h-4 sm:w-6 sm:h-6 text-gray-400" />
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col items-center text-center min-w-0 w-full">
                  <p className="font-medium text-white truncate w-full text-xs leading-tight" title={track.name}>
                    {track.name}
                  </p>
                  <p className="text-xs text-gray-300 truncate w-full opacity-75" title={getArtistNames(track.artists)}>
                    {getArtistNames(track.artists)}
                  </p>
                </div>
                
                <Button
                  onClick={() => addToQueue(track)}
                  disabled={!isAdmin || addingTrack === track.id}
                  size="sm"
                  className="bg-[#1C1E1F] border-[#424244] hover:bg-gray-700 text-white opacity-0 group-hover:opacity-100 transition-opacity w-full h-6 sm:h-7 text-xs"
                  title={isAdmin ? "Add to queue" : "Only admins can add songs"}
                >
                  {addingTrack === track.id ? (
                    <Loader2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-spin" />
                  ) : (
                    <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        ) : !error ? (
          <div className="text-center py-6 sm:py-8">
            <Music className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-500" />
            <p className="text-sm sm:text-base text-gray-400 mb-2">No new releases available</p>
            <p className="text-xs sm:text-sm text-gray-500">
              Try refreshing to get the latest releases
            </p>
          </div>
        ) : null}
      </div>
      
      <div className="mt-2 sm:mt-3 text-xs text-gray-500">
        <p>Latest album releases</p>
      </div>
    </div>
    </>
  );
};