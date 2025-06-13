import { getSpotifyApi } from "@/lib/spotify";

export async function getAudioAnalysis(trackId: string) {
  const api = await getSpotifyApi();
  
  try {
    const result = await api.getAudioAnalysisForTrack(trackId);
    return result.body;
  } catch (error) {
    console.error('Error getting audio analysis:', error);
    throw new Error('Failed to get audio analysis');
  }
}