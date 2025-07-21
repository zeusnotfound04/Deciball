'use client';

import { useEffect } from 'react';

interface ElectronAPI {
  updateDiscordActivity: (songData: any) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export function ElectronDetector() {
  useEffect(() => {
    const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');
    console.log('Is running in Electron:', isElectron);
    
    const hasElectronAPI = !!window.electronAPI;
    console.log('Has Electron API bridge:', hasElectronAPI);
    
    if (window.electronAPI) {
      console.log('Electron API methods available');
      
      window.electronAPI.updateDiscordActivity({
        title: 'Test Song',
        artist: 'Test Artist',
        duration: 180,
        startTime: Date.now(),
        spaceId: 'test-space',
        spaceName: 'Test Space'
      });
      console.log('Test message sent to Electron');
    }
  }, []);
  
  return null;
}
