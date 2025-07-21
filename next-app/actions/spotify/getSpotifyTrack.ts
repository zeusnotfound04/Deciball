import ytmusic from "@/lib/YTmusic";
interface Artist {
    external_urls : string[];
    href : string;
    id : string;
    name : string;
    type : string;
    uri : string
}
export const getSpotifyTrack = async (
    song: any
): Promise<any> => {
    try {
        const artists = song.artists.map((artist: Artist) => artist.name).join(', ');

        const name = song.name;
        console.log("Artist Name::", `${name} by ${artists}`);
       
        await ytmusic.initialize({})
        const ytSongs = await ytmusic.searchSongs(`${name} ${artists}`);
       
        const tracks = ytSongs?.slice(0, 3).map((s: any) => ({
            id: s.videoId,
            name: s.name,
            artists: {
                primary: [
                    {
                        name: s.artist.name,
                    },
                ],
            },
            video: !s.thumbnails[0].url.includes("https://lh3.googleusercontent.com")
                ? true
                : false,
            image: [
                {
                    quality: "500x500",
                    url: `https://wsrv.nl/?url=${s.thumbnails[s.thumbnails.length - 1].url
                        .replace(/w\d+-h\d+/, "w500-h500")
                        .replace("w120-h120", "w500-h500")}`,
                },
            ],
            source: "youtube",
            downloadUrl: [
                {
                    quality: "320kbps",
                    url: `${s.videoId}`,
                },
            ],
        })) || [];
        
        return tracks;
    } catch (error) {
        console.error("Error in getSpotifyTrack:", error);
        throw error;
    }
};