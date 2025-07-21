declare module 'youtube-search-api' {
  interface VideoItem {
    id: {
      videoId: string;
    };
    snippet: {
      title: string;
      description: string;
      thumbnails: {
        default: { url: string };
        medium: { url: string };
        high: { url: string };
      };
    };
  }

  interface SearchResult {
    items: VideoItem[];
  }

  interface VideoDetails {
    title: string;
    description: string;
    thumbnail: {
      thumbnails: Array<{
        url: string;
        width: number;
        height: number;
      }>;
    };
    duration: {
      secondsText: string;
      text: string;
    };
  }

  export default {
    GetListByKeyword: (query: string, playlist?: boolean, limit?: number, options?: any) => Promise<SearchResult>;
    GetVideoDetails: (videoId: string) => Promise<VideoDetails>;
  };
}