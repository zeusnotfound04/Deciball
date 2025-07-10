const { contextBridge, ipcRenderer } = require('electron');

// Add debugging info
console.log('Preload script loaded');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  updateDiscordActivity: (songData) => {
    console.log('Preload received song data:', songData);
    ipcRenderer.send('update-discord-activity', songData);
  }
});
