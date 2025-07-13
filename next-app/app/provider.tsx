"use client"
import { SocketContextProvider } from "@/context/socket-context";
import { AudioProvider } from "@/store/audioStore";
import { SessionProvider } from "next-auth/react";
import React from "react";


export function Providers({children}: {
    children : React.ReactNode
}){
    return <SessionProvider>

        <SocketContextProvider> 
            <AudioProvider>{children}</AudioProvider> </SocketContextProvider>
         
    </SessionProvider>
}