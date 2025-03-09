"use client"
import { useSocket } from "@/context/socket-context";
import axios from "axios";
import { useEffect, useState } from "react";
import jwt from "jsonwebtoken";
import ErrorScreen from "@/app/components/ErrorScreen";
import LoadingScreen from "@/app/components/LoadingScreen";
import { useRouter , useParams } from "next/navigation";
import StreamView from "@/app/components/StreamView";


export default function Page(){
    const { socket , user  , setUser , connectionError , loading} = useSocket()

    const [creatorId , setCreatorId] = useState<string | null>(null)
    const [isLoading , setLoading] = useState<boolean>(true)

    const router = useRouter();
    const params = useParams();
    const spaceId = params.spaceId as string;
    console.log("Bc Space Id yeh Hai ",spaceId)

    useEffect(()=> {
        async function fetchHostId() {

            try {
                setLoading(true)
                const response = await axios.get(`/api/spaces/?spaceId=${spaceId}`)
                const data = await response.data;
                console.log(data)
                setCreatorId(data.hostId)
            } catch (error : any) {
                console.error("Error fetching host ID:", error);

                if (error.response) {
                    console.error("Server Error:", error.response.data);
                    alert(`Error: ${error.response.data.message || "Failed to fetch host ID."}`);
                }
            } finally{
                setLoading(false)
            }
            
        }
        fetchHostId()
    } ,[spaceId])


    useEffect(()=> {
        if(user && socket && creatorId) {
            const token = user.token || jwt.sign(
                {
                    creatorId : creatorId,
                    userId : user?.id ,
                },
                process.env.NEXT_PUBLIC_SECRET || "",
                {
                    expiresIn : "24h"
                }
            );

            socket?.send(
                JSON.stringify({
                    type : "join-room",
                    data : {
                        token,
                        spaceId
                    },
                })
            );

            if (!user.token){
                setUser({...user , token})
            }
        }
    } , [user , spaceId , creatorId , socket])

    

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

    if(creatorId=== user?.id){
        router.push(`/dashboard/${spaceId}`)
    }



    return <StreamView creatorId={creatorId as string} playVideo={true} spaceId={spaceId}/>
}