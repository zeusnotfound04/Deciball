
import { spotifyApi } from "@/lib/spotify";
import SpotifyWebApi from "spotify-web-api-node";

let accessToken: string | null = null;
let tokenExpiryTime: number = 0;

export async function getSpotifyApi(): Promise<SpotifyWebApi> {
  const now = Date.now();
  
  if (accessToken && now < tokenExpiryTime - 300000) {
    return spotifyApi;
  }

  try {
    const data = await spotifyApi.clientCredentialsGrant();
    accessToken = data.body.access_token;
    tokenExpiryTime = now + (data.body.expires_in * 1000);
    
    spotifyApi.setAccessToken(accessToken);
    return spotifyApi;
  } catch (error) {
    console.error('Error getting Spotify access token:', error);
    throw new Error('Failed to authenticate with Spotify');
  }
}