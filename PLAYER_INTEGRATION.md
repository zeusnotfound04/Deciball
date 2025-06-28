# Integrated Music Player System

This music room application now features a fully integrated player system with **admin batch selection** functionality:

## 🎵 **New Admin Features**

### **Batch Song Selection**
- **Admin-only feature**: Admins can now select multiple songs from search results
- **Visual Selection**: Checkboxes appear for each track when admin has batch selection enabled
- **Select All/Deselect All**: Quick controls to manage entire search results
- **Queue Integration**: Selected songs are automatically added to the queue in order
- **Auto-play Logic**: 
  - If queue is empty and admin selects songs → First song automatically starts playing
  - If queue has songs → Selected songs are added to the end of the queue
  - Random song selection from batch → First selected song plays first

### **Enhanced Search Interface**
- **Larger Dialog**: Expanded to accommodate batch selection controls
- **Selection Counter**: Shows "X of Y selected" 
- **Batch Add Button**: "Add X to Queue" button appears when songs are selected
- **Visual Feedback**: Selected tracks are highlighted with blue background and checkmark badge

## Components Overview

### 1. **Player Component** (`/components/Player.tsx`)
- **Purpose**: Unified player interface that combines album cover, playback controls, and listener management
- **Features**:
  - Tabbed interface with PlayerCover, Listeners, and Settings
  - Keyboard shortcuts (Space for play/pause, Ctrl+1/2/3 for tabs, Ctrl+M to minimize)
  - Expandable/collapsible UI
  - Real-time status updates
  - Minimized mode for distraction-free listening

### 2. **PlayerCover Component** (`/app/components/PlayerCover.tsx`)
- **Purpose**: Displays album artwork and handles YouTube player integration
- **Features**:
  - Drag-and-drop support for album covers
  - YouTube video player (hidden) for audio playback
  - Image fallbacks and proper aspect ratios
  - Song metadata display

### 3. **Controller Component** (`/app/components/Controller.tsx`)
- **Purpose**: Advanced audio playback controls
- **Features**:
  - Play/pause, next/previous track controls
  - Progress bar with seek functionality
  - Volume control with mute toggle
  - Keyboard shortcuts (arrow keys, spacebar, etc.)
  - Visual progress indicators

### 4. **Listener Component** (`/components/Listener.tsx`)
- **Purpose**: Shows current listeners and their status in the room
- **Features**:
  - Real-time user list with online/offline status
  - Admin controls for user management
  - User roles display (Creator, Admin, Listener)
  - Connection status indicators
  - Room information display

### 5. **Enhanced Search Component** (`/app/components/Search.tsx`)
- **Purpose**: Spotify search with admin batch selection functionality
- **Features**:
  - Single track selection for regular users
  - **NEW: Batch selection mode for admins**
  - Visual checkboxes and selection indicators
  - Select all/deselect all functionality
  - Auto-conversion of Spotify tracks to queue format
  - Progress tracking for batch operations

## Admin Usage Guide

### **For Admins: Batch Adding Songs**

1. **Enable Search**: Click "Add Music" in the room
2. **Search Songs**: Type to search Spotify catalog  
3. **Select Multiple**: Click checkboxes next to desired tracks
4. **Batch Operations**: 
   - Use "Select All" to select entire page
   - Use "Deselect All" to clear selections
5. **Add to Queue**: Click "Add X to Queue" button
6. **Auto-play**: If queue was empty, first song starts automatically

### **For Regular Users: Single Selection**
- Search and click on any track to add it to queue
- No batch selection available (admin-only feature)

## Technical Implementation

### **Search Component Updates**
```typescript
// New props for batch functionality
interface SearchSongPopupProps {
  onSelect?: (track: Track) => void;
  onBatchSelect?: (tracks: Track[]) => void;  // NEW
  isAdmin?: boolean;                          // NEW  
  enableBatchSelection?: boolean;             // NEW
}

// Usage in MusicRoom for admins
<SearchSongPopup 
  onBatchSelect={handleBatchAddToQueue}
  isAdmin={isAdmin}
  enableBatchSelection={isAdmin}
  maxResults={12}
/>
```

### **Queue Auto-play Logic**
```typescript
// In MusicRoom component
const handleBatchAddToQueue = async (tracks: Track[]) => {
  const isQueueEmpty = !currentSong;
  
  // Add all tracks to queue
  for (const track of tracks) {
    await addTrackToQueue(track);
  }
  
  // Auto-play first track if queue was empty
  if (isQueueEmpty && tracks.length > 0) {
    sendMessage('play-next', { spaceId });
  }
};
```

## Usage in MusicRoom

The `MusicRoom` component now supports both single and batch selection:

```typescript
// Admin batch selection with auto-play
<SearchSongPopup 
  onSelect={(track) => {
    // Single selection for non-admins
    if (!isAdmin) {
      sendMessage('add-to-queue', {
        spaceId,
        url: track.external_urls.spotify
      });
    }
  }}
  onBatchSelect={isAdmin ? handleBatchAddToQueue : undefined}
  isAdmin={isAdmin}
  enableBatchSelection={isAdmin}
  maxResults={12}
/>

// Queue management with auto-play detection
<QueueManager 
  spaceId={spaceId} 
  isAdmin={isAdmin}
/>
```

## Keyboard Shortcuts

- **Space**: Play/Pause
- **Ctrl + →**: Next track
- **Ctrl + ←**: Previous track  
- **↑/↓**: Volume up/down
- **M**: Mute/Unmute
- **Ctrl + 1**: Switch to Player tab
- **Ctrl + 2**: Switch to Listeners tab
- **Ctrl + 3**: Switch to Settings tab
- **Ctrl + M**: Minimize/Maximize player
- **Ctrl + L**: Toggle listeners view

## WebSocket Integration

All components communicate via WebSocket events:

- `user-update`: Updates listener list and counts
- `queue-update`: Updates music queue
- `current-song-update`: Updates currently playing song
- `user-joined`/`user-left`: Real-time user management
- `add-to-queue`: Add songs from search

## Features

### Player Features
- ✅ Unified interface combining cover, controls, and listeners
- ✅ Tabbed navigation with keyboard shortcuts
- ✅ Minimize/maximize functionality
- ✅ Real-time status updates
- ✅ Volume and playback controls
- ✅ Responsive design

### **🆕 Admin Batch Selection**
- ✅ **Multi-select search results with checkboxes**
- ✅ **Select all/deselect all functionality**
- ✅ **Visual selection feedback and counters**
- ✅ **Batch add to queue with one click**
- ✅ **Auto-play first song when queue is empty**
- ✅ **Smart queue management for multiple selections**

### Listener Management
- ✅ Real-time user list updates
- ✅ Online/offline status indicators
- ✅ User role badges (Creator, Admin, Listener)
- ✅ Admin controls for user management
- ✅ Connection status display

### Search & Queue
- ✅ **Enhanced Spotify search with batch selection**
- ✅ **Admin-only multi-select functionality**
- ✅ **Single-click selection for regular users**
- ✅ Queue management with voting system
- ✅ Real-time queue updates
- ✅ **Auto-play logic for empty queues**

### Audio Playback
- ✅ YouTube integration for audio playback
- ✅ Progress tracking and seeking
- ✅ Volume controls with mute
- ✅ Keyboard shortcuts for all controls
- ✅ Auto-play next track functionality

This integrated system provides a comprehensive music listening experience with real-time collaboration features, advanced playback controls, and a modern, responsive UI.
