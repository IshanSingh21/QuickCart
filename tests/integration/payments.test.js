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

const request = require('supertest');
const prisma = require('../../src/lib/prisma');
const app = require('../../src/app');
const { generateAccessToken } = require('../../src/utils/token');

describe('Payments API (/api/v1/payments)', () => {
  const userAId = '11111111-1111-1111-1111-111111111111';
  const userBId = '22222222-2222-2222-2222-222222222222';
  const adminId = '33333333-3333-3333-3333-333333333333';

  const orderAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const paymentAId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const productId1 = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

  let tokenUserA;
  let tokenUserB;
  let tokenAdmin;

  const mockOrderA = {
    id: orderAId,
    orderNumber: 'ORD-20261102-001',
    userId: userAId,
    status: 'PENDING_PAYMENT',
    subtotal: new Prisma.Decimal('99.98'),
    taxAmount: new Prisma.Decimal('0.00'),
    shippingAmount: new Prisma.Decimal('0.00'),
    totalAmount: new Prisma.Decimal('99.98'),
    currency: 'USD',
    shippingAddress: { fullName: 'Jane Doe' },
    items: [{ productId: productId1, quantity: 2 }]
  };

  beforeAll(() => {
    tokenUserA = generateAccessToken({
      id: userAId,
      email: 'usera@example.com',
      role: 'CUSTOMER'
    });

    tokenUserB = generateAccessToken({
      id: userBId,
      email: 'userb@example.com',
      role: 'CUSTOMER'
    });

    tokenAdmin = generateAccessToken({
      id: adminId,
      email: 'admin@example.com',
      role: 'ADMIN'
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication & Access Control', () => {
    it('should return 401 Unauthorized when attempting to pay without token', async () => {
      const res = await request(app)
        .post(`/api/v1/payments/orders/${orderAId}/pay`)
        .send({ paymentMethod: 'SIMULATED_CARD' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 Unauthorized when fetching order payments without token', async () => {
      const res = await request(app).get(`/api/v1/payments/orders/${orderAId}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/payments/orders/:orderId/pay (Process Payment)', () => {
    it('should successfully authorize payment, mark order PAID, and return 200 OK', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(mockOrderA);

      const initiatedPayment = {
        id: paymentAId,
        orderId: orderAId,
        paymentIntentId: 'pi_sim_123',
        idempotencyKey: 'idemp_key_123',
        provider: 'SIMULATED_GATEWAY',
        status: 'INITIATED',
        amount: new Prisma.Decimal('99.98'),
        currency: 'USD'
      };

      prisma.payment.create.mockResolvedValueOnce(initiatedPayment);

      const settledPayment = {
        ...initiatedPayment,
        status: 'SUCCEEDED',
        gatewayResponse: { status: 'SUCCEEDED', transactionId: 'txn_sim_123' },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prisma.$transaction.mockImplementationOnce(async (callback) => {
        const tx = {
          payment: {
            update: jest.fn().mockResolvedValueOnce(settledPayment)
          },
          order: {
            update: jest.fn().mockResolvedValueOnce({ ...mockOrderA, status: 'PAID' })
          }
        };
        return callback(tx);
      });

      const res = await request(app)
        .post(`/api/v1/payments/orders/${orderAId}/pay`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          paymentMethod: 'SIMULATED_CARD',
          simulateOutcome: 'SUCCESS'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orderStatus).toBe('PAID');
      expect(res.body.data.payment.status).toBe('SUCCEEDED');
      expect(res.body.data.isIdempotentReplay).toBe(false);
    });

    it('should safely return cached payment (200 OK) when request is repeated with same Idempotency-Key', async () => {
      const idempotencyKey = '7b2c5890-48e2-45e0-82a1-127392a83e01';

      const existingPayment = {
        id: paymentAId,
        orderId: orderAId,
        paymentIntentId: 'pi_sim_existing',
        idempotencyKey,
        provider: 'SIMULATED_GATEWAY',
        status: 'SUCCEEDED',
        amount: new Prisma.Decimal('99.98'),
        currency: 'USD',
        gatewayResponse: { status: 'SUCCEEDED' },
        createdAt: new Date(),
        updatedAt: new Date(),
        order: { userId: userAId, status: 'PAID' }
      };

      prisma.payment.findUnique.mockResolvedValueOnce(existingPayment);

      const res = await request(app)
        .post(`/api/v1/payments/orders/${orderAId}/pay`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({ paymentMethod: 'SIMULATED_CARD' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isIdempotentReplay).toBe(true);
      expect(res.body.data.payment.id).toBe(paymentAId);
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });

    it('should return 400 Bad Request when attempting to pay an already PAID order', async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        ...mockOrderA,
        status: 'PAID'
      });

      const res = await request(app)
        .post(`/api/v1/payments/orders/${orderAId}/pay`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ paymentMethod: 'SIMULATED_CARD' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ORDER_ALREADY_PAID');
    });

    it('should return 400 Bad Request when attempting to pay a CANCELLED order', async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        ...mockOrderA,
        status: 'CANCELLED'
      });

      const res = await request(app)
        .post(`/api/v1/payments/orders/${orderAId}/pay`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ paymentMethod: 'SIMULATED_CARD' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ORDER_CANCELLED');
    });

    it('should return 400 Bad Request when attempting to pay an EXPIRED order', async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        ...mockOrderA,
        status: 'EXPIRED'
      });

      const res = await request(app)
        .post(`/api/v1/payments/orders/${orderAId}/pay`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ paymentMethod: 'SIMULATED_CARD' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ORDER_EXPIRED');
    });

    it('should handle simulated decline without inventory release, keeping order PENDING_PAYMENT for retry', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(mockOrderA);

      const initiatedPayment = {
        id: paymentAId,
        orderId: orderAId,
        paymentIntentId: 'pi_sim_declined',
        idempotencyKey: 'idemp_key_declined',
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
              gatewayResponse: { declineCode: 'card_declined' }
            })
          }
        };
        return callback(tx);
      });

      const res = await request(app)
        .post(`/api/v1/payments/orders/${orderAId}/pay`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          paymentMethod: 'SIMULATED_CARD',
          simulateOutcome: 'CARD_DECLINED',
          releaseInventoryOnFailure: false
        });

      expect(res.status).toBe(402);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PAYMENT_FAILED');
      expect(res.body.error.details.orderStatus).toBe('PENDING_PAYMENT');
      expect(res.body.error.details.declineCode).toBe('card_declined');
    });

    it('should handle simulated decline with releaseInventoryOnFailure, cancelling order and restocking', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(mockOrderA);

      const initiatedPayment = {
        id: paymentAId,
        orderId: orderAId,
        paymentIntentId: 'pi_sim_declined_restock',
        idempotencyKey: 'idemp_key_restock',
        provider: 'SIMULATED_GATEWAY',
        status: 'INITIATED',
        amount: new Prisma.Decimal('99.98'),
        currency: 'USD'
      };

      prisma.payment.create.mockResolvedValueOnce(initiatedPayment);

      let orderCancelled = false;
      let inventoryRestocked = false;

      prisma.$transaction.mockImplementationOnce(async (callback) => {
        const tx = {
          payment: {
            update: jest.fn().mockResolvedValueOnce({
              ...initiatedPayment,
              status: 'FAILED',
              gatewayResponse: { declineCode: 'card_declined' }
            })
          },
          order: {
            update: jest.fn().mockImplementation(() => {
              orderCancelled = true;
              return Promise.resolve({ ...mockOrderA, status: 'CANCELLED' });
            })
          },
          product: {
            update: jest.fn().mockImplementation(() => {
              inventoryRestocked = true;
              return Promise.resolve({ id: productId1, stock: 10 });
            })
          },
          inventory: {
            create: jest.fn().mockResolvedValueOnce({})
          }
        };
        return callback(tx);
      });

      const res = await request(app)
        .post(`/api/v1/payments/orders/${orderAId}/pay`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          paymentMethod: 'SIMULATED_CARD',
          simulateOutcome: 'CARD_DECLINED',
          releaseInventoryOnFailure: true
        });

      expect(res.status).toBe(402);
      expect(res.body.error.details.orderStatus).toBe('CANCELLED');
      expect(orderCancelled).toBe(true);
      expect(inventoryRestocked).toBe(true);
    });

    it('should return 404 Not Found when User B attempts to pay User A order (IDOR Defense)', async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        ...mockOrderA,
        userId: userAId // Belongs to User A
      });

      const res = await request(app)
        .post(`/api/v1/payments/orders/${orderAId}/pay`)
        .set('Authorization', `Bearer ${tokenUserB}`) // Requested by User B
        .send({ paymentMethod: 'SIMULATED_CARD' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Order not found/);
    });
  });

  describe('GET /api/v1/payments/orders/:orderId (Payment History)', () => {
    it('should return list of payment attempts for user order', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(mockOrderA);
      prisma.payment.findMany.mockResolvedValueOnce([
        {
          id: paymentAId,
          orderId: orderAId,
          paymentIntentId: 'pi_sim_1',
          idempotencyKey: 'idemp-1',
          provider: 'SIMULATED_GATEWAY',
          status: 'SUCCEEDED',
          amount: new Prisma.Decimal('99.98'),
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);

      const res = await request(app)
        .get(`/api/v1/payments/orders/${orderAId}`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].amount).toBe('99.98');
    });

    it('should allow ADMIN to retrieve payment history for any order', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(mockOrderA);
      prisma.payment.findMany.mockResolvedValueOnce([]);

      const res = await request(app)
        .get(`/api/v1/payments/orders/${orderAId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/payments/:id', () => {
    it('should return payment record by ID when owned by user', async () => {
      prisma.payment.findUnique.mockResolvedValueOnce({
        id: paymentAId,
        orderId: orderAId,
        paymentIntentId: 'pi_sim_1',
        idempotencyKey: 'idemp-1',
        provider: 'SIMULATED_GATEWAY',
        status: 'SUCCEEDED',
        amount: new Prisma.Decimal('99.98'),
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        order: { userId: userAId }
      });

      const res = await request(app)
        .get(`/api/v1/payments/${paymentAId}`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.payment.id).toBe(paymentAId);
    });

    it('should return 404 Not Found when payment belongs to another user', async () => {
      prisma.payment.findUnique.mockResolvedValueOnce({
        id: paymentAId,
        orderId: orderAId,
        order: { userId: userAId } // Belongs to User A
      });

      const res = await request(app)
        .get(`/api/v1/payments/${paymentAId}`)
        .set('Authorization', `Bearer ${tokenUserB}`); // Requested by User B

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
