import { getAudioFeatures } from "./getAudioFeatures";
import { getRecommendations } from "./getRecommandations";
import { getTrack } from "./getTrack";

export async function getSimilarTracks(trackId: string, limit: number = 20) {
  try {
    const audioFeatures = await getAudioFeatures(trackId);
    const track = await getTrack(trackId);
    
    const recommendations = await getRecommendations({
      seed_tracks: [trackId],
      limit,
      target_acousticness: audioFeatures.acousticness,
      target_danceability: audioFeatures.danceability,
      target_energy: audioFeatures.energy,
      target_valence: audioFeatures.valence,
      target_tempo: audioFeatures.tempo
    });
    
    return {
      originalTrack: track,
      audioFeatures,
      similarTracks: recommendations.tracks
    };
  } catch (error) {
    console.error('Error getting similar tracks:', error);
    throw new Error('Failed to get similar tracks');
  }
}