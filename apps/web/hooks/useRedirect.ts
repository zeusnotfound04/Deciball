import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";

interface Space {
  id: string;
  name: string;
  hostId: string;
  isActive: boolean;
}

interface UseRedirectOptions {
  redirectTo?: 'login' | 'onboarding' | 'spaces' | 'auto' | 'manual';
  onRedirect?: (destination: string) => void;
  autoRedirectOnMount?: boolean;
}

export default function useRedirect(options: UseRedirectOptions = {}) {
  const { redirectTo = 'manual', onRedirect, autoRedirectOnMount = false } = options;
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [isCheckingSpaces, setIsCheckingSpaces] = useState(false);
  const [redirectDestination, setRedirectDestination] = useState<string>('');

  const fetchUserSpaces = async () => {
    if (!session.data?.user?.id) return [];
    
    try {
      setIsCheckingSpaces(true);
      const response = await axios.get('/api/spaces');
      return response.data.spaces || [];
    } catch (error) {
      console.error('Error fetching user spaces:', error);
      return [];
    } finally {
      setIsCheckingSpaces(false);
    }
  };

  const determineRedirectDestination = (userSpaces: Space[]) => {
    if (session.status === "unauthenticated") {
      return '/signin';
    }

    if (session.status === "authenticated" && userSpaces.length === 0) {
      return '/dashboard';
    }

    if (session.status === "authenticated" && userSpaces.length > 0) {
      return '/spaces';
    }

    return '';
  };

  const shouldAutoRedirect = (userSpaces: Space[]) => {
    return session.status === "authenticated" && userSpaces.length > 0;
  };

  const handleRedirect = (destination?: string) => {
    const targetDestination = destination || redirectDestination;
    
    if (targetDestination && targetDestination !== pathname) {
      if (onRedirect) {
        onRedirect(targetDestination);
      } else {
        router.push(targetDestination);
      }
    }
  };

  useEffect(() => {
    const checkAndRedirect = async () => {
      if (session.status === "loading") return;

      if (redirectTo === 'auto') {
        const userSpaces = await fetchUserSpaces();
        setSpaces(userSpaces);
        const destination = determineRedirectDestination(userSpaces);
        setRedirectDestination(destination);
        
        if (shouldAutoRedirect(userSpaces) || autoRedirectOnMount) {
          handleRedirect(destination);
        }
      } else if (redirectTo === 'manual') {
        const userSpaces = await fetchUserSpaces();
        setSpaces(userSpaces);
        const destination = determineRedirectDestination(userSpaces);
        setRedirectDestination(destination);
        
        if (shouldAutoRedirect(userSpaces)) {
          handleRedirect(destination);
        }
      } else {
        switch (redirectTo) {
          case 'login':
            handleRedirect('/signin');
            break;
          case 'onboarding':
            handleRedirect('/dashboard');
            break;
          case 'spaces':
            handleRedirect('/spaces');
            break;
        }
      }
    };

    checkAndRedirect();
  }, [session.status, session.data?.user?.id, redirectTo, pathname]);

  return {
    isLoading: session.status === "loading" || isCheckingSpaces,
    isAuthenticated: session.status === "authenticated",
    hasSpaces: spaces.length > 0,
    spaces,
    redirectDestination,
    handleRedirect,
    refetchSpaces: fetchUserSpaces,
  };
}