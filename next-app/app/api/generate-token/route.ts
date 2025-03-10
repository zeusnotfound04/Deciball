import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { creatorId, userId } = body;
        console.log( "Logging the creator ID and USER ID" ,  creatorId , userId)

        if (!creatorId || !userId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Ensure the secret key is set
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return NextResponse.json({ error: "Server error: Missing JWT_SECRET" }, { status: 500 });
        }

        // Generate token
        const token = jwt.sign({ creatorId, userId }, secret, { expiresIn: "24h" });

        return NextResponse.json({ token }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
