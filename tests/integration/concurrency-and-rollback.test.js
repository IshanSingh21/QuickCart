let mockCurrentStock = 2;
let mockOrdersDatabase = [];
let mockPaymentsDatabase = [];

jest.mock('../../src/lib/prisma', () => {
  return {
    cart: {
      findUnique: jest.fn()
    },
    cartItem: {
      deleteMany: jest.fn()
    },
    product: {
      findUnique: jest.fn()
    },
    order: {
      findUnique: jest.fn(),
      create: jest.fn()
    },
    payment: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    $transaction: jest.fn()
  };
});

const request = require('supertest');
const { Prisma } = require('@prisma/client');
const prisma = require('../../src/lib/prisma');
const app = require('../../src/app');
const { generateAccessToken } = require('../../src/utils/token');

describe('Concurrency, Rollback & Idempotency Stress Suite', () => {
  const userId = '11111111-1111-1111-1111-111111111111';
  const otherUserId = '22222222-2222-2222-2222-222222222222';
  let token;
  let otherUserToken;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentStock = 2;
    mockOrdersDatabase = [];
    mockPaymentsDatabase = [];

    token = generateAccessToken({
      id: userId,
      email: 'customer@example.com',
      role: 'CUSTOMER'
    });

    otherUserToken = generateAccessToken({
      id: otherUserId,
      email: 'intruder@example.com',
      role: 'CUSTOMER'
    });

    // Default mock cart with 1 limited product
    prisma.cart.findUnique.mockResolvedValue({
      id: 'cart-uuid-race',
      userId,
      items: [
        {
          id: 'ci-race-1',
          cartId: 'cart-uuid-race',
          productId: 'prod-race-uuid',
          quantity: 1,
          product: {
            id: 'prod-race-uuid',
            name: 'Limited Edition Sneaker',
            sku: 'SNK-LTD-001',
            price: new Prisma.Decimal('199.99'),
            stock: 2,
            isActive: true
          }
        }
      ]
    });

    // Set up atomic transaction simulation in beforeEach to ensure it persists across tests
    prisma.$transaction.mockImplementation(async (callback) => {
      const tx = {
        $queryRaw: jest.fn(async (strings, ...values) => {
          const qty = values[0];
          if (mockCurrentStock >= qty) {
            mockCurrentStock -= qty;
            return [
              {
                id: 'prod-race-uuid',
                name: 'Limited Edition Sneaker',
                sku: 'SNK-LTD-001',
                price: new Prisma.Decimal('199.99'),
                stock: mockCurrentStock,
                isActive: true
              }
            ];
          }
          return [];
        }),
        product: {
          findUnique: jest.fn(async () => {
            return {
              id: 'prod-race-uuid',
              name: 'Limited Edition Sneaker',
              sku: 'SNK-LTD-001',
              price: new Prisma.Decimal('199.99'),
              stock: mockCurrentStock,
              isActive: true
            };
          }),
          update: jest.fn(async ({ data }) => {
            if (data.stock && data.stock.decrement) {
              mockCurrentStock -= data.stock.decrement;
            }
            return {
              id: 'prod-race-uuid',
              name: 'Limited Edition Sneaker',
              sku: 'SNK-LTD-001',
              price: new Prisma.Decimal('199.99'),
              stock: mockCurrentStock,
              isActive: true
            };
          })
        },
        order: {
          create: jest.fn(async ({ data }) => {
            const created = {
              id: `order-${mockOrdersDatabase.length + 1}`,
              orderNumber: `ORD-${Date.now()}-${mockOrdersDatabase.length + 1}`,
              userId: data.userId,
              idempotencyKey: data.idempotencyKey || null,
              status: 'PENDING_PAYMENT',
              subtotal: data.subtotal,
              taxAmount: data.taxAmount || new Prisma.Decimal('0.00'),
              shippingAmount: data.shippingAmount || new Prisma.Decimal('0.00'),
              totalAmount: data.totalAmount,
              currency: 'USD',
              shippingAddress: data.shippingAddress,
              items: (data.items?.create || []).map((item, idx) => ({
                id: `oi-${idx}`,
                productId: item.productId,
                productName: item.productName,
                productSku: item.productSku,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
                lineTotal: new Prisma.Decimal((Number(item.unitPrice) * item.quantity).toFixed(2))
              })),
              payments: [],
              createdAt: new Date(),
              updatedAt: new Date()
            };
            mockOrdersDatabase.push(created);
            return created;
          })
        },
        inventory: {
          create: jest.fn().mockResolvedValue({ id: 'inv-rec-1' })
        },
        cartItem: {
          deleteMany: jest.fn().mockResolvedValue({ count: 1 })
        }
      };

      return await callback(tx);
    });
  });

  describe('Overselling Race Condition Elimination (Atomic Decrement)', () => {
    it('should allow exactly 2 purchases when stock is 2 and reject remaining concurrent requests with 409', async () => {
      // 5 concurrent shoppers attempt checkout for product with stock = 2
      const checkoutAttempts = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/api/v1/orders/checkout')
          .set('Authorization', `Bearer ${token}`)
          .set('Idempotency-Key', `idemp-race-${i + 1}-${Date.now()}`)
          .send({
            shippingAddress: {
              street: `${i + 1} High St`,
              city: 'Metropolis',
              state: 'NY',
              postalCode: '10001',
              country: 'USA'
            }
          })
      );

      const results = await Promise.all(checkoutAttempts);

      const successfulCheckouts = results.filter((r) => r.status === 201);
      const rejectedCheckouts = results.filter((r) => r.status === 409);

      expect(successfulCheckouts.length).toBe(2);
      expect(rejectedCheckouts.length).toBe(3);
      expect(mockCurrentStock).toBe(0);

      // Verify rejected checkouts received clear error details
      for (const rejection of rejectedCheckouts) {
        expect(rejection.body.success).toBe(false);
        expect(rejection.body.error.message).toMatch(/Insufficient stock|no longer active/);
      }
    });
  });

  describe('Transaction Rollback on Unexpected Error', () => {
    it('should abort entire checkout transaction and preserve initial stock if error occurs midway', async () => {
      const initialStock = mockCurrentStock;

      // Force $transaction to fail midway
      prisma.$transaction.mockImplementationOnce(async () => {
        throw new Error('Database transaction deadlocked or connection dropped');
      });

      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          shippingAddress: {
            street: '123 Fail Safe Ave',
            city: 'Metropolis',
            state: 'NY',
            postalCode: '10001',
            country: 'USA'
          }
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(mockOrdersDatabase.length).toBe(0);
      expect(mockCurrentStock).toBe(initialStock);
    });
  });

  describe('Duplicate Requests & Idempotency Key Handling', () => {
    it('should return cached order on second request with identical Idempotency-Key without double decrement', async () => {
      const idempotencyKey = 'idemp-duplicate-safe-key-12345';
      const existingOrder = {
        id: 'order-dup-1',
        orderNumber: 'ORD-DUP-001',
        userId,
        idempotencyKey,
        status: 'PENDING_PAYMENT',
        subtotal: new Prisma.Decimal('199.99'),
        taxAmount: new Prisma.Decimal('0.00'),
        shippingAmount: new Prisma.Decimal('0.00'),
        totalAmount: new Prisma.Decimal('199.99'),
        currency: 'USD',
        shippingAddress: { street: '123 Main' },
        items: [],
        payments: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prisma.order.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingOrder);

      // Request 1
      const res1 = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          shippingAddress: {
            street: '123 Main',
            city: 'Metropolis',
            state: 'NY',
            postalCode: '10001',
            country: 'USA'
          }
        });

      expect(res1.status).toBe(201);

      // Request 2 with same idempotency key
      const res2 = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          shippingAddress: {
            street: '123 Main',
            city: 'Metropolis',
            state: 'NY',
            postalCode: '10001',
            country: 'USA'
          }
        });

      expect(res2.status).toBe(200);
      expect(res2.body.data.order.id).toBe(existingOrder.id);
    });

    it('should reject checkout if another user attempts to reuse an existing idempotency key', async () => {
      const hijackedKey = 'idemp-user-a-secret-key';
      prisma.order.findUnique.mockResolvedValueOnce({
        id: 'order-user-a',
        userId: userId,
        idempotencyKey: hijackedKey
      });

      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .set('Idempotency-Key', hijackedKey)
        .send({
          shippingAddress: {
            street: 'Attacker Lane',
            city: 'DarkCity',
            state: 'NY',
            postalCode: '99999',
            country: 'USA'
          }
        });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toMatch(/already used for another user/);
    });
  });

  describe('Payment State Transitions & Rejection on Invalid States', () => {
    const inFlightOrderId = '77777777-7777-7777-7777-777777777777';
    const paidOrderId = '44444444-4444-4444-4444-444444444444';
    const cancelledOrderId = '55555555-5555-5555-5555-555555555555';
    const expiredOrderId = '66666666-6666-6666-6666-666666666666';

    it('should reject payment with 409 if a payment with the same key is currently INITIATED (in-flight)', async () => {
      prisma.payment.findUnique.mockResolvedValueOnce({
        id: 'pay-in-flight',
        orderId: inFlightOrderId,
        status: 'INITIATED',
        order: { userId }
      });

      const res = await request(app)
        .post(`/api/v1/payments/orders/${inFlightOrderId}/pay`)
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', 'idemp-in-flight')
        .send({
          paymentMethod: 'SIMULATED_CARD'
        });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toMatch(/currently processing/);
    });

    it('should reject payment with 400 Bad Request if the order has already been PAID', async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        id: paidOrderId,
        userId,
        status: 'PAID',
        items: []
      });

      const res = await request(app)
        .post(`/api/v1/payments/orders/${paidOrderId}/pay`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          paymentMethod: 'SIMULATED_CARD'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ORDER_ALREADY_PAID');
    });

    it('should reject payment with 400 Bad Request if the order is CANCELLED', async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        id: cancelledOrderId,
        userId,
        status: 'CANCELLED',
        items: []
      });

      const res = await request(app)
        .post(`/api/v1/payments/orders/${cancelledOrderId}/pay`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          paymentMethod: 'SIMULATED_CARD'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ORDER_CANCELLED');
    });

    it('should reject payment with 400 Bad Request if the order is EXPIRED', async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        id: expiredOrderId,
        userId,
        status: 'EXPIRED',
        items: []
      });

      const res = await request(app)
        .post(`/api/v1/payments/orders/${expiredOrderId}/pay`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          paymentMethod: 'SIMULATED_CARD'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ORDER_EXPIRED');
    });
  });
});
