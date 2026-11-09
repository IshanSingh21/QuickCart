import { QueryClient } from '@tanstack/react-query';
import axios from 'axios';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: (failureCount, error) => {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          if (status === 401 || status === 403 || status === 404 || status === 409) {
            return false;
          }
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: false
    }
  }
});
