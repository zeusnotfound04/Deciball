'use client';

import { useEffect } from 'react';
import { useAudioStore } from '@/store/audioStore';
import { useSocket } from '@/context/socket-context';

export function DiscordPresence() {
  const { 
    currentSong, 
    isPlaying,
    currentProgress,
    currentDuration,
    currentSpaceId
  } = useAudioStore();
  
  const { sendMessage } = useSocket();

  useEffect(() => {
    if (!currentSong || !currentSong.name) {
      // Send a "no song playing" status to Discord
      if (typeof window !== 'undefined' && window.electronAPI) {
        console.log('No song playing, clearing Discord activity');
        window.electronAPI.updateDiscordActivity({
          title: 'Choosing a song...',
          artist: 'Deciball Music',
          isPlaying: false,
          spaceId: currentSpaceId || undefined,
          spaceName: 'Music Room'
        });
      }
      return;
    }
    
    const artistNames = currentSong.artistes?.primary
      ? currentSong.artistes.primary.map(artist => artist.name).join(', ')
      : 'Unknown Artist';
    
    const imageUrl = currentSong.image && currentSong.image.length > 0 
      ? currentSong.image[0].url 
      : undefined;
    
    const songData = {
      title: currentSong.name,
      artist: artistNames,
      image: imageUrl,
      duration: currentDuration,
      currentTime: currentProgress,
      startTime: Date.now() - (currentProgress * 1000),
      isPlaying: isPlaying,
      spaceId: currentSpaceId || undefined,
      spaceName: 'Deciball Music Room'
    };

    try {
      console.log('Current window.electronAPI status:', !!window.electronAPI);
      
      if (typeof window !== 'undefined' && window.electronAPI) {
        console.log('Sending Discord activity update to Electron:', JSON.stringify(songData, null, 2));
        window.electronAPI.updateDiscordActivity(songData);
      } else {
        console.log('Running outside of Electron environment - Discord RPC not available');
      }
    } catch (error) {
      console.error('Error sending data to Electron:', error);
    }
    
    if (currentSpaceId) {
      console.log('Broadcasting Discord activity to WebSocket:', songData);
      sendMessage('discord-activity-update', {
        ...songData,
        spaceId: currentSpaceId
      });
    }
  }, [
    currentSong?.name,
    currentSong?.artistes,
    isPlaying,
    Math.floor(currentProgress / 5), // Update every 5 seconds for better performance
    currentSpaceId,
    currentDuration
  ]);

  return null;
}
