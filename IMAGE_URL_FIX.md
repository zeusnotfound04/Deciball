# Image URL Error Fix

## Issue
The PlayerCover component was throwing errors:
1. `TypeError: Failed to construct 'URL': Invalid URL`
2. `Error: Failed to parse src ""https://..."" on next/image`

The URLs had extra quotes around them, making them invalid for the Next.js Image component.

## Root Cause
When songs are converted from queue format to audio store format in QueueManager, the image URLs sometimes come with extra quotes around them, likely from JSON serialization/deserialization.

## Fixes Applied

### 1. QueueManager.tsx
- **Added URL cleaning utility**: `cleanUrl()` function that removes extra quotes from URLs
- **Applied to all URLs**: Used `cleanUrl()` for all URL fields (image, download URLs)
- **Prevents malformed URLs**: Ensures URLs are properly formatted before passing to audio store

### 2. PlayerCover.tsx
- **Added image URL validation**: `cleanImageUrl()` function that both cleans and validates URLs
- **Graceful fallback**: Falls back to default image if URL is invalid
- **Applied to both image sources**: Used for both regular and video song images

### Key Functions Added

#### QueueManager cleanUrl():
```typescript
const cleanUrl = (url: string): string => {
  if (!url) return '';
  
  let cleanedUrl = url.trim();
  if (cleanedUrl.startsWith('"') && cleanedUrl.endsWith('"')) {
    cleanedUrl = cleanedUrl.slice(1, -1);
  }
  if (cleanedUrl.startsWith("'") && cleanedUrl.endsWith("'")) {
    cleanedUrl = cleanedUrl.slice(1, -1);
  }
  
  return cleanedUrl;
};
```

#### PlayerCover cleanImageUrl():
```typescript
const cleanImageUrl = (url: string): string => {
  if (!url) return fallbackUrl;
  
  let cleanedUrl = url.trim();
  // Remove quotes
  if (cleanedUrl.startsWith('"') && cleanedUrl.endsWith('"')) {
    cleanedUrl = cleanedUrl.slice(1, -1);
  }
  
  // Validate URL format
  try {
    new URL(cleanedUrl);
    return cleanedUrl;
  } catch (error) {
    return fallbackUrl;
  }
};
```

## Result
- ✅ No more URL construction errors
- ✅ No more Next.js Image component errors
- ✅ Graceful fallback to default images for invalid URLs
- ✅ Songs can now play without image-related crashes
- ✅ Robust URL handling throughout the application
