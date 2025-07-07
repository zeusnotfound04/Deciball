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
  autoRedirectOnMount?: boolean; // New option to control auto-redirect behavior
}

export default function useRedirect(options: UseRedirectOptions = {}) {
  const { redirectTo = 'manual', onRedirect, autoRedirectOnMount = false } = options;
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [isCheckingSpaces, setIsCheckingSpaces] = useState(false);
  const [redirectDestination, setRedirectDestination] = useState<string>('');

  // Function to fetch user's spaces
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

  // Function to determine redirect destination
  const determineRedirectDestination = (userSpaces: Space[]) => {
    // Case 1: User not logged in -> redirect to login (only when manually triggered)
    if (session.status === "unauthenticated") {
      return '/login';
    }

    // Case 2: User logged in but no spaces -> redirect to space creation/onboarding (only when manually triggered)
    if (session.status === "authenticated" && userSpaces.length === 0) {
      return '/dashboard';
    }

    // Case 3: User has spaces -> redirect to spaces listing (can be auto or manual)
    if (session.status === "authenticated" && userSpaces.length > 0) {
      return '/spaces';
    }

    return '';
  };

  // Function to check if we should auto-redirect (only for users with spaces)
  const shouldAutoRedirect = (userSpaces: Space[]) => {
    return session.status === "authenticated" && userSpaces.length > 0;
  };

  // Function to handle the redirect
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

  // Effect to check authentication and spaces
  useEffect(() => {
    const checkAndRedirect = async () => {
      if (session.status === "loading") return;

      if (redirectTo === 'auto') {
        const userSpaces = await fetchUserSpaces();
        setSpaces(userSpaces);
        const destination = determineRedirectDestination(userSpaces);
        setRedirectDestination(destination);
        
        // Only auto-redirect if user has spaces OR autoRedirectOnMount is true
        if (shouldAutoRedirect(userSpaces) || autoRedirectOnMount) {
          handleRedirect(destination);
        }
      } else if (redirectTo === 'manual') {
        // For manual mode, just fetch spaces and set destination but don't redirect
        const userSpaces = await fetchUserSpaces();
        setSpaces(userSpaces);
        const destination = determineRedirectDestination(userSpaces);
        setRedirectDestination(destination);
        
        // Only auto-redirect if user has spaces (this is the key change)
        if (shouldAutoRedirect(userSpaces)) {
          handleRedirect(destination);
        }
      } else {
        // Handle specific redirect cases
        switch (redirectTo) {
          case 'login':
            handleRedirect('/login');
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