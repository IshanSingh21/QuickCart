/**
 * QuickCart System Health Types
 * Matches the /api/v1/health probe response.
 */

export interface ServiceProbe {
  status: 'connected' | 'disconnected';
  latencyMs: number | null;
  error?: string;
}

export interface MemoryUsage {
  rssMb: number;
  heapUsedMb: number;
  heapTotalMb: number;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  memory: MemoryUsage;
  database: ServiceProbe;
  redis: ServiceProbe;
}
