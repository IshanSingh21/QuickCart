const prisma = require('../../lib/prisma');
const config = require('../../config/env');
const packageJson = require('../../../package.json');

class HealthService {
  /**
   * Check overall system health including database and redis probes
   */
  async getHealthStatus() {
    const startTime = process.hrtime();
    let dbStatus = { status: 'disconnected', latencyMs: null };
    let isOverallHealthy = true;

    // Database Connectivity Probe with 1000ms timeout
    let timer;
    try {
      const dbStartTime = Date.now();
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Database probe timeout')), 1000);
      });
      await Promise.race([prisma.$queryRaw`SELECT 1`, timeout]);
      const dbLatency = Date.now() - dbStartTime;
      dbStatus = {
        status: 'connected',
        latencyMs: dbLatency
      };
    } catch (error) {
      dbStatus = {
        status: 'disconnected',
        error: config.env === 'production' ? 'Database connection failed' : error.message
      };
      // For health check reporting, don't crash the server
      isOverallHealthy = false;
    } finally {
      if (timer) clearTimeout(timer);
    }

    const uptimeSeconds = Math.floor(process.uptime());
    const memory = process.memoryUsage();

    return {
      status: isOverallHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: uptimeSeconds,
      environment: config.env,
      version: packageJson.version,
      memory: {
        rssMb: Math.round(memory.rss / 1024 / 1024),
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024)
      },
      services: {
        database: dbStatus
      }
    };
  }
}

module.exports = new HealthService();
