const Redis = require('ioredis');
const config = require('../config/env');
const logger = require('../config/logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.isReady = false;
    this._init();
  }

  _init() {
    try {
      this.client = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false, // Fail fast rather than buffer commands endlessly when Redis is down
        lazyConnect: true, // Don't block application startup if Redis is offline
        retryStrategy: (times) => {
          // Bounded exponential backoff up to 10 seconds
          if (times > 10) {
            return null; // Stop retrying after 10 attempts to prevent log floods
          }
          return Math.min(times * 500, 10000);
        }
      });

      this.client.on('connect', () => {
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        this.isReady = true;
        this.isConnected = true;
        logger.info('Redis client connected and ready.');
      });

      this.client.on('error', (err) => {
        this.isReady = false;
        // Log as debug or warning so offline Redis in local/test doesn't spam fatal errors
        if (config.env !== 'test') {
          logger.warn(`Redis client error: ${err.message}`);
        }
      });

      this.client.on('close', () => {
        this.isReady = false;
        this.isConnected = false;
      });

      // Attempt initial connection in background without blocking startup
      if (config.env !== 'test') {
        this.client.connect().catch((err) => {
          logger.warn(`Initial Redis connection could not be established: ${err.message}. Application will operate with cache bypass.`);
        });
      }
    } catch (err) {
      this.isReady = false;
      logger.warn(`Redis initialization failed: ${err.message}`);
    }
  }

  /**
   * Check if Redis is connected and ready to receive commands
   * @returns {boolean}
   */
  isAvailable() {
    return this.isReady && this.client && this.client.status === 'ready';
  }

  /**
   * Get string/JSON value by key with graceful fallback
   * @param {string} key
   * @returns {Promise<string|null>}
   */
  async get(key) {
    if (!this.isAvailable()) return null;
    try {
      return await this.client.get(key);
    } catch (err) {
      logger.warn(`Redis GET failed for key "${key}": ${err.message}`);
      return null;
    }
  }

  /**
   * Set key with TTL in seconds with graceful fallback
   * @param {string} key
   * @param {string} value
   * @param {number} ttlSeconds
   * @returns {Promise<boolean>}
   */
  async set(key, value, ttlSeconds) {
    if (!this.isAvailable()) return false;
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (err) {
      logger.warn(`Redis SET failed for key "${key}": ${err.message}`);
      return false;
    }
  }

  /**
   * Delete one or more keys
   * @param {...string} keys
   * @returns {Promise<number>}
   */
  async del(...keys) {
    if (!this.isAvailable() || keys.length === 0) return 0;
    try {
      return await this.client.del(...keys);
    } catch (err) {
      logger.warn(`Redis DEL failed: ${err.message}`);
      return 0;
    }
  }

  /**
   * Delete keys matching a pattern using non-blocking SCAN
   * Guarantees zero blocking of the single-threaded Redis engine (unlike KEYS *)
   * @param {string} pattern
   * @returns {Promise<number>} Number of keys deleted
   */
  async scanDel(pattern) {
    if (!this.isAvailable()) return 0;
    try {
      let cursor = '0';
      let totalDeleted = 0;

      do {
        const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;

        if (keys && keys.length > 0) {
          const deleted = await this.client.del(...keys);
          totalDeleted += deleted;
        }
      } while (cursor !== '0');

      return totalDeleted;
    } catch (err) {
      logger.warn(`Redis scanDel failed for pattern "${pattern}": ${err.message}`);
      return 0;
    }
  }

  /**
   * Raw command call for rate-limit-redis adapter
   */
  async rawCall(...args) {
    if (!this.isAvailable()) {
      throw new Error('Redis is not available');
    }
    return this.client.call(...args);
  }

  /**
   * Probe Redis latency and health
   */
  async ping() {
    if (!this.isAvailable()) {
      return { status: 'disconnected', latencyMs: null };
    }
    const start = Date.now();
    try {
      const pong = await this.client.ping();
      const latencyMs = Date.now() - start;
      return {
        status: pong === 'PONG' ? 'connected' : 'degraded',
        latencyMs
      };
    } catch (err) {
      return { status: 'disconnected', latencyMs: null, error: err.message };
    }
  }

  /**
   * Disconnect cleanly on process termination
   */
  async disconnect() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch (err) {
        this.client.disconnect();
      }
    }
  }
}

module.exports = new RedisClient();
