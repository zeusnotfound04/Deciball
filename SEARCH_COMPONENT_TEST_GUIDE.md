# Search Component Song Selection Test Guide

## What We Fixed

### 1. **Backend YouTube URL Validation**
- Updated `YoutubeHandler` to accept both full YouTube URLs and 11-character video IDs
- This allows the Spotify → YouTube conversion to work properly

### 2. **Search Component Logic**
- Fixed single song selection to send proper YouTube URLs to backend
- Fixed batch selection to process multiple tracks properly
- Added proper spaceId validation
- Ensured YouTube URLs are formatted correctly for backend validation

### 3. **Removed Conflicting Logic**
- Removed duplicate queue addition logic from MusicRoom component
- Let Search component handle all queue operations internally

## Testing Steps

### Test 1: Single Song Selection
1. Open the search component (⌘K or click Search Songs)
2. Search for a song (e.g., "Sapphire Ed Sheeran")
3. Click on a song result
4. **Expected behavior:**
   - Console should show: `🎵 Processing Spotify track: [Song Name]`
   - Console should show: `🎵 Received YouTube video ID: [11-character ID]`
   - Console should show: `🔗 Final URL for backend: https://www.youtube.com/watch?v=[VIDEO_ID]`
   - Console should show: `✅ Song added to queue successfully`
   - Song should appear in the queue
   - Search dialog should close

### Test 2: Batch Selection (Admin Only)
1. Make sure you're an admin user
2. Open search component
3. Search for songs
4. **Expected behavior:**
   - Console should show: `🎵 SearchSongPopup rendered with props: {isAdmin: true, enableBatchSelection: true, ...}`
   - You should see checkboxes next to each song
   - Clicking songs should toggle checkboxes (not add to queue immediately)
   - "Add X to Queue" button should appear when songs are selected
   - Clicking the button should process all selected songs

### Test 3: Current Song Display and Playback
1. After adding songs to queue
2. Have admin click "Play Next" or start playback
3. **Expected behavior:**
   - PlayerCover should show: `[YouTube] Current song is available, setting up playback`
   - PlayerCover should show: `Video ID [11-character-id]`
   - YouTube player should load and play the video

## Debug Information

### Console Messages to Look For:

**Search Component:**
```
🎵 SearchSongPopup rendered with props: {isAdmin: [true/false], enableBatchSelection: [true/false], ...}
🎵 Processing Spotify track: [Song Name]
🎵 Received YouTube video ID: [Video ID]
🔗 Final URL for backend: https://www.youtube.com/watch?v=[VIDEO_ID]
✅ Song added to queue successfully
```

**Backend (check terminal):**
```
🎵 adminAddStreamHandler - spaceId: [space-id]
✅ Connected to Upstash Redis
```

**PlayerCover:**
```
[YouTube] Current song is available, setting up playback
Video ID [video-id]
[YouTube] Loading video with ID: [video-id]
```

## Common Issues and Solutions

### Issue: "Invalid music URL. Supported: YouTube, Spotify"
- **Cause:** Backend is rejecting the URL format
- **Solution:** Make sure backend YouTube handler is updated to accept video IDs

### Issue: Songs appear selected but batch add doesn't work
- **Cause:** `enableBatchSelection` or `isAdmin` props not set correctly
- **Check:** Console should show `enableBatchSelection: true` when admin

### Issue: Songs add to queue but don't play
- **Cause:** PlayerCover not receiving correct video ID format
- **Check:** PlayerCover console should show valid 11-character video ID

### Issue: SpaceId empty error
- **Cause:** URL doesn't contain `?space=` parameter
- **Solution:** Make sure you're accessing the room with proper URL format

## Flow Summary

1. **User searches** → Spotify API returns tracks
2. **User selects song** → `/api/spotify/getTrack` converts to YouTube video ID
3. **Frontend sends** → `https://www.youtube.com/watch?v=[VIDEO_ID]` to backend
4. **Backend validates** → YouTube handler accepts URL and extracts video ID
5. **Backend stores** → Song in queue with YouTube video ID
6. **PlayNext triggered** → Current song broadcast to all users
7. **PlayerCover receives** → Video ID and loads YouTube player

The key is that you search Spotify but play YouTube - the conversion happens in the `/api/spotify/getTrack` endpoint.
