import YTMusic from "ytmusic-api";

// ytmusic-api needs an async initialize() before any query. Cache the promise
// (not just the instance) so concurrent requests share one initialization
// instead of racing several.
let ready: Promise<YTMusic> | null = null;

export function getYTMusic(): Promise<YTMusic> {
  if (!ready) {
    const client = new YTMusic();
    ready = client.initialize().then(() => client).catch((error) => {
      ready = null; // let the next request retry rather than caching a failure
      throw error;
    });
  }
  return ready;
}

export default getYTMusic;
