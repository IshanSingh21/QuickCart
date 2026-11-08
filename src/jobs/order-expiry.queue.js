const { Queue } = require('bullmq');
const config = require('../config/env');
const logger = require('../config/logger');
const redisClient = require('../lib/redis');

const QUEUE_NAME = 'order-expirations';
const DEFAULT_EXPIRATION_DELAY_MS = 15 * 60 * 1000; // 15-minute unpaid checkout window

class OrderExpiryQueue {
  constructor() {
    this.queue = null;
    this._init();
  }

  _init() {
    // Only initialize BullMQ queue when not in test environment or when explicitly enabled
    if (config.env === 'test' && !process.env.TEST_BULLMQ) {
      return;
    }

    try {
      this.queue = new Queue(QUEUE_NAME, {
        connection: {
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password,
          maxRetriesPerRequest: null,
          enableOfflineQueue: false,
          connectTimeout: 2000
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000
          },
          removeOnComplete: 100,
          removeOnFail: 500
        }
      });

      this.queue.on('error', (err) => {
        if (config.env !== 'test') {
          logger.warn(`Order expiry queue error: ${err.message}`);
        }
      });
    } catch (err) {
      logger.warn(`Failed to initialize order expiry queue: ${err.message}`);
    }
  }

  /**
   * Enqueues a delayed order expiration job (default 15 minutes).
   * Guarantees queue-level idempotency via deterministic jobId ('order-expiry-' + orderId).
   * Fails open gracefully if Redis is unavailable so checkout is never blocked.
   *
   * @param {Object} data - Expiry payload
   * @param {string} data.orderId - Unique order UUID
   * @param {string} data.orderNumber - Human-readable order number
   * @param {number} [delayMs] - Optional override for delay in milliseconds (defaults to 15m)
   * @returns {Promise<Object|null>} Enqueued job or null on graceful fallback
   */
  async addOrderExpiryJob(data, delayMs = DEFAULT_EXPIRATION_DELAY_MS) {
    if (!this.queue || !redisClient.isAvailable()) {
      logger.info(
        `Redis offline or in test mode. Order expiry job skipped for order ${data.orderNumber || data.orderId}`
      );
      return null;
    }

    try {
      const job = await this.queue.add('order-expiry', data, {
        jobId: `order-expiry-${data.orderId}`,
        delay: delayMs,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        }
      });

      logger.info(
        `Enqueued delayed order expiry job [${job.id}] for order ${data.orderNumber} (Delay: ${delayMs / 1000}s)`
      );
      return job;
    } catch (err) {
      logger.warn(
        `Failed to enqueue order expiry job for order ${data.orderId}: ${err.message}. Proceeding without delay queue.`
      );
      return null;
    }
  }

  /**
   * Gracefully close the queue connection
   */
  async close() {
    if (this.queue) {
      try {
        await this.queue.close();
      } catch (err) {
        logger.warn(`Error closing order expiry queue: ${err.message}`);
      }
    }
  }
}

module.exports = new OrderExpiryQueue();
