import { getRecommendations } from "./getRecommandations";

export async function getMoodBasedTracks(mood: 'happy' | 'sad' | 'energetic' | 'chill' | 'focus', limit: number = 20) {
  const moodSettings = {
    happy: {
      target_valence: 0.8,
      target_energy: 0.7,
      target_danceability: 0.7,
      seed_genres: ['pop', 'dance', 'funk']
    },
    sad: {
      target_valence: 0.2,
      target_energy: 0.3,
      target_acousticness: 0.7,
      seed_genres: ['indie', 'alternative', 'folk']
    },
    energetic: {
      target_energy: 0.9,
      target_danceability: 0.8,
      target_tempo: 140,
      seed_genres: ['electronic', 'rock', 'pop']
    },
    chill: {
      target_valence: 0.5,
      target_energy: 0.3,
      target_acousticness: 0.6,
      seed_genres: ['ambient', 'chill', 'indie']
    },
    focus: {
      target_instrumentalness: 0.8,
      target_energy: 0.4,
      target_speechiness: 0.1,
      seed_genres: ['ambient', 'classical', 'electronic']
    }
  };
  
  try {
    const settings = moodSettings[mood];
    const recommendations = await getRecommendations({
      ...settings,
      limit
    });
    
    return {
      mood,
      tracks: recommendations.tracks,
      settings: settings
    };
  } catch (error) {
    console.error('Error getting mood-based tracks:', error);
    throw new Error('Failed to get mood-based tracks');
  }
}