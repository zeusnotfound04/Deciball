
import SpotifyWebApi from 'spotify-web-api-node';

export const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});



let accessToken: string | null = null;
let tokenExpiryTime: number = 0;

/**
 * Get or refresh Spotify access token using client credentials flow
 */
 async function getAccessToken(): Promise<string> {
  const now = Date.now();
  
  
  // Return cached token if it's still valid (with 5 minute buffer)
  if (accessToken && now < tokenExpiryTime - 300000) {
    return accessToken;
  }

  try {
    const data = await spotifyApi.clientCredentialsGrant();
    accessToken = data.body.access_token;
    tokenExpiryTime = now + (data.body.expires_in * 1000);
    
    spotifyApi.setAccessToken(accessToken);
    return accessToken;
  } catch (error) {
    console.error('Error getting Spotify access token:', error);
    throw new Error('Failed to authenticate with Spotify');
  }
}


export async function getSpotifyApi(): Promise<SpotifyWebApi> {
  await getAccessToken();
  return spotifyApi;
}