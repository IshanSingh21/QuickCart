const notificationWorker = require('../../src/jobs/notification.worker');

describe('Notification Worker (Background Job Processor)', () => {
  beforeEach(() => {
    notificationWorker.dispatchedNotifications.clear();
  });

  afterAll(async () => {
    await notificationWorker.close();
  });

  it('should process order confirmation job and record notification dispatch', async () => {
    const mockJob = {
      id: 'job-1',
      data: {
        orderId: 'ord-1234-uuid',
        orderNumber: 'ORD-20261103-A1B2',
        recipientEmail: 'customer@example.com',
        totalAmount: '149.99',
        currency: 'USD'
      }
    };

    const result = await notificationWorker.processJob(mockJob);

    expect(result.success).toBe(true);
    expect(result.notification).toHaveProperty('deliveredAt');
    expect(result.notification.orderId).toBe('ord-1234-uuid');
    expect(result.notification.recipient).toBe('customer@example.com');
  });

  it('should be strictly idempotent: skip dispatch on redelivery of the same order notification', async () => {
    const mockJob = {
      id: 'job-repeat',
      data: {
        orderId: 'ord-duplicate-check',
        orderNumber: 'ORD-DUP-001',
        totalAmount: '49.99',
        currency: 'USD'
      }
    };

    // First execution succeeds
    const firstResult = await notificationWorker.processJob(mockJob);
    expect(firstResult.success).toBe(true);

    // Second execution with same orderId is safely skipped (idempotent guard)
    const secondResult = await notificationWorker.processJob(mockJob);
    expect(secondResult.skipped).toBe(true);
    expect(secondResult.reason).toBe('IDEMPOTENT_DUPLICATE_SKIPPED');
  });

  it('should throw error when simulated failure is requested to trigger bounded retries', async () => {
    const mockJob = {
      id: 'job-fail',
      data: {
        orderId: 'ord-fail-1',
        orderNumber: 'ORD-FAIL-001',
        simulateFailure: true
      }
    };

    await expect(notificationWorker.processJob(mockJob)).rejects.toThrow(
      /Simulated notification delivery failure/
    );
  });
});
