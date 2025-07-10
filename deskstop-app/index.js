
const path = require('path');
const { startDiscordRPC, setActivity, cleanupDiscordRPC, isConnected } = require('./discord');

let mainWindow = null;
const { app, BrowserWindow, ipcMain, Menu } = require('electron');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, './preload.js'),
    },
  });

  mainWindow.loadURL('http://localhost:3000'); 
  Menu.setApplicationMenu(null);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  startDiscordRPC(); 

  // Set up IPC listener for song updates
  ipcMain.on('update-discord-activity', (event, songData) => {
    console.log('Main process received song data:', songData);
    
    if (!songData) {
      console.error('Song data is null or undefined');
      return;
    }
    
    if (!songData.title || !songData.artist) {
      console.error('Missing required song data fields:', { 
        hasTitle: !!songData.title, 
        hasArtist: !!songData.artist,
        songData
      });
      return;
    }
    
    const options = {
      albumArt: songData.image,
      duration: songData.duration,
      startTime: songData.startTime,
      currentTime: songData.currentTime, // Current playback position
      isPaused: !songData.isPlaying, // Pass whether the song is paused
      spaceId: songData.spaceId,
      spaceName: songData.spaceName
    };
    
    console.log(`Setting Discord activity with options (connected: ${isConnected()}):`, options);
    setActivity(songData.title, songData.artist, options);
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Clean up resources before quitting
app.on('will-quit', () => {
  console.log('App is quitting, cleaning up Discord RPC...');
  cleanupDiscordRPC();
});

// Handle app activation
app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow();
});
