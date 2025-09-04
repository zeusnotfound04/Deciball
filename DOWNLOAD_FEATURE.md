# YouTube Download Feature

## Overview
Added download functionality to the music player that allows users to download the currently playing YouTube song as an audio file.

## Features
- ✅ Download current song from YouTube
- ✅ Automatic file naming with title and artist
- ✅ Loading states and error handling
- ✅ Keyboard shortcut (Ctrl+D)
- ✅ Tooltip with shortcut info
- ✅ Only shows for YouTube sources

## How it Works

### Client Side (Player.tsx)
- Download button with loading states
- Extracts YouTube URL/ID from current song
- Calls API endpoint for download preparation
- Creates download link with proper filename

### Server Side (API Route)
- `/api/download` endpoint using `ytdl-core`
- Validates YouTube URLs
- Extracts best audio format
- Returns download URL and metadata

## Usage

### UI
1. Play a YouTube song
2. Click the "Download" button below the song info
3. File will start downloading automatically

### Keyboard Shortcut
- Press `Ctrl+D` to download the current song

## Technical Details

### Dependencies
- `ytdl-core`: YouTube video/audio extraction
- `@types/ytdl-core`: TypeScript types

### File Format
- Downloads highest quality audio available
- Format depends on YouTube's available streams (usually WebM/M4A)
- Filename: `{Title} - {Artist}.{extension}`

### Error Handling
- Validates YouTube URLs
- Handles network errors
- Shows user-friendly error messages
- Prevents multiple simultaneous downloads

## Limitations
- Only works with YouTube sources
- Download quality depends on YouTube's available streams
- Requires internet connection for metadata fetching
- Browser download behavior varies by browser settings
