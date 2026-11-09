import React from 'react';
import { useHealth } from '../../hooks/useHealth';
import { Activity, Database, Server, AlertCircle } from 'lucide-react';
import { Badge } from '../ui/Badge';

export const HealthBanner: React.FC = () => {
  const { data: health, isLoading, isError } = useHealth(30000);

  if (isLoading) {
    return (
      <div className="bg-gray-900 text-gray-300 text-xs py-1.5 px-4 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 animate-pulse text-amber-400" />
          <span>Probing QuickCart Express Backend API...</span>
        </div>
      </div>
    );
  }

  if (isError || !health) {
    return (
      <div className="bg-red-950 text-red-200 text-xs py-1.5 px-4 flex items-center justify-between border-b border-red-900">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
          <span>Backend Offline: Cannot connect to http://localhost:5000/api/v1/health</span>
        </div>
        <span className="text-red-300 font-mono">Ensure npm start is running</span>
      </div>
    );
  }

  const isHealthy = health.status === 'healthy';

  return (
    <div className="bg-slate-900 text-slate-200 text-xs py-1.5 px-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 relative">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isHealthy ? 'bg-green-400' : 'bg-amber-400'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isHealthy ? 'bg-green-500' : 'bg-amber-500'
            }`}
          />
        </span>
        <span className="font-semibold text-slate-100">Backend Live</span>
        <span className="text-slate-400">|</span>
        <span className="text-slate-300">v{health.version}</span>
        <Badge variant={isHealthy ? 'success' : 'warning'} size="sm">
          {health.environment.toUpperCase()}
        </Badge>
      </div>

      <div className="flex items-center gap-4 text-slate-400">
        <div className="flex items-center gap-1.5" title="PostgreSQL 16 Primary Connection">
          <Database className="w-3 h-3 text-blue-400" />
          <span>PostgreSQL:</span>
          <span className="text-slate-200 font-mono">
            {health.database.status === 'connected' ? `${health.database.latencyMs}ms` : 'Offline'}
          </span>
        </div>

        <div className="flex items-center gap-1.5" title="Redis 7.x In-Memory Cluster">
          <Server className="w-3 h-3 text-red-400" />
          <span>Redis:</span>
          <span className="text-slate-200 font-mono">
            {health.redis.status === 'connected' ? `${health.redis.latencyMs}ms` : 'Offline'}
          </span>
        </div>

        <div className="text-slate-400 hidden sm:inline" title="Process Uptime">
          Uptime: <span className="text-slate-200">{Math.floor(health.uptime / 60)}m</span>
        </div>
      </div>
    </div>
  );
};
