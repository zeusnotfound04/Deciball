'use client';

import { useEffect } from 'react';

export function ElectronDetector() {
  useEffect(() => {
    const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');
    
    
    const hasElectronAPI = !!window.electronAPI;
    
    
    if (window.electronAPI) {
      
    }
  }, []);
  
  return null;
}
