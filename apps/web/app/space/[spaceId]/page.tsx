'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { SocketContextProvider } from '@/context/socket-context';
import { MusicSpace } from '@/components/MusicSpace';
import Loader from '@/components/ui/Loader';

export default function SpacePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const spaceId = params?.spaceId as string;

  // Prefetch space info as early as possible — before socket even connects
  useEffect(() => {
    if (spaceId) {
      fetch(`/api/spaces?spaceId=${spaceId}`).catch(() => {});
    }
  }, [spaceId]);

  useEffect(() => {
    if (status !== 'loading' && !session) {
      router.push('/signin');
    }
  }, [status, session, router]);

  // Show the space UI immediately with skeleton — don't block on session loading
  if (status === 'loading') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Loader fullScreen label="Loading" />
      </motion.div>
    );
  }

  if (!session) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Loader fullScreen label="Redirecting" />
      </motion.div>
    );
  }

  if (!spaceId) {
    return (
      <div className="min-h-screen bg-void-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif italic text-[32px] text-paper-white mb-4">Invalid Space</h1>
          <p className="font-satoshi text-steel-gray">Space ID not found.</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      <SocketContextProvider>
        <MusicSpace spaceId={spaceId} />
      </SocketContextProvider>
    </motion.div>
  );
}
