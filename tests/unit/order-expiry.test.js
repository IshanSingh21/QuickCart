const mockPrisma = {
  order: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  product: {
    update: jest.fn()
  },
  inventory: {
    create: jest.fn()
  },
  $transaction: jest.fn(async (callback) => await callback(mockPrisma))
};

jest.mock('../../src/lib/prisma', () => mockPrisma);

const orderExpiryQueue = require('../../src/jobs/order-expiry.queue');
const orderExpiryWorker = require('../../src/jobs/order-expiry.worker');
const redisClient = require('../../src/lib/redis');

describe('Order Expiry Queue & Worker Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockPrisma));
  });

  afterAll(async () => {
    await orderExpiryQueue.close();
    await orderExpiryWorker.close();
  });

  describe('OrderExpiryQueue', () => {
    it('should gracefully handle job enqueue when Redis is offline', async () => {
      const job = await orderExpiryQueue.addOrderExpiryJob({
        orderId: 'test-order-uuid',
        orderNumber: 'ORD-TEST-123'
      });

      // In test mode without active Redis, gracefully returns null without throwing
      expect(job === null || typeof job === 'object').toBe(true);
    });

    it('should format deterministic jobId and apply 15-minute delay', async () => {
      const mockQueue = {
        add: jest.fn().mockResolvedValue({ id: 'order-expiry-order-123' })
      };

      const origQueue = orderExpiryQueue.queue;
      const origAvailable = redisClient.isAvailable;

      orderExpiryQueue.queue = mockQueue;
      redisClient.isAvailable = () => true;

      const job = await orderExpiryQueue.addOrderExpiryJob({
        orderId: 'order-123',
        orderNumber: 'ORD-123'
      });

      expect(job).not.toBeNull();
      expect(mockQueue.add).toHaveBeenCalledWith(
        'order-expiry',
        { orderId: 'order-123', orderNumber: 'ORD-123' },
        expect.objectContaining({
          jobId: 'order-expiry-order-123',
          delay: 15 * 60 * 1000,
          attempts: 3,
          backoff: expect.objectContaining({ type: 'exponential', delay: 1000 })
        })
      );

      orderExpiryQueue.queue = origQueue;
      redisClient.isAvailable = origAvailable;
    });
  });

  describe('OrderExpiryWorker', () => {
    it('should reject malformed jobs missing orderId', async () => {
      await expect(orderExpiryWorker.processJob({ data: {} })).rejects.toThrow(
        /Malformed order expiry job: missing required orderId/
      );
    });

    it('should skip processing if order is not found', async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce(null);

      const result = await orderExpiryWorker.processJob({
        id: 'job-1',
        data: { orderId: 'non-existent-order', orderNumber: 'ORD-NONE' }
      });

      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('ORDER_NOT_FOUND');
    });

    it('should skip processing if order is already PAID', async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: 'order-paid-1',
        orderNumber: 'ORD-PAID-1',
        status: 'PAID',
        items: []
      });

      const result = await orderExpiryWorker.processJob({
        id: 'job-2',
        data: { orderId: 'order-paid-1', orderNumber: 'ORD-PAID-1' }
      });

      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('ORDER_NOT_PENDING');
      expect(result.currentStatus).toBe('PAID');
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it('should transition PENDING_PAYMENT order to EXPIRED and restock inventory atomically', async () => {
      const mockOrder = {
        id: 'order-pending-1',
        orderNumber: 'ORD-PEND-1',
        status: 'PENDING_PAYMENT',
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            quantity: 2
          }
        ]
      };

      mockPrisma.order.findUnique.mockResolvedValueOnce(mockOrder);
      mockPrisma.order.update.mockResolvedValueOnce({
        id: 'order-pending-1',
        status: 'EXPIRED'
      });
      mockPrisma.product.update.mockResolvedValueOnce({
        id: 'prod-1',
        stock: 12
      });
      mockPrisma.inventory.create.mockResolvedValueOnce({
        id: 'inv-1',
        productId: 'prod-1',
        changeType: 'EXPIRATION_RELEASE',
        quantityDelta: 2
      });

      const result = await orderExpiryWorker.processJob({
        id: 'job-3',
        data: { orderId: 'order-pending-1', orderNumber: 'ORD-PEND-1' }
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('EXPIRED');

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-pending-1' },
        data: { status: 'EXPIRED' }
      });

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: {
          stock: { increment: 2 },
          version: { increment: 1 }
        }
      });

      expect(mockPrisma.inventory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          productId: 'prod-1',
          orderId: 'order-pending-1',
          changeType: 'EXPIRATION_RELEASE',
          quantityDelta: 2,
          remainingStock: 12
        })
      });
    });
  });
});
