interface ElectronAPI {
  updateDiscordActivity: (songData: {
    title: string;
    artist: string;
    image?: string;
    duration?: number;
    startTime?: number;
    spaceId?: string;
    spaceName?: string;
  }) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
