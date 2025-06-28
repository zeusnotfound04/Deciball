import { useEffect, useRef } from 'react';
import { useAudio } from '@/store/audioStore';
import { useUserStore } from '@/store/userStore';

declare global {
  interface Window {
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (callback: (token: string) => void) => void;
        volume: number;
      }) => any;
    };
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

interface SpotifyPlayerProps {
  accessToken?: string;
}

export const SpotifyPlayer: React.FC<SpotifyPlayerProps> = ({ accessToken }) => {
  const { setupSpotifyPlayer, handleSyncCommand } = useAudio();
  const { user, ws } = useUserStore();
  const sdkLoaded = useRef(false);
  
  useEffect(() => {
    // Set up WebSocket message handler for sync commands
    if (ws) {
      const handleMessage = (event: MessageEvent) => {
        const { type, data } = JSON.parse(event.data);
        
        if (type.startsWith('spotify-sync-') || type.startsWith('youtube-sync-')) {
          handleSyncCommand({ type, ...data });
        }
      };
      
      ws.addEventListener('message', handleMessage);
      
      return () => {
        ws.removeEventListener('message', handleMessage);
      };
    }
  }, [ws, handleSyncCommand]);

  useEffect(() => {
    // Don't load if no access token
    const token = accessToken || user?.spotifyAccessToken;
    if (!token || sdkLoaded.current) return;

    // Load Spotify Web Playback SDK
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      console.log('Spotify Web Playback SDK Ready');
      sdkLoaded.current = true;

      const player = new window.Spotify.Player({
        name: 'Deciball Music Player',
        getOAuthToken: (callback: (token: string) => void) => {
          callback(token);
        },
        volume: 0.5
      });

      // Set up the player in our audio store
      setupSpotifyPlayer(player);
    };

    return () => {
      // Cleanup
      const scripts = document.querySelectorAll('script[src="https://sdk.scdn.co/spotify-player.js"]');
      scripts.forEach(script => script.remove());
    };
  }, [accessToken, user?.spotifyAccessToken, setupSpotifyPlayer]);

  return null; // This component doesn't render anything
};
