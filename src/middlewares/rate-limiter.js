const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const config = require('../config/env');
const redisClient = require('../lib/redis');
const AppError = require('../utils/app-error');
const { HttpStatus, ErrorCodes } = require('../constants/http-status');

function createRateLimitHandler(message) {
  return (req, res, next) => {
    next(
      new AppError(
        message,
        HttpStatus.TOO_MANY_REQUESTS,
        ErrorCodes.RATE_LIMIT_EXCEEDED
      )
    );
  };
}

/**
 * Hybrid Distributed Rate Limit Store
 *
 * Automatically delegates to RedisStore for distributed rate limiting across multiple backend instances
 * when Redis is available. Transparently falls back to in-memory tracking if Redis is offline or disconnected,
 * guaranteeing zero downtime or dropped requests during Redis outages.
 */
class HybridRateLimitStore {
  constructor(prefix) {
    this.prefix = prefix;
    this.memoryStore = new rateLimit.MemoryStore();
    this.redisStore = null;
  }

  init(options) {
    this.memoryStore.init(options);
  }

  _getStore() {
    if (redisClient.isAvailable()) {
      if (!this.redisStore) {
        try {
          this.redisStore = new RedisStore({
            sendCommand: (...args) => redisClient.rawCall(...args),
            prefix: `quickcart:rl:${this.prefix}:`
          });
        } catch (err) {
          return this.memoryStore;
        }
      }
      return this.redisStore;
    }
    return this.memoryStore;
  }

  async increment(key) {
    const store = this._getStore();
    try {
      return await store.increment(key);
    } catch (err) {
      return this.memoryStore.increment(key);
    }
  }

  async decrement(key) {
    const store = this._getStore();
    try {
      if (store.decrement) {
        return await store.decrement(key);
      }
    } catch (err) {
      if (this.memoryStore.decrement) {
        return this.memoryStore.decrement(key);
      }
    }
  }

  async resetKey(key) {
    const store = this._getStore();
    try {
      return await store.resetKey(key);
    } catch (err) {
      return this.memoryStore.resetKey(key);
    }
  }

  async get(key) {
    const store = this._getStore();
    try {
      if (store.get) {
        return await store.get(key);
      }
    } catch (err) {
      if (this.memoryStore.get) {
        return this.memoryStore.get(key);
      }
    }
  }
}

function createHybridStore(prefix) {
  return new HybridRateLimitStore(prefix);
}

const authLimiter = rateLimit({
  windowMs: config.authRateLimit.windowMs,
  max: config.authRateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: createHybridStore('auth'),
  skip: () => config.env === 'test' && !process.env.TEST_RATE_LIMIT,
  handler: createRateLimitHandler('Too many authentication attempts. Please try again later.')
});

const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: createHybridStore('general'),
  skip: () => config.env === 'test' && !process.env.TEST_RATE_LIMIT,
  handler: createRateLimitHandler('Too many requests. Please slow down.')
});

module.exports = {
  authLimiter,
  generalLimiter,
  createRateLimitHandler,
  createHybridStore,
  HybridRateLimitStore
};
