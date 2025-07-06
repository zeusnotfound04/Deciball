import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import jwt from 'jsonwebtoken';
import { authOptions } from '@/app/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { creatorId, userId } = body;

    // Generate JWT token for WebSocket authentication
    const payload = {
      userId: userId || session.user.id,
      email: session.user.email,
      username: session.user.username || (session.user as any).name,
      creatorId: creatorId || session.user.id,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
      expiresIn: '24h',
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: session.user.id,
        email: session.user.email,
        username: session.user.username || (session.user as any).name,
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
