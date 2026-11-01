const { Prisma } = require('@prisma/client');

jest.mock('../../src/lib/prisma', () => ({
  payment: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
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
  $transaction: jest.fn((callback) =>
    callback({
      payment: {
        update: jest.fn()
      },
      order: {
        update: jest.fn()
      },
      product: {
        update: jest.fn()
      },
      inventory: {
        create: jest.fn()
      }
    })
  )
}));

const prisma = require('../../src/lib/prisma');
const paymentService = require('../../src/modules/payments/payments.service');
const AppError = require('../../src/utils/app-error');

describe('Payments Service', () => {
  const userId = '11111111-1111-1111-1111-111111111111';
  const otherUserId = '22222222-2222-2222-2222-222222222222';
  const orderId = '33333333-3333-3333-3333-333333333333';
  const paymentId = '44444444-4444-4444-4444-444444444444';
  const productId = '55555555-5555-5555-5555-555555555555';

  const mockOrder = {
    id: orderId,
    orderNumber: 'ORD-TEST-1',
    userId,
    status: 'PENDING_PAYMENT',
    totalAmount: new Prisma.Decimal('99.98'),
    currency: 'USD',
    items: [{ productId, quantity: 2 }]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatPayment', () => {
    it('should format payment amount as a 2-decimal string', () => {
      const rawPayment = {
        id: paymentId,
        orderId,
        paymentIntentId: 'pi_test_1',
        idempotencyKey: 'idemp-1',
        provider: 'SIMULATED_GATEWAY',
        status: 'SUCCEEDED',
        amount: new Prisma.Decimal('99.98'),
        currency: 'USD',
        gatewayResponse: { transactionId: 'txn_123' },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const formatted = paymentService.formatPayment(rawPayment);
      expect(formatted.amount).toBe('99.98');
      expect(formatted.status).toBe('SUCCEEDED');
    });

    it('should return null when payment is null', () => {
      expect(paymentService.formatPayment(null)).toBeNull();
    });
  });

  describe('processPayment', () => {
    it('should return cached payment when idempotencyKey was previously processed and SUCCEEDED', async () => {
      const existingPayment = {
        id: paymentId,
        orderId,
        paymentIntentId: 'pi_test_idem',
        idempotencyKey: 'idemp-key-succeeded',
        provider: 'SIMULATED_GATEWAY',
        status: 'SUCCEEDED',
        amount: new Prisma.Decimal('99.98'),
        currency: 'USD',
        order: { userId, status: 'PAID' }
      };

      prisma.payment.findUnique.mockResolvedValueOnce(existingPayment);

      const result = await paymentService.processPayment(userId, orderId, {
        idempotencyKey: 'idemp-key-succeeded'
      });

      expect(result.isIdempotentReplay).toBe(true);
      expect(result.payment.id).toBe(paymentId);
      expect(result.orderStatus).toBe('PAID');
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });

    it('should throw 409 Conflict if idempotencyKey belongs to a different user', async () => {
      const existingPayment = {
        id: paymentId,
        orderId,
        idempotencyKey: 'idemp-key-stolen',
        order: { userId: otherUserId, status: 'PAID' }
      };

      prisma.payment.findUnique.mockResolvedValueOnce(existingPayment);

      await expect(
        paymentService.processPayment(userId, orderId, {
          idempotencyKey: 'idemp-key-stolen'
        })
      ).rejects.toThrow(AppError);
    });

    it('should throw 409 Conflict if payment with idempotencyKey is currently INITIATED (in-flight)', async () => {
      const existingPayment = {
        id: paymentId,
        orderId,
        idempotencyKey: 'idemp-key-in-flight',
        status: 'INITIATED',
        order: { userId, status: 'PENDING_PAYMENT' }
      };

      prisma.payment.findUnique.mockResolvedValueOnce(existingPayment);

      await expect(
        paymentService.processPayment(userId, orderId, {
          idempotencyKey: 'idemp-key-in-flight'
        })
      ).rejects.toThrow(/currently processing/);
    });

    it('should throw 404 Not Found if order does not exist or belongs to another user (IDOR protection)', async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        id: orderId,
        userId: otherUserId
      });

      await expect(
        paymentService.processPayment(userId, orderId)
      ).rejects.toThrow(AppError);
    });

    it('should throw 400 Bad Request when attempting to pay an already PAID order', async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        ...mockOrder,
        status: 'PAID'
      });

      await expect(
        paymentService.processPayment(userId, orderId)
      ).rejects.toThrow(/already been paid/);
    });

    it('should throw 400 Bad Request when attempting to pay a CANCELLED order', async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        ...mockOrder,
        status: 'CANCELLED'
      });

      await expect(
        paymentService.processPayment(userId, orderId)
      ).rejects.toThrow(/cancelled order/);
    });

    it('should throw 400 Bad Request when attempting to pay an EXPIRED order', async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        ...mockOrder,
        status: 'EXPIRED'
      });

      await expect(
        paymentService.processPayment(userId, orderId)
      ).rejects.toThrow(/expired order/);
    });

    it('should successfully authorize, mark payment SUCCEEDED, and update order to PAID', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(mockOrder);

      const initiatedPayment = {
        id: paymentId,
        orderId,
        paymentIntentId: 'pi_test_success',
        idempotencyKey: 'idemp-test-success',
        provider: 'SIMULATED_GATEWAY',
        status: 'INITIATED',
        amount: new Prisma.Decimal('99.98'),
        currency: 'USD'
      };

      prisma.payment.create.mockResolvedValueOnce(initiatedPayment);

      const settledPayment = {
        ...initiatedPayment,
        status: 'SUCCEEDED',
        gatewayResponse: { status: 'SUCCEEDED', transactionId: 'txn_123' }
      };

      prisma.$transaction.mockImplementationOnce(async (callback) => {
        const tx = {
          payment: {
            update: jest.fn().mockResolvedValueOnce(settledPayment)
          },
          order: {
            update: jest.fn().mockResolvedValueOnce({ ...mockOrder, status: 'PAID' })
          }
        };
        return callback(tx);
      });

      const result = await paymentService.processPayment(userId, orderId, {
        simulateOutcome: 'SUCCESS'
      });

      expect(result.orderStatus).toBe('PAID');
      expect(result.payment.status).toBe('SUCCEEDED');
      expect(result.isIdempotentReplay).toBe(false);
    });

    it('should handle simulated decline without inventory release, keeping order in PENDING_PAYMENT', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(mockOrder);

      const initiatedPayment = {
        id: paymentId,
        orderId,
        paymentIntentId: 'pi_test_declined',
        idempotencyKey: 'idemp-test-declined',
        provider: 'SIMULATED_GATEWAY',
        status: 'INITIATED',
        amount: new Prisma.Decimal('99.98'),
        currency: 'USD'
      };

      prisma.payment.create.mockResolvedValueOnce(initiatedPayment);

      prisma.$transaction.mockImplementationOnce(async (callback) => {
        const tx = {
          payment: {
            update: jest.fn().mockResolvedValueOnce({
              ...initiatedPayment,
              status: 'FAILED',
              gatewayResponse: { status: 'FAILED', declineCode: 'card_declined' }
            })
          }
        };
        return callback(tx);
      });

      await expect(
        paymentService.processPayment(userId, orderId, {
          simulateOutcome: 'CARD_DECLINED',
          releaseInventoryOnFailure: false
        })
      ).rejects.toThrow(/Payment failed/);
    });

    it('should handle simulated decline with releaseInventoryOnFailure, cancelling order and restocking', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(mockOrder);

      const initiatedPayment = {
        id: paymentId,
        orderId,
        paymentIntentId: 'pi_test_declined_restock',
        idempotencyKey: 'idemp-test-declined-restock',
        provider: 'SIMULATED_GATEWAY',
        status: 'INITIATED',
        amount: new Prisma.Decimal('99.98'),
        currency: 'USD'
      };

      prisma.payment.create.mockResolvedValueOnce(initiatedPayment);

      let orderCancelled = false;
      let productRestocked = false;
      let inventoryRecordCreated = false;

      prisma.$transaction.mockImplementationOnce(async (callback) => {
        const tx = {
          payment: {
            update: jest.fn().mockResolvedValueOnce({
              ...initiatedPayment,
              status: 'FAILED'
            })
          },
          order: {
            update: jest.fn().mockImplementation(() => {
              orderCancelled = true;
              return Promise.resolve({ ...mockOrder, status: 'CANCELLED' });
            })
          },
          product: {
            update: jest.fn().mockImplementation(() => {
              productRestocked = true;
              return Promise.resolve({ id: productId, stock: 12 });
            })
          },
          inventory: {
            create: jest.fn().mockImplementation(() => {
              inventoryRecordCreated = true;
              return Promise.resolve({});
            })
          }
        };
        return callback(tx);
      });

      await expect(
        paymentService.processPayment(userId, orderId, {
          simulateOutcome: 'CARD_DECLINED',
          releaseInventoryOnFailure: true
        })
      ).rejects.toThrow(/Payment failed/);

      expect(orderCancelled).toBe(true);
      expect(productRestocked).toBe(true);
      expect(inventoryRecordCreated).toBe(true);
    });
  });

  describe('getOrderPayments', () => {
    it('should return payments list for order when owned by user', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(mockOrder);
      prisma.payment.findMany.mockResolvedValueOnce([
        {
          id: paymentId,
          orderId,
          amount: new Prisma.Decimal('99.98'),
          status: 'SUCCEEDED'
        }
      ]);

      const result = await paymentService.getOrderPayments(userId, orderId);
      expect(result.length).toBe(1);
      expect(result[0].amount).toBe('99.98');
    });

    it('should throw 404 when order belongs to another user', async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        id: orderId,
        userId: otherUserId
      });

      await expect(
        paymentService.getOrderPayments(userId, orderId)
      ).rejects.toThrow(AppError);
    });
  });
});
