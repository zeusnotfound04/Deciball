
export interface User {
    id : string;
    email : string;
    name : string;
    isBookmarked : string ;
    username : string ;
    imageUrl  : string;
    role : "admin" | "listener" | string;
    token : string;
    imageDelUrl? : string;
    spotifyAccessToken?: string;
    spotifyRefreshToken?: string;
}



export interface listener{
    totalUsers : number;
    currentPage : number;
    spaceUsers : spaceUsers[];
    
}

export interface spaceUsers{
    id : string;
    userId : string;
}

export interface searchSongResult{
    success : boolean;
    data : data ;
}


export interface data {
    total : number;
    start : number;
    results : searchResults[];
}

export interface searchResults {
    id : string  ;
    url : string;
    name : string;
    artistes : {primary : artists[]};
    image : downloadUrl[];
    addedBy : string;
    source?: "youtube";
    downloadUrl : downloadUrl[];
    addedByUser ? : User;
    voteCount : number;
    topVoters? : User[];
    isVoted : boolean;
    order? : number;
    video?: boolean; 
}


export interface downloadUrl{
    quality : string;
    url : string;
}

export interface artists {
    id : number | string;
    name : string;
    role : string;
    image :[];
    type : "artist";
    url : string;
}



export interface CachedVideo {
    id : string;
    url : string;
    blob : Blob;
    timestamp : number;
}


export interface spotifyToken {
    access_token: string;
    expires_in: number;
    refresh_token: string;
  }
  
  export interface spotifyPlaylist {
    description: string;
    id: string;
    name: string;
    images: [
      {
        url: string;
      }
    ];
    owner: { display_name: string };
  }
  
  export interface spotifyTrack {
    name: string;
    artists: [
      {
        name: string;
      }
    ];
  }

  export interface queue {
    id: string;
    spaceId: string;
    songData: searchResults;
    playing: boolean;
  }
  



  export interface messages {
    user: User;
    message: string;
    time: string;
  }
  