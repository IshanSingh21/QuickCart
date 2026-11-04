const notificationWorker = require('../../src/jobs/notification.worker');
const notificationQueue = require('../../src/jobs/notification.queue');
const logger = require('../../src/config/logger');

describe('Job Processing Resilience & Dead Letter Queue (DLQ)', () => {
  beforeEach(() => {
    notificationWorker.dispatchedNotifications.clear();
    jest.clearAllMocks();
  });

  it('should reject malformed jobs missing orderId without crashing the process', async () => {
    const malformedJob = {
      id: 'job-malformed-1',
      data: {
        totalAmount: 100
        // missing orderId
      }
    };

    await expect(notificationWorker.processJob(malformedJob)).rejects.toThrow(
      /Malformed notification job: missing required orderId/
    );
  });

  it('should reject completely empty or null job payload gracefully', async () => {
    await expect(notificationWorker.processJob(null)).rejects.toThrow(
      /Malformed notification job: missing required orderId/
    );
  });

  it('should process valid job and record it in the idempotency set', async () => {
    const validJob = {
      id: 'job-valid-1',
      data: {
        orderId: 'order-valid-123',
        orderNumber: 'ORD-12345',
        recipientEmail: 'customer@example.com',
        totalAmount: '49.99',
        currency: 'USD'
      }
    };

    const result = await notificationWorker.processJob(validJob);

    expect(result.success).toBe(true);
    expect(result.notification.orderId).toBe('order-valid-123');
    expect(notificationWorker.dispatchedNotifications.has('notif:order-valid-123')).toBe(true);
  });

  it('should skip duplicate job execution when notification was already dispatched (Idempotency)', async () => {
    const job = {
      id: 'job-dup-1',
      data: {
        orderId: 'order-dup-123',
        orderNumber: 'ORD-DUP-123',
        recipientEmail: 'customer@example.com',
        totalAmount: '49.99',
        currency: 'USD'
      }
    };

    // First run
    const result1 = await notificationWorker.processJob(job);
    expect(result1.success).toBe(true);

    // Second run (simulating BullMQ redelivery or retry after timeout)
    const result2 = await notificationWorker.processJob(job);
    expect(result2.skipped).toBe(true);
    expect(result2.reason).toBe('IDEMPOTENT_DUPLICATE_SKIPPED');
  });

  it('should safely return null and log warning when queue enqueuing fails due to Redis offline', async () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    // Force queue.add to throw simulated Redis connection error
    if (notificationQueue.queue) {
      jest.spyOn(notificationQueue.queue, 'add').mockRejectedValueOnce(new Error('Connection lost to Redis'));
    }

    const job = await notificationQueue.addOrderConfirmationJob({
      orderId: 'order-offline-test',
      orderNumber: 'ORD-OFFLINE',
      recipientEmail: 'offline@example.com',
      totalAmount: '99.99'
    });

    // In test mode without Redis or on error, it gracefully fails open
    expect(job).toBeNull();

    warnSpy.mockRestore();
  });
});
