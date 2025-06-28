# Batch Song Selection and Queue Management Implementation

## Music Source Architecture

The application uses a **hybrid Spotify/YouTube approach**:

1. **Search & Discovery**: Uses Spotify API for rich metadata (song titles, artists, album art, etc.)
2. **Playback**: Extracts corresponding YouTube videos for actual audio playback
3. **Display**: Shows as "Spotify → YouTube" to indicate the source chain

### Why This Approach?
- **Rich Metadata**: Spotify provides excellent song information and album artwork
- **Playable Content**: YouTube provides accessible audio streams
- **User Experience**: Users get the best of both platforms

### Data Flow
```
Spotify Search → Song Metadata → YouTube Video Extraction → Playable URL
```

The track data includes both Spotify and YouTube information:
```typescript
{
  // Spotify metadata
  spotifyId: "4iV5W9uYEdYUVa79Axb7Rh",
  spotifyUrl: "https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh",
  
  // YouTube playback
  youtubeId: "BvqqY8_vPXE", 
  youtubeUrl: "https://www.youtube.com/watch?v=BvqqY8_vPXE",
  
  // Display
  type: "Spotify" // Shows as "Spotify → YouTube" in UI
}
```

## Key Features

### 1. Admin Batch Selection
- **Component**: `Search.tsx`
- **Functionality**: Admin users can select multiple songs from search results
- **Features**:
  - Checkbox selection for each song
  - Select All/Deselect All functionality
  - Visual feedback for selected songs
  - Batch add button with count display

### 2. Enhanced Queue Management
- **Component**: `QueueManager.tsx`
- **Functionality**: Displays current queue and manages playback
- **Features**:
  - Real-time queue updates
  - Auto-play logic for first song when queue is empty
  - Admin controls (Play Next, Remove Song, Empty Queue)
  - Current song display

### 3. WebSocket Integration
- **Frontend**: `socket-context.tsx`, `MusicRoom.tsx`
- **Backend**: `ws/src/app.ts`, `streamManager.ts`
- **Functionality**: Real-time communication for queue updates
- **Features**:
  - Batch song addition via WebSocket
  - Queue state synchronization
  - Auto-play trigger for empty queues

### 4. Debug Tools
- **Component**: `DebugBatchQueue.tsx`
- **Functionality**: Testing and debugging WebSocket connectivity and batch operations
- **Features**:
  - WebSocket connection testing
  - Batch addition simulation
  - Queue state verification
  - Test result summary

## Implementation Details

### Frontend Components

#### Search.tsx
```typescript
// Key props for batch functionality
enableBatchSelection?: boolean;
isAdmin?: boolean;
onBatchSelect?: (tracks: Track[]) => void;

// Batch selection state
const [selectedTracks, setSelectedTracks] = useState<Track[]>([]);

// Batch add handler
const handleAddSelectedToQueue = async () => {
  if (onBatchSelect) {
    onBatchSelect(selectedTracks);
  }
}
```

#### QueueManager.tsx
```typescript
// Auto-play logic (handled by backend)
case 'song-added':
  // Add to queue, auto-play is managed by backend
  setQueue(prev => [...prev, data.song]);
  break;

case 'current-song-update':
  setCurrentPlaying(data.song || null);
  break;
```

#### MusicRoom.tsx
```typescript
// Batch add handler
const handleBatchAddToQueue = async (tracks: any[]) => {
  const isQueueEmpty = !currentSong;
  
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    // Process each track and add to queue
    sendMessage('add-to-queue', {
      spaceId,
      url: track.external_urls.spotify,
      trackData: processedTrackData,
      autoPlay: isQueueEmpty && i === 0 // Auto-play first song if queue empty
    });
  }
};
```

### Backend Implementation

#### WebSocket Message Handling (app.ts)
```typescript
case "add-to-queue":
  await RoomManager.getInstance().addToQueue(
    data.spaceId,
    data.userId,
    data.url,
    data.trackData, // Additional track metadata
    data.autoPlay   // Auto-play flag
  );
  break;
```

#### Queue Management (streamManager.ts)
```typescript
async addToQueue(spaceId: string, currentUserId: string, url: string, trackData?: any, autoPlay?: boolean) {
  // Add song to database queue
  await this.adminStreamHandler(spaceId, currentUserId, url, previousQueueLength, trackData, autoPlay);
  
  // Auto-play if first song and auto-play requested
  if (autoPlay && isFirstSong) {
    setTimeout(async () => {
      await this.adminPlayNext(spaceId, currentUserId);
    }, 1000);
  }
}

async adminPlayNext(spaceId: string, userId: string) {
  // Get next song from queue (by votes, then creation time)
  const nextStream = await this.prisma.stream.findFirst({
    where: { spaceId, played: false },
    orderBy: [
      { upvotes: { _count: "desc" } },
      { createAt: "asc" }
    ]
  });
  
  // Set as current playing song and broadcast
  // Update current stream and mark as played
  // Broadcast current-song-update to all users
}
```

## Queue Flow

1. **Song Addition**:
   - User/Admin adds song(s) via Search component
   - Frontend sends `add-to-queue` message with track data and auto-play flag
   - Backend processes and adds to database queue
   - Backend broadcasts `song-added` event to all users
   - Backend triggers auto-play if queue was empty

2. **Auto-Play Logic**:
   - When first song is added to empty queue, `autoPlay: true` is set
   - Backend automatically calls `adminPlayNext()` after adding song
   - `adminPlayNext()` finds highest-voted song (or oldest) and sets as current
   - Backend broadcasts `current-song-update` with song details

3. **Queue Updates**:
   - Backend broadcasts `queue-update` with current queue state
   - Frontend QueueManager updates display
   - Current playing song is shown separately from queue

## Debug Features

### DebugBatchQueue Component
- Tests WebSocket connectivity
- Simulates batch song addition
- Verifies queue state updates
- Provides test results summary

### Debug Logs
- Frontend: WebSocket message sending/receiving
- Backend: Queue operations, song additions, auto-play triggers
- Debug messages prefixed with emojis for easy identification

## Usage

### For Admin Users
1. Open Search component
2. Search for songs
3. Select multiple songs using checkboxes
4. Click "Add X to Queue" button
5. Songs are added to queue, first song auto-plays if queue was empty

### For Regular Users
1. Open Search component
2. Search and click individual songs
3. Songs are added to queue without batch selection

## Configuration

### Environment Variables
- `REDIS_URL`: Redis connection for WebSocket state management
- `DATABASE_URL`: PostgreSQL database for queue persistence

### Props Configuration
```typescript
// Search component for admin batch selection
<SearchSongPopup 
  onBatchSelect={isAdmin ? handleBatchAddToQueue : undefined}
  isAdmin={isAdmin}
  enableBatchSelection={isAdmin}
/>

// QueueManager for queue display and controls
<QueueManager 
  spaceId={spaceId} 
  isAdmin={isAdmin}
/>
```

## Testing

Use the DebugBatchQueue component to:
1. Test WebSocket connectivity
2. Simulate batch song additions
3. Verify queue updates
4. Check auto-play functionality

The debug component provides detailed logs and test results to verify the implementation is working correctly.
