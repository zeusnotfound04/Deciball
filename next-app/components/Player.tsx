'use client';

import { useState, useEffect } from 'react';
import { useAudio } from '@/store/audioStore';
import { useSocket } from '@/context/socket-context';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { 
  Music, 
  Users, 
  Settings, 
  Maximize2, 
  Minimize2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipForward,
  SkipBack
} from 'lucide-react';

// Import the existing components
import PLayerCover from '@/app/components/PlayerCover';
import AudioController from '@/app/components/Controller';
import { Listener } from './Listener';

interface PlayerProps {
  spaceId: string;
  isAdmin?: boolean;
  userCount?: number;
  userDetails?: any[];
  className?: string;
}

export const Player: React.FC<PlayerProps> = ({ 
  spaceId, 
  isAdmin = false, 
  userCount = 0,
  userDetails = [],
  className = ""
}) => {
  const { 
    currentSong, 
    isPlaying, 
    isMuted, 
    volume,
    togglePlayPause,
    mute,
    unmute,
    playNext,
    playPrev
  } = useAudio();
  
  const { socket } = useSocket();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showListeners, setShowListeners] = useState(false);
  const [activeTab, setActiveTab] = useState<'cover' | 'listeners' | 'settings'>('cover');

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't interfere with input fields
      }
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowRight':
          if (e.ctrlKey) {
            e.preventDefault();
            playNext();
          }
          break;
        case 'ArrowLeft':
          if (e.ctrlKey) {
            e.preventDefault();
            playPrev();
          }
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          isMuted ? unmute() : mute();
          break;
        case 'l':
        case 'L':
          if (e.ctrlKey) {
            e.preventDefault();
            setShowListeners(!showListeners);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [togglePlayPause, playNext, playPrev, isMuted, mute, unmute, showListeners]);

  if (!currentSong) {
    return (
      <Card className={`w-full ${className}`}>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Music className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No music playing</h3>
            <p className="text-gray-500">Add some songs to the queue to get started!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`w-full space-y-4 ${className}`}>
      {/* Main Player Card */}
      <Card className="w-full overflow-hidden">
        <CardContent className="p-0">
          <div className={`transition-all duration-300 ${isExpanded ? 'min-h-[600px]' : 'min-h-[400px]'}`}>
            {/* Player Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <div>
                    <h2 className="font-semibold">Now Playing</h2>
                    <p className="text-sm opacity-80">Room: {spaceId.slice(0, 8)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Tab Navigation */}
                  <div className="flex bg-white/20 rounded-lg p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab('cover')}
                      className={`text-white hover:bg-white/20 ${activeTab === 'cover' ? 'bg-white/30' : ''}`}
                    >
                      <Music className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab('listeners')}
                      className={`text-white hover:bg-white/20 ${activeTab === 'listeners' ? 'bg-white/30' : ''}`}
                    >
                      <Users className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab('settings')}
                      className={`text-white hover:bg-white/20 ${activeTab === 'settings' ? 'bg-white/30' : ''}`}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Expand/Collapse */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-white hover:bg-white/20"
                  >
                    {isExpanded ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Player Content */}
            <div className="p-6">
              <div className={`grid gap-6 ${isExpanded ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
                {/* Left Column - Always visible */}
                <div className="space-y-4">
                  {/* Song Info */}
                  <div className="text-center lg:text-left">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      {currentSong.name}
                    </h1>
                    {currentSong.artistes?.primary?.[0]?.name && (
                      <p className="text-lg text-gray-600 mb-3">
                        {currentSong.artistes.primary[0].name}
                      </p>
                    )}
                    <div className="flex items-center justify-center lg:justify-start gap-3">
                      <Badge variant={currentSong.url?.includes('spotify.com') ? 'default' : 'secondary'}>
                        {currentSong.url?.includes('spotify.com') ? 'Spotify' : 'YouTube'}
                      </Badge>
                      {currentSong.addedByUser && (
                        <span className="text-sm text-gray-500">
                          Added by @{currentSong.addedByUser.username}
                        </span>
                      )}
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500">{userCount} listening</span>
                      </div>
                    </div>
                  </div>

                  {/* Album Cover */}
                  {activeTab === 'cover' && (
                    <div className="flex justify-center">
                      <div className="w-full max-w-sm">
                        <PLayerCover />
                      </div>
                    </div>
                  )}

                  {/* Listeners */}
                  {activeTab === 'listeners' && (
                    <Listener 
                      spaceId={spaceId}
                      isAdmin={isAdmin}
                      userCount={userCount}
                      userDetails={userDetails}
                    />
                  )}

                  {/* Settings */}
                  {activeTab === 'settings' && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          <h3 className="font-semibold">Player Settings</h3>
                          
                          {/* Volume Control */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Volume</label>
                            <div className="flex items-center gap-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={isMuted ? unmute : mute}
                              >
                                {isMuted ? (
                                  <VolumeX className="w-4 h-4" />
                                ) : (
                                  <Volume2 className="w-4 h-4" />
                                )}
                              </Button>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={isMuted ? 0 : volume}
                                onChange={(e) => {
                                  // Handle volume change through audio store
                                }}
                                className="flex-1"
                              />
                              <span className="text-sm text-gray-500 w-12">
                                {Math.round((isMuted ? 0 : volume) * 100)}%
                              </span>
                            </div>
                          </div>

                          {/* Quick Actions */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Quick Actions</label>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Play className="w-4 h-4 mr-2" />
                                Keyboard Shortcuts
                              </Button>
                              {isAdmin && (
                                <Button variant="outline" size="sm">
                                  <Settings className="w-4 h-4 mr-2" />
                                  Room Settings
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Keyboard Shortcuts Info */}
                          <div className="text-xs text-gray-500 space-y-1">
                            <p><kbd className="bg-gray-100 px-1 rounded">Space</kbd> - Play/Pause</p>
                            <p><kbd className="bg-gray-100 px-1 rounded">Ctrl+→</kbd> - Next Song</p>
                            <p><kbd className="bg-gray-100 px-1 rounded">Ctrl+←</kbd> - Previous Song</p>
                            <p><kbd className="bg-gray-100 px-1 rounded">M</kbd> - Mute/Unmute</p>
                            <p><kbd className="bg-gray-100 px-1 rounded">Ctrl+L</kbd> - Toggle Listeners</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Right Column - Only visible when expanded */}
                {isExpanded && (
                  <div className="space-y-4">
                    {/* Additional content when expanded */}
                    <Card>
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-3">Room Activity</h3>
                        <div className="space-y-2 text-sm text-gray-600">
                          <p>• {userCount} users connected</p>
                          <p>• Song playing for {Math.floor(Math.random() * 60)} seconds</p>
                          <p>• {Math.floor(Math.random() * 10)} songs in queue</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Show listeners in expanded view regardless of tab */}
                    <Listener 
                      spaceId={spaceId}
                      isAdmin={isAdmin}
                      userCount={userCount}
                      userDetails={userDetails}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audio Controller - Always at bottom */}
      <AudioController />
    </div>
  );
};
