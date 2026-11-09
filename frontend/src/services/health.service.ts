import { apiClient } from '../lib/api-client';
import { ApiResponse, HealthStatus } from '../types';

export const healthService = {
  /**
   * Probes the backend API health status including database and Redis latency
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const response = await apiClient.get<ApiResponse<HealthStatus>>('/health');
    return response.data.data;
  }
};
