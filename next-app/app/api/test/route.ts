import { getSpotifyApi } from "@/lib/spotify";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  console.log("➡️ Raw Authorization Header:", authHeader);

  const token = authHeader?.replace("Bearer ", "").trim();
  console.log("🪪 Extracted Token:", token ? "[REDACTED]" : "null");

  if (!token) {
    console.warn("❌ No token provided");
    return new NextResponse("No token provided", { status: 401 });
  }

  const spotify = getSpotifyApi(token);
  console.log("🎧 Spotify client initialized with access token");

  try {
    const me = await spotify.getMe();
    console.log("✅ Spotify getMe response:", me.body);
    return NextResponse.json(me.body);
  } catch (error: any) {
    console.error("❌ Spotify API error:", error.message || error);
    return new NextResponse("Spotify API error", { status: 500 });
  }
}
