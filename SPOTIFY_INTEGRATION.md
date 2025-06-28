# Spotify & WebSocket Integration for Synchronized Music Playback

This implementation provides synchronized music playback across multiple users in a WebSocket room, supporting both Spotify and YouTube sources with queue management and voting features.

## Features

### 🎵 Multi-Source Music Support
- **Spotify Integration**: Full Web Playback SDK integration with synchronized playback
- **YouTube Support**: Existing YouTube player integration  
- **Unified Search**: Search across both Spotify and YouTube sources

### 🔄 Real-time Synchronization
- **Synchronized Playback**: All users hear the same song at the same time
- **State Broadcasting**: Play/pause/seek events are synchronized across all clients
- **Timestamp-based Sync**: Compensates for network latency

### 🎯 Queue Management
- **Admin Controls**: Room admins can play next, remove songs, empty queue
- **User Voting**: Non-admin users can upvote/downvote songs in queue
- **Real-time Updates**: Queue changes are broadcast to all users instantly

### 👥 Multi-user Support
- **Room-based Architecture**: Users join specific music rooms
- **Role-based Permissions**: Admin vs Listener roles
- **Live User Count**: Track connected users per room

## Architecture

### Client-Side Components

#### `SpotifyPlayer.tsx`
Manages Spotify Web Playbook SDK integration:
- Loads and initializes Spotify SDK
- Handles authentication with access tokens
- Sets up player event listeners
- Manages WebSocket sync message handling

#### `QueueManager.tsx`
Displays and manages the music queue:
- Shows current queue with vote counts
- Provides voting buttons for users
- Admin controls for queue management
- Real-time queue updates

#### `MusicSearch.tsx`
Unified music search interface:
- Search both Spotify and YouTube
- Source filtering (All/Spotify/YouTube)
- Add songs to queue with one click
- Visual source indicators

#### `MusicRoom.tsx`
Main room component combining all features:
- Room status and user management
- Current playing song display
- Volume controls and playback buttons
- Responsive layout for search and queue

### Server-Side Implementation

#### `streamManager.ts` Updates
Enhanced the existing RoomManager with:

```typescript
// Spotify synchronization methods
async handleSpotifyPlay(spaceId: string, userId: string, data: any)
async handleSpotifyPause(spaceId: string, userId: string, data: any) 
async handleSpotifyStateChange(spaceId: string, userId: string, data: any)

// Queue management with voting
async getQueueWithVotes(spaceId: string)
async broadcastQueueUpdate(spaceId: string)
```

#### `app.ts` Updates
Added new WebSocket message types:
- `spotify-play`, `spotify-pause`, `spotify-state-change`
- `youtube-state-change`
- `get-queue` for queue requests

### Data Flow

1. **User Joins Room**:
   ```
   Client -> WebSocket: join-room
   Server -> Prisma: Create/join space
   Server -> All Clients: user-joined broadcast
   ```

2. **Song Addition**:
   ```
   Client -> WebSocket: add-to-queue
   Server -> MusicSourceManager: Validate & fetch details
   Server -> Prisma: Create stream record
   Server -> All Clients: new-stream + queue-update
   ```

3. **Voting**:
   ```
   Client -> WebSocket: cast-vote
   Server -> Prisma: Create/delete upvote
   Server -> All Clients: vote-updated + queue-update
   ```

4. **Playback Sync**:
   ```
   Admin Client -> Spotify: Play/pause
   Spotify SDK -> Client: State change event
   Client -> WebSocket: spotify-state-change
   Server -> Other Clients: spotify-sync-play/pause
   Other Clients -> Spotify API: Synchronized playback
   ```

## Setup Instructions

### 1. Environment Variables

Add to your `.env` files:

```env
# Spotify API credentials
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# WebSocket server URL
NEXT_PUBLIC_WSS_URL=ws://localhost:8080

# Redis configuration (for WebSocket server)
REDIS_URL=your_redis_url
REDIS_HOST=your_redis_host
REDIS_PORT=6379
REDIS_USERNAME=your_redis_username
REDIS_PASSWORD=your_redis_password
```

### 2. Database Schema Updates

The Prisma schema already supports both YouTube and Spotify:

```prisma
model Stream {
  type          StreamType // Youtube | Spotify
  url           String
  extractedId   String     // YouTube ID or Spotify track ID
  title         String
  artist        String?
  album         String?
  duration      Int?
  smallImg      String
  bigImg        String
  privousURL    String?    // Spotify preview URL
  // ... other fields
}

enum StreamType {
  Spotify
  Youtube
}
```

### 3. Authentication Setup

Ensure your NextAuth configuration includes Spotify provider and token handling:

```typescript
// In your NextAuth configuration
providers: [
  SpotifyProvider({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    authorization: {
      params: {
        scope: "streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state"
      }
    }
  })
]

callbacks: {
  async jwt({ token, account }) {
    if (account?.provider === "spotify") {
      token.spotifyAccessToken = account.access_token;
      token.spotifyRefreshToken = account.refresh_token;
    }
    return token;
  },
  async session({ session, token }) {
    session.user.spotifyAccessToken = token.spotifyAccessToken;
    session.user.spotifyRefreshToken = token.spotifyRefreshToken;
    return session;
  }
}
```

### 4. Usage Example

```tsx
import { MusicRoom } from '@/components/MusicRoom';
import { SocketContextProvider } from '@/context/socket-context';

export default function SpacePage() {
  const spaceId = "your-space-id";
  
  return (
    <SocketContextProvider>
      <MusicRoom spaceId={spaceId} />
    </SocketContextProvider>
  );
}
```

## API Endpoints

### `/api/search/tracks`
Multi-source music search:
```
GET /api/search/tracks?q=search_term&source=spotify&limit=20
```

Response:
```json
{
  "success": true,
  "data": {
    "total": 50,
    "start": 0,
    "results": [
      {
        "id": "track_id",
        "name": "Song Title",
        "url": "spotify_or_youtube_url",
        "artistes": { "primary": [{"name": "Artist"}] },
        "image": [{"url": "image_url"}],
        "source": "spotify",
        "downloadUrl": [{"url": "spotify:track:id"}]
      }
    ]
  }
}
```

## WebSocket Message Types

### Client to Server:
- `join-room`: Join a music room
- `add-to-queue`: Add song to queue
- `cast-vote`: Vote on queue items
- `play-next`: Admin play next song
- `remove-song`: Admin remove song
- `empty-queue`: Admin clear queue
- `spotify-play/pause/state-change`: Playback sync
- `get-queue`: Request current queue

### Server to Client:
- `room-info`: Room details and user role
- `queue-update`: Updated queue with votes
- `new-stream`: New song added
- `vote-updated`: Vote count changed
- `spotify-sync-*`: Playback synchronization
- `user-joined/left`: User presence updates
- `error`: Error messages

## Key Features Explained

### Synchronization Algorithm
The system uses timestamp-based synchronization:
1. Admin's playback state changes trigger events
2. Events include current position and timestamp
3. Other clients calculate lag and adjust position
4. Spotify Web API handles the actual seeking/playing

### Queue Voting System
- Users can upvote songs (one vote per user per song)
- Queue is sorted by vote count (descending) then by creation time
- Real-time updates when votes change
- Admins can override queue order with manual controls

### Multi-Source Support
- Unified interface for YouTube and Spotify
- Source detection based on URL patterns
- Appropriate player selection (YouTube iframe vs Spotify SDK)
- Consistent metadata handling across sources

This integration provides a complete synchronized music listening experience with modern features like real-time voting, multi-source support, and responsive design.
