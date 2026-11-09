import { useQuery } from '@tanstack/react-query';
import { healthService } from '../services/health.service';
import { HealthStatus } from '../types';

export function useHealth(refetchInterval = 30000) {
  return useQuery<HealthStatus>({
    queryKey: ['system-health'],
    queryFn: () => healthService.getHealthStatus(),
    refetchInterval,
    retry: 1
  });
}
