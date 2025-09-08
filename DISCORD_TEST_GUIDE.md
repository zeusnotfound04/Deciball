# Discord Bot Song Change Test

To test that the Discord bot is properly receiving song change notifications:

## Test Scenarios

### 1. Manual Song Change (via playSong)
1. Connect Discord bot to a space using `/join-space [SPACE_ID]`
2. Add multiple songs to the queue in the web app
3. Manually click on a different song in the queue to play it
4. **Expected Result**: Discord bot should immediately switch to the new song

### 2. Admin Play Next (via adminPlayNext)  
1. Connect Discord bot to a space using `/join-space [SPACE_ID]`
2. Add multiple songs to the queue in the web app
3. Use the "Play Next" or skip functionality in the web app
4. **Expected Result**: Discord bot should immediately switch to the next song

### 3. Queue Auto-Play (via playNextFromRedisQueue)
1. Connect Discord bot to a space using `/join-space [SPACE_ID]`
2. Add songs to the queue and let them play automatically
3. Wait for current song to end
4. **Expected Result**: Discord bot should automatically play the next song

## Discord Bot Notifications Added

✅ **playSong method** - Manual song selection
✅ **adminPlayNext method** - Admin skip/next functionality  
✅ **playNextFromRedisQueue method** - Auto-play next song (already existed)

## WebSocket Messages

The Discord bot now receives these messages for all song changes:

```json
{
  "type": "space-track-changed",
  "data": {
    "spaceId": "12345",
    "track": {
      "id": "song-uuid",
      "title": "Song Title",
      "artist": "Artist Name", 
      "url": "https://youtube.com/watch?v=...",
      "duration": 180000,
      "extractedId": "youtube-id",
      "thumbnail": "https://img.youtube.com/vi/.../maxresdefault.jpg"
    }
  }
}
```

## Debugging

If song changes still don't work:

1. Check WebSocket server logs for Discord bot connection
2. Verify `broadcastToDiscordBots` is being called
3. Check Discord bot logs for receiving track change messages
4. Ensure Discord bot's `handleTrackChanged` method is working

## Files Modified

- `ws/src/managers/streamManager.ts`:
  - Added Discord notifications to `playSong` method
  - Added Discord notifications to `adminPlayNext` method
  - Existing Discord notifications in `playNextFromRedisQueue` method
