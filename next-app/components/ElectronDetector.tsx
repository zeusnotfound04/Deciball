'use client';

import { useEffect } from 'react';

export function ElectronDetector() {
  useEffect(() => {
    const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');
    console.log('Is running in Electron:', isElectron);
    
    const hasElectronAPI = !!window.electronAPI;
    console.log('Has Electron API bridge:', hasElectronAPI);
    
    if (window.electronAPI) {
      console.log('Electron API methods available - ready to receive song data');
    }
  }, []);
  
  return null;
}
