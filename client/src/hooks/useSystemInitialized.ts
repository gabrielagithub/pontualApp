import { useQuery } from '@tanstack/react-query';

interface SystemStatus {
  initialized: boolean;
}

export function useSystemInitialized() {
  const { data, isLoading, error } = useQuery<SystemStatus>({
    queryKey: ['/api/auth/is-initialized'],
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    isInitialized: data?.initialized ?? false,
    isLoading,
    error
  };
}