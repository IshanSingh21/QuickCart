const { Worker } = require('bullmq');
const config = require('../config/env');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');

const QUEUE_NAME = 'order-expirations';

class OrderExpiryWorker {
  constructor() {
    this.worker = null;
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
        logger.info(`Order expiry job [${job.id}] processed:`, result);
      });

      this.worker.on('failed', (job, err) => {
        const attempt = job ? job.attemptsMade : 0;
        const maxAttempts = job && job.opts ? job.opts.attempts : 3;

        logger.warn(
          `Order expiry job [${job ? job.id : 'unknown'}] failed attempt ${attempt}/${maxAttempts}: ${err.message}`
        );

        if (attempt >= maxAttempts) {
          logger.error(
            `DEAD LETTER QUEUE ALERT: Order expiry job [${job ? job.id : 'unknown'}] permanently failed after ${maxAttempts} attempts.`
          );
        }
      });

      this.worker.on('error', (err) => {
        if (config.env !== 'test') {
          logger.warn(`Order expiry worker connection error: ${err.message}`);
        }
      });
    } catch (err) {
      logger.warn(`Failed to initialize order expiry worker: ${err.message}`);
    }
  }

  /**
   * Idempotent order expiration job processor.
   * Atomically transitions unpaid PENDING_PAYMENT orders to EXPIRED
   * and restocks reserved inventory with EXPIRATION_RELEASE audit ledger entries.
   *
   * @param {Object} job - BullMQ job instance
   * @returns {Promise<Object>}
   */
  async processJob(job) {
    if (!job || !job.data || !job.data.orderId) {
      throw new Error('Malformed order expiry job: missing required orderId');
    }

    const { orderId } = job.data;

    // 1. Fetch current order state and items
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });

    if (!order) {
      logger.warn(`Order not found during expiry processing: ${orderId}`);
      return { skipped: true, reason: 'ORDER_NOT_FOUND', orderId };
    }

    // 2. State verification: Only PENDING_PAYMENT orders can expire
    if (order.status !== 'PENDING_PAYMENT') {
      logger.info(
        `Order [${order.orderNumber || orderId}] is in ${order.status} status. Expiry skipped.`
      );
      return {
        skipped: true,
        reason: 'ORDER_NOT_PENDING',
        currentStatus: order.status,
        orderId
      };
    }

    // 3. Atomically transition order status to EXPIRED and restock reserved inventory
    const result = await prisma.$transaction(async (tx) => {
      // Transition order status
      const expired = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'EXPIRED'
        }
      });

      // Increment product stock and log EXPIRATION_RELEASE inventory audit trail
      for (const item of order.items) {
        const updatedProduct = await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            version: { increment: 1 }
          }
        });

        await tx.inventory.create({
          data: {
            productId: item.productId,
            orderId: order.id,
            changeType: 'EXPIRATION_RELEASE',
            quantityDelta: item.quantity,
            remainingStock: updatedProduct.stock,
            reason: `Automatic expiration release for unpaid order ${order.orderNumber || orderId}`
          }
        });
      }

      return expired;
    });

    logger.info(
      `Order [${order.orderNumber || orderId}] successfully expired. Inventory restocked.`
    );

    return {
      success: true,
      orderId,
      orderNumber: order.orderNumber,
      status: result.status
    };
  }

  /**
   * Gracefully close the worker connection
   */
  async close() {
    if (this.worker) {
      try {
        await this.worker.close();
      } catch (err) {
        logger.warn(`Error closing order expiry worker: ${err.message}`);
      }
    }
  }
}

module.exports = new OrderExpiryWorker();
