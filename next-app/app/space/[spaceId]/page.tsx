'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { SocketContextProvider } from '@/context/socket-context';
import { MusicRoom } from '@/components/MusicRoom';

export default function SpacePage() {
  const params = useParams();
  const { data: session, status } = useSession();
  const spaceId = params?.spaceId as string;

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-gray-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
          <p>You need to be signed in to join a music room.</p>
        </div>
      </div>
    );
  }

  if (!spaceId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Room</h1>
          <p>Room ID not found.</p>
        </div>
      </div>
    );
  }

  return (
    <SocketContextProvider>
      <MusicRoom spaceId={spaceId} />
    </SocketContextProvider>
  );
}
