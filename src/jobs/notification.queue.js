const { Queue } = require('bullmq');
const config = require('../config/env');
const logger = require('../config/logger');
const redisClient = require('../lib/redis');

const QUEUE_NAME = 'order-notifications';

class NotificationQueue {
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
          logger.warn(`BullMQ queue error: ${err.message}`);
        }
      });
    } catch (err) {
      logger.warn(`Failed to initialize BullMQ queue: ${err.message}`);
    }
  }

  /**
   * Enqueues an order confirmation notification.
   * Guarantees queue-level idempotency via deterministic jobId ('order-notification-' + orderId).
   * Fails open gracefully if Redis is unavailable so the payment/order transaction is never blocked.
   *
   * @param {Object} data - Notification payload
   * @param {string} data.orderId - Unique order UUID
   * @param {string} data.orderNumber - Human-readable order number
   * @param {string} [data.recipientEmail] - Customer email
   * @param {string} data.totalAmount - Order total amount
   * @param {string} data.currency - Currency code
   * @param {Array} [data.items] - Order items summary
   * @returns {Promise<Object|null>} Enqueued job or null on graceful fallback
   */
  async addOrderConfirmationJob(data) {
    if (!this.queue || !redisClient.isAvailable()) {
      logger.info(
        `Redis offline or in test mode. Simulated notification logged directly for order ${data.orderNumber || data.orderId}`
      );
      return null;
    }

    try {
      // Bounded retry and deterministic jobId for idempotency
      const job = await this.queue.add('order-confirmation', data, {
        jobId: `order-notification-${data.orderId}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        }
      });

      logger.info(`Enqueued order confirmation job [${job.id}] for order ${data.orderNumber}`);
      return job;
    } catch (err) {
      // Graceful degradation: never crash or fail the customer's purchase if queue fails
      logger.warn(
        `Failed to enqueue order notification job for order ${data.orderId}: ${err.message}. Proceeding without queue.`
      );
      return null;
    }
  }

  /**
   * Graceful shutdown of queue connection
   */
  async close() {
    if (this.queue) {
      try {
        await this.queue.close();
      } catch (err) {
        // ignore
      }
    }
  }
}

module.exports = new NotificationQueue();
