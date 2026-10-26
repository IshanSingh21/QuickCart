const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env or .env.test depending on NODE_ENV
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const requiredEnvVars = ['DATABASE_URL'];

// Fail fast in production if critical variables are missing
if (process.env.NODE_ENV === 'production') {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`CRITICAL STARTUP ERROR: Environment variable ${envVar} is required in production.`);
    }
  }
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  corsOrigin: process.env.CORS_ORIGIN || '*',

  database: {
    url: process.env.DATABASE_URL || 'postgresql://quickcart_user:quickcart_secret_password@localhost:5432/quickcart_db?schema=public'
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'quickcart_default_access_secret_for_development_only_12345',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'quickcart_default_refresh_secret_for_development_only_67890',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100
  },

  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : 'info')
  }
};

module.exports = config;
