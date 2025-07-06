"use client"
import { useSocket } from "@/context/socket-context";
import axios from "axios";
import { useEffect, useState } from "react";

import ErrorScreen from "@/app/components/ErrorScreen";
import LoadingScreen from "@/app/components/LoadingScreen";
import { useRouter  , useParams } from "next/navigation";
import StreamView from "@/app/components/StreamView";


export default function Page(){
    const params = useParams();
    const spaceId   = params.spaceId as string;

    const { socket, user, setUser, connectionError, loading } = useSocket();
    const [creatorId, setCreatorId] = useState("");
    const [spaceName, setSpaceName] = useState("");
    const [isLoading, setLoading] = useState(true);
    const router = useRouter();

    // Log space ID for debugging
    useEffect(() => {
        console.log("Space ID:", spaceId);
    }, [spaceId]);

    console.log("Websocket :" , socket)

    useEffect(()=> {
        async function fetchHostId() {

            try {
                setLoading(true)
                const response = await axios.get(`/api/spaces/?spaceId=${spaceId}`)
                const data = await response.data;
                console.log("Space data received:", data)
                setCreatorId(data.hostId)
                setSpaceName(data.spaceName || `Room ${spaceId.slice(0, 8)}`)
            } catch (error : any) {
                console.error("Error fetching space info:", error);

                if (error.response) {
                    console.error("Server Error:", error.response.data);
                    alert(`Error: ${error.response.data.message || "Failed to fetch space info."}`);
                }
                // Set fallback values
                setSpaceName(`Room ${spaceId.slice(0, 8)}`)
            } finally{
                setLoading(false)
            }
            
        }
        fetchHostId()
    } ,[spaceId])


    useEffect(()=> {
        async function connectToWebSocket() {
            console.log("Second UseEffect Ran")
            console.log("Creator Id" , creatorId)
            console.log("Space Name" , spaceName)
            if(user && socket && creatorId && spaceName) {
                console.log("trying to connect with websocket....")
                console.log("USER ID : ", user?.id )
                const response = await axios.post("/api/generate-token", {
                    creatorId,
                    userId: user?.id,
                });
                const { token } = response.data;
                console.log(token)

                console.log("trying to connect with websocket....")
                socket?.send(
                    JSON.stringify({
                        type : "join-room",
                        data : {
                            token,
                            spaceId,
                            spaceName
                        },
                    })
                );

                if (!user.token){
                    setUser({...user , token})
                }
            }
            }


        connectToWebSocket();
        
    } , [user , spaceId , creatorId , socket, spaceName])

    useEffect(() => {
        if (creatorId && user?.id && creatorId === user.id) {
            router.push(`/dashboard/${spaceId}`);
        }
    }, [creatorId, user?.id, spaceId, router]); 
    

    if(connectionError){
        return <ErrorScreen>Cannot connect to socket server</ErrorScreen>
    }

    // loading from sockettt!!!
    if(loading){
        return <LoadingScreen/>
    }
    if(!user){
        return <ErrorScreen> Please Log in....</ErrorScreen>
    }
    if(isLoading){
        return <LoadingScreen></LoadingScreen> 
    }

    // if(creatorId=== user?.id){
    //     router.push(`/dashboard/${spaceId}`)
    // }



    return <StreamView creatorId={creatorId} playVideo={true} spaceId={spaceId}/>
}