const crypto = require('crypto');
const redisClient = require('../lib/redis');
const logger = require('../config/logger');

const CACHE_TTL = {
  CATEGORIES: 3600,     // 1 hour for static category trees
  PRODUCT_DETAIL: 900,  // 15 minutes for individual product pages
  PRODUCT_LIST: 300     // 5 minutes for search/catalog queries
};

const CACHE_PREFIX = 'quickcart';

class CacheService {
  constructor() {
    this.ttl = CACHE_TTL;
  }

  /**
   * Deterministically generates a cache key for catalog queries.
   * Sorts query keys so { page: 1, limit: 10 } and { limit: 10, page: 1 } share the same cache entry.
   * @param {Object} query
   * @returns {string}
   */
  generateCatalogQueryKey(query = {}) {
    const sortedKeys = Object.keys(query).sort();
    const normalized = {};
    for (const k of sortedKeys) {
      if (query[k] !== undefined && query[k] !== null && query[k] !== '') {
        normalized[k] = String(query[k]);
      }
    }
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(normalized))
      .digest('hex')
      .substring(0, 16);

    return `${CACHE_PREFIX}:products:list:${hash}`;
  }

  getCategoryKey(tree = true) {
    return `${CACHE_PREFIX}:categories:${tree ? 'tree' : 'flat'}`;
  }

  getProductIdKey(id) {
    return `${CACHE_PREFIX}:products:id:${id}`;
  }

  getProductSlugKey(slug) {
    return `${CACHE_PREFIX}:products:slug:${slug}`;
  }

  /**
   * Get cached data with automatic JSON deserialization.
   * Returns null if key does not exist or Redis is offline.
   * @param {string} key
   * @returns {Promise<any|null>}
   */
  async get(key) {
    try {
      const raw = await redisClient.get(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      logger.warn(`Cache parse error for key "${key}": ${err.message}`);
      return null;
    }
  }

  /**
   * Set cached data with automatic JSON serialization and TTL.
   * Fails silently without throwing if Redis is unavailable.
   * @param {string} key
   * @param {any} data
   * @param {number} ttlSeconds
   * @returns {Promise<boolean>}
   */
  async set(key, data, ttlSeconds) {
    try {
      const serialized = JSON.stringify(data);
      return await redisClient.set(key, serialized, ttlSeconds);
    } catch (err) {
      logger.warn(`Cache serialization error for key "${key}": ${err.message}`);
      return false;
    }
  }

  /**
   * Explicit surgical invalidation when a product is created, updated, or deleted
   * @param {Object} params
   * @param {string} [params.id] - Product UUID
   * @param {string} [params.slug] - Product URL slug
   */
  async invalidateProduct({ id = null, slug = null } = {}) {
    const keysToDelete = [];
    if (id) keysToDelete.push(this.getProductIdKey(id));
    if (slug) keysToDelete.push(this.getProductSlugKey(slug));

    if (keysToDelete.length > 0) {
      await redisClient.del(...keysToDelete);
    }

    // Invalidate all product catalog listings using non-blocking SCAN
    await redisClient.scanDel(`${CACHE_PREFIX}:products:list:*`);
  }

  /**
   * Explicit surgical invalidation when categories are created, updated, or deleted
   */
  async invalidateCategory() {
    await redisClient.scanDel(`${CACHE_PREFIX}:categories:*`);
    await redisClient.scanDel(`${CACHE_PREFIX}:products:list:*`);
  }

  /**
   * Invalidate entire catalog cache
   */
  async invalidateAll() {
    await redisClient.scanDel(`${CACHE_PREFIX}:*`);
  }
}

module.exports = new CacheService();
