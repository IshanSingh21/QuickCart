const notificationQueue = require('../../src/jobs/notification.queue');
const redisClient = require('../../src/lib/redis');

describe('Notification Queue Unit Tests', () => {
  afterAll(async () => {
    await notificationQueue.close();
  });

  it('should gracefully handle order confirmation job enqueue when Redis is offline', async () => {
    // When Redis is offline, addOrderConfirmationJob should not throw an exception
    const job = await notificationQueue.addOrderConfirmationJob({
      orderId: 'test-order-123',
      orderNumber: 'ORD-TEST-123',
      userId: 'test-user-123',
      recipientEmail: 'user@example.com',
      totalAmount: '99.98',
      currency: 'USD'
    });

    // In test environment without active Redis, gracefully returns null
    expect(job === null || typeof job === 'object').toBe(true);
  });

  it('should format deterministic jobId to guarantee queue-level idempotency', async () => {
    const mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'order-notification-ord-abc' })
    };

    const origQueue = notificationQueue.queue;
    const origAvailable = redisClient.isAvailable;

    notificationQueue.queue = mockQueue;
    redisClient.isAvailable = () => true;

    const job = await notificationQueue.addOrderConfirmationJob({
      orderId: 'ord-abc',
      orderNumber: 'ORD-ABC',
      totalAmount: '50.00',
      currency: 'USD'
    });

    expect(job).not.toBeNull();
    expect(mockQueue.add).toHaveBeenCalledWith(
      'order-confirmation',
      expect.objectContaining({ orderId: 'ord-abc' }),
      expect.objectContaining({
        jobId: 'order-notification-ord-abc',
        attempts: 3,
        backoff: expect.objectContaining({ type: 'exponential', delay: 1000 })
      })
    );

    notificationQueue.queue = origQueue;
    redisClient.isAvailable = origAvailable;
  });
});
