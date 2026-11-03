const { Worker } = require('bullmq');
const config = require('../config/env');
const logger = require('../config/logger');

const QUEUE_NAME = 'order-notifications';

class NotificationWorker {
  constructor() {
    this.worker = null;
    // In-memory idempotency register for dispatched notifications
    this.dispatchedNotifications = new Set();
    this._init();
  }

  _init() {
    // Only initialize BullMQ worker when not in test environment or when explicitly enabled
    if (config.env === 'test' && !process.env.TEST_BULLMQ) {
      return;
    }

    try {
      this.worker = new Worker(
        QUEUE_NAME,
        async (job) => this.processJob(job),
        {
          connection: {
            host: config.redis.host,
            port: config.redis.port,
            password: config.redis.password,
            maxRetriesPerRequest: null,
            enableOfflineQueue: false
          },
          concurrency: 5
        }
      );

      this.worker.on('completed', (job, result) => {
        logger.info(`Job [${job.id}] completed successfully:`, result);
      });

      this.worker.on('failed', (job, err) => {
        const attempt = job ? job.attemptsMade : 0;
        const maxAttempts = job && job.opts ? job.opts.attempts : 3;

        logger.warn(
          `Job [${job ? job.id : 'unknown'}] failed attempt ${attempt}/${maxAttempts}: ${err.message}`
        );

        // Dead Letter Queue behavior: alert when all bounded retries are exhausted
        if (attempt >= maxAttempts) {
          logger.error(
            `DEAD LETTER QUEUE ALERT: Job [${job ? job.id : 'unknown'}] permanently failed after ${maxAttempts} attempts. Stored for manual inspection.`
          );
        }
      });

      this.worker.on('error', (err) => {
        if (config.env !== 'test') {
          logger.warn(`BullMQ worker connection error: ${err.message}`);
        }
      });
    } catch (err) {
      logger.warn(`Failed to initialize BullMQ worker: ${err.message}`);
    }
  }

  /**
   * Idempotent job processor
   * @param {Object} job - BullMQ job instance
   * @returns {Promise<Object>}
   */
  async processJob(job) {
    const { orderId, orderNumber, recipientEmail, totalAmount, currency, simulateFailure } = job.data;

    // 1. Idempotency Check: prevent duplicate email dispatch on worker retry
    const idempotencyKey = `notif:${orderId}`;
    if (this.dispatchedNotifications.has(idempotencyKey)) {
      logger.info(
        `Job [${job.id}] skipped. Order notification for order ${orderNumber || orderId} has already been dispatched.`
      );
      return { skipped: true, reason: 'IDEMPOTENT_DUPLICATE_SKIPPED', orderId };
    }

    // 2. Simulated failure hook for testing bounded retries & Dead Letter Queue
    if (simulateFailure) {
      throw new Error(`Simulated notification delivery failure for order ${orderNumber || orderId}`);
    }

    // 3. Simulate email/notification dispatch
    const notificationPayload = {
      orderId,
      orderNumber,
      recipient: recipientEmail || 'customer@example.com',
      subject: `Order Confirmation - ${orderNumber}`,
      amount: totalAmount,
      currency: currency || 'USD',
      deliveredAt: new Date().toISOString()
    };

    logger.info(`Simulated email dispatched successfully:`, notificationPayload);

    // 4. Mark as dispatched in the idempotency set
    this.dispatchedNotifications.add(idempotencyKey);

    return { success: true, notification: notificationPayload };
  }

  /**
   * Graceful shutdown of worker
   */
  async close() {
    if (this.worker) {
      try {
        await this.worker.close();
      } catch (err) {
        // ignore
      }
    }
  }
}

module.exports = new NotificationWorker();
