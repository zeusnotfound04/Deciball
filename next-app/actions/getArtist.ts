




type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

async function fetchWebApi<TResponse>(
  endpoint: string,
  method: HttpMethod,
  body?: Record<string, any> // or a more specific type
): Promise<TResponse> {
  console.log("API ENDPOINT" , `https://api.spotify.com/${endpoint}`)
  console.log(process.env.SPOTIFY_TOKEN)
  const res = await fetch(`https://api.spotify.com/${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.SPOTIFY_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`Spotify API error: ${res.statusText}`);
  }

  return res.json() as Promise<TResponse>;
}

export default fetchWebApi;


//   async function getTopTracks(){
//     // Endpoint reference : https://developer.spotify.com/documentation/web-api/reference/get-users-top-artists-and-tracks
//     return (await fetchWebApi(
//       'v1/me/top/tracks?time_range=long_term&limit=5', 'GET'
//     )).items;
//   }
  
//   const topTracks = await getTopTracks();
//   console.log(
//     topTracks?.map(
//       ({name, artists}) =>
//         `${name} by ${artists.map(artist => artist.name).join(', ')}`
//     )
//   );