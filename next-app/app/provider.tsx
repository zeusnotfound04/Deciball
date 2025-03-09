"use client"
import { SocketContextProvider } from "@/context/socket-context";
import { SessionProvider } from "next-auth/react";
import React from "react";


export function Providers({children}: {
    children : React.ReactNode
}){
    return <SessionProvider>
        <SocketContextProvider>{children}</SocketContextProvider>
        
    </SessionProvider>
}