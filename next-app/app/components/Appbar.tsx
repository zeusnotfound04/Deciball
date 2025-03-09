"use client"
import { signIn, signOut, useSession } from "next-auth/react";

export function Appbar( {showThemeSwitch = true , isSpectator = false}){
    const session = useSession()
    return <div>
        <div className="flex justify-between">
            <div>
                Decibal
            </div>
            <div className=" items-center gap-x-2">
                {isSpectator}
                {session.data?.user && <button className="m-2 p-2 bg-blue-400" onClick={()=> signOut()}>Logout</button>}
                {!session.data?.user && <button className="m-2 p-2 bg-blue-400" onClick={()=> signIn()}>Sign In</button>}

            </div>
        </div>
    </div>
}