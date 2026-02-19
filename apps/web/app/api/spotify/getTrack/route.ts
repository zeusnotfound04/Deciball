import { getSpotifyTrack } from "@/actions/spotify/getSpotifyTrack";
import { authOptions } from "@/app/lib/auth";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions); 
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    try {
        const body = await req.json();
  
        const track = await getSpotifyTrack(body)

        return NextResponse.json({ 
            body: track,
            status: 200
        });
        
    } catch (error) {
        console.error(error); 
        return NextResponse.json({
            message: "Invalid data format",
            error: error instanceof Error ? error.message : "Unknown error"
        }, {
            status: 400
        });
    }
}