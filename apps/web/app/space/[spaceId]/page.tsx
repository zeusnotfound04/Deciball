'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { SocketContextProvider } from '@/context/socket-context';
import { MusicRoom } from '@/components/MusicRoom';

export default function SpacePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const spaceId = params?.spaceId as string;

  useEffect(() => {
    if (status !== 'loading' && !session) {
      router.push('/signin');
    }
  }, [status, session, router]);

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
    // This will only render briefly before the redirect happens
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-gray-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg">Redirecting to sign in...</p>
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
