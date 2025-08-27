'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

interface Space {
  id: string;
  name: string;
  hostId: string;
  isActive: boolean;
  _count?: {
    streams: number;
  };
}

interface CreateSpacePayload {
  spaceName: string;
}

// Query Keys
export const spacesKeys = {
  all: ['spaces'] as const,
  userSpaces: () => [...spacesKeys.all, 'user'] as const,
} as const;

// API Functions
const spacesApi = {
  getUserSpaces: async (): Promise<Space[]> => {
    const response = await axios.get('/api/spaces');
    return response.data.spaces || [];
  },

  createSpace: async (payload: CreateSpacePayload) => {
    const response = await axios.post('/api/spaces', payload);
    return response.data.space;
  },
};

// Custom Hooks
export function useUserSpaces() {
  return useQuery({
    queryKey: spacesKeys.userSpaces(),
    queryFn: spacesApi.getUserSpaces,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: (failureCount, error) => {
      // Retry on network errors but not on 4xx errors
      if (error instanceof Error && error.message.includes('401')) {
        return false; // Don't retry on auth errors
      }
      return failureCount < 2; // Retry up to 2 times
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });
}

export function useCreateSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: spacesApi.createSpace,
    onSuccess: (newSpace) => {
      // Invalidate and refetch user spaces
      queryClient.invalidateQueries({ queryKey: spacesKeys.userSpaces() });
      
      // Optionally, update the cache directly for immediate UI update
      queryClient.setQueryData<Space[]>(spacesKeys.userSpaces(), (oldSpaces = []) => [
        newSpace,
        ...oldSpaces,
      ]);
    },
    onError: (error) => {
      console.error('Error creating space:', error);
    },
  });
}

// Prefetch function for better UX
export function usePrefetchUserSpaces() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: spacesKeys.userSpaces(),
      queryFn: spacesApi.getUserSpaces,
      staleTime: 1000 * 60 * 5,
    });
  };
}
