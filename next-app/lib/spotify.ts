
import SpotifyWebApi from 'spotify-web-api-node';

export const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

let accessToken: string | null = null;
let tokenExpiryTime: number = 0;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  
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

export async function searchTracks(query: string, limit: number = 20, offset: number = 0) {
  try {
    const api = await getSpotifyApi();
    const result = await api.searchTracks(query, { limit, offset });
    return result.body;
  } catch (error) {
    console.error('Error searching tracks:', error);
    throw new Error('Failed to search tracks');
  }
}

export async function searchPlaylists(query: string, limit: number = 20, offset: number = 0) {
  try {
    const api = await getSpotifyApi();
    const result = await api.searchPlaylists(query, { limit, offset });
    return result.body;
  } catch (error) {
    console.error('Error searching playlists:', error);
    throw new Error('Failed to search playlists');
  }
}