// 'use client';

// import { useEffect } from 'react';
// import { useAudioStore } from '@/store/audioStore';
// import { useSocket } from '@/context/socket-context';

// declare global {
//   interface Window {
//     electronAPI?: {
//       updateDiscordActivity: (songData: any) => void;
//     }
//   }
// }

// export function DiscordPresence() {
//   const { 
//     currentSong, 
//     isPlaying,
//     currentProgress,
//     currentDuration,
//     currentSpaceId
//   } = useAudioStore();
  
//   const { sendMessage } = useSocket();

//   useEffect(() => {
//     if (!currentSong || !currentSong.name) return;
    
//     const artistNames = currentSong.artistes?.primary
//       ? currentSong.artistes.primary.map(artist => artist.name).join(', ')
//       : 'Unknown Artist';
    
//     const imageUrl = currentSong.image && currentSong.image.length > 0 
//       ? currentSong.image[0].url 
//       : undefined;
    
//     const songData = {
//       title: currentSong.name,
//       artist: artistNames,
//       image: imageUrl,
//       duration: currentDuration,
//       currentTime: currentProgress,
//       startTime: Date.now() - (currentProgress * 1000),
//       isPlaying: isPlaying,
//       spaceId: currentSpaceId || undefined,
//       spaceName: 'Deciball Space'
//     };

//     try {
//       console.log('Current window.electronAPI status:', !!window.electronAPI);
      
//       if (typeof window !== 'undefined' && window.electronAPI) {
//         console.log('Sending Discord activity update to Electron:', JSON.stringify(songData));
//         window.electronAPI.updateDiscordActivity(songData);
//       } else {
//         console.log('Running outside of Electron environment - Discord RPC not available');
//       }
//     } catch (error) {
//       console.error('Error sending data to Electron:', error);
//     }
    
//     if (currentSpaceId) {
//       console.log('Broadcasting Discord activity to WebSocket:', songData);
//       sendMessage('discord-activity-update', {
//         ...songData,
//         spaceId: currentSpaceId
//       });
//     }
//   }, [
//     currentSong?.name,
//     currentSong?.artistes,
//     isPlaying,
//     Math.floor(currentProgress / 10),
//     currentSpaceId
//   ]);

//   return null;
// }
