

type Props = {
    inputLinks : string;
    creatorId : string;
    userId : string;
    setLoading : (value : boolean) => void;
    setInputLink : (value : string) => void;
    loading : boolean;
    enqueueToast : (type : "error" | "success" , message : string) => void;
    spaceId : string,
    isSpectator : boolean
}



export default function AddSongForm({
    inputLinks,
    enqueueToast,
    setInputLink,
    loading,
    setLoading,
    userId,
    spaceId,
    isSpectator
} : Props){

    



}