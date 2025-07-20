import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import jwt from 'jsonwebtoken';
import { authOptions } from '@/app/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = {
      userId: session.user.id,
      email: session.user.email,
      name : session.user.name,
      pfpUrl: session.user.pfpUrl||"",
      username: session.user.username,
      creatorId: session.user.id, 
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
      expiresIn: '48h',
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: session.user.id,
        email: session.user.email,
        username: session.user.username,
        creatorId : session.user.id,
        name: session.user.name,
        pfpUrl: session.user.pfpUrl || null,
      },
    });
  } catch (error: any) {
    console.error('Error generating WebSocket token:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
