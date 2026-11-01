const { Prisma } = require('@prisma/client');

jest.mock('../../src/lib/prisma', () => ({
  cart: {
    findUnique: jest.fn(),
    create: jest.fn()
  },
  cartItem: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn()
  },
  product: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  order: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  inventory: {
    create: jest.fn()
  },
  $transaction: jest.fn((callback) =>
    callback({
      product: {
        findUnique: jest.fn(),
        update: jest.fn()
      },
      order: {
        create: jest.fn(),
        update: jest.fn()
      },
      inventory: {
        create: jest.fn()
      },
      cartItem: {
        deleteMany: jest.fn()
      }
    })
  )
}));

const request = require('supertest');
const prisma = require('../../src/lib/prisma');
const app = require('../../src/app');
const { generateAccessToken } = require('../../src/utils/token');

describe('Orders API (/api/v1/orders)', () => {
  const userAId = '11111111-1111-1111-1111-111111111111';
  const userBId = '22222222-2222-2222-2222-222222222222';
  const adminId = '33333333-3333-3333-3333-333333333333';

  const cartAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const orderAId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const productId1 = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  const productId2 = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

  let tokenUserA;
  let tokenUserB;
  let tokenAdmin;

  const validShippingAddress = {
    fullName: 'Jane Doe',
    addressLine1: '123 Market St',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94105',
    country: 'US',
    phone: '+14155550199'
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
    it('should return 401 Unauthorized when checking out without token', async () => {
      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .send({ shippingAddress: validShippingAddress });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 Unauthorized when retrieving orders without token', async () => {
      const res = await request(app).get('/api/v1/orders');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 Unauthorized when retrieving specific order without token', async () => {
      const res = await request(app).get(`/api/v1/orders/${orderAId}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/orders/checkout (Order Creation & Validation)', () => {
    it('should return 400 Bad Request when shipping address is missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          shippingAddress: {
            fullName: 'Jane Doe'
            // missing addressLine1, city, state, postalCode, country
          }
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 Bad Request when user cart is empty', async () => {
      prisma.cart.findUnique.mockResolvedValueOnce({
        id: cartAId,
        userId: userAId,
        items: []
      });

      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ shippingAddress: validShippingAddress });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Cannot checkout with an empty cart/);
    });

    it('should successfully checkout, snapshot live prices, decrement stock, and return 201 Created', async () => {
      prisma.cart.findUnique.mockResolvedValueOnce({
        id: cartAId,
        userId: userAId,
        items: [
          {
            id: 'cart-item-1',
            productId: productId1,
            quantity: 2,
            product: {
              id: productId1,
              name: 'Gaming Mouse',
              sku: 'GM-100',
              price: '49.99',
              stock: 15,
              isActive: true
            }
          }
        ]
      });

      const mockCreatedOrder = {
        id: orderAId,
        orderNumber: 'ORD-20261101-ABCD1',
        userId: userAId,
        status: 'PENDING_PAYMENT',
        subtotal: new Prisma.Decimal('99.98'),
        taxAmount: new Prisma.Decimal('0.00'),
        shippingAmount: new Prisma.Decimal('0.00'),
        totalAmount: new Prisma.Decimal('99.98'),
        currency: 'USD',
        shippingAddress: validShippingAddress,
        items: [
          {
            id: 'oi-1',
            productId: productId1,
            productName: 'Gaming Mouse',
            productSku: 'GM-100',
            unitPrice: new Prisma.Decimal('49.99'),
            quantity: 2,
            lineTotal: new Prisma.Decimal('99.98'),
            createdAt: new Date()
          }
        ]
      };

      let inventoryCreated = false;
      let cartItemsDeleted = false;

      prisma.$transaction.mockImplementationOnce(async (callback) => {
        const tx = {
          product: {
            findUnique: jest.fn().mockResolvedValueOnce({
              id: productId1,
              name: 'Gaming Mouse',
              sku: 'GM-100',
              price: new Prisma.Decimal('49.99'),
              stock: 15,
              isActive: true
            }),
            update: jest.fn().mockResolvedValueOnce({
              id: productId1,
              stock: 13
            })
          },
          inventory: {
            create: jest.fn().mockImplementation(() => {
              inventoryCreated = true;
              return Promise.resolve({});
            })
          },
          order: {
            create: jest.fn().mockResolvedValueOnce(mockCreatedOrder)
          },
          cartItem: {
            deleteMany: jest.fn().mockImplementation(() => {
              cartItemsDeleted = true;
              return Promise.resolve({ count: 1 });
            })
          }
        };
        return callback(tx);
      });

      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ shippingAddress: validShippingAddress });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order.id).toBe(orderAId);
      expect(res.body.data.order.status).toBe('PENDING_PAYMENT');
      expect(res.body.data.order.subtotal).toBe('99.98');
      expect(res.body.data.order.totalAmount).toBe('99.98');
      expect(res.body.data.order.items[0].unitPrice).toBe('49.99');
      expect(inventoryCreated).toBe(true);
      expect(cartItemsDeleted).toBe(true);
    });
  });

  describe('Insufficient Stock & Transaction Rollback', () => {
    it('should return 409 Conflict and roll back transaction when an item has insufficient stock', async () => {
      prisma.cart.findUnique.mockResolvedValueOnce({
        id: cartAId,
        userId: userAId,
        items: [
          {
            id: 'cart-item-1',
            productId: productId1,
            quantity: 5,
            product: {
              id: productId1,
              name: 'Scarce Item',
              price: '100.00',
              stock: 2, // Stock is less than requested 5
              isActive: true
            }
          }
        ]
      });

      prisma.$transaction.mockImplementationOnce(async (callback) => {
        const tx = {
          product: {
            findUnique: jest.fn().mockResolvedValueOnce({
              id: productId1,
              name: 'Scarce Item',
              price: new Prisma.Decimal('100.00'),
              stock: 2,
              isActive: true
            })
          }
        };
        return callback(tx);
      });

      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ shippingAddress: validShippingAddress });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Insufficient stock/);
    });
  });

  describe('Idempotency & Repeated Requests', () => {
    it('should return existing order (200 OK) when request is repeated with same Idempotency-Key', async () => {
      const idempotencyKey = '7b2c5890-48e2-45e0-82a1-127392a83e01';

      const existingOrder = {
        id: orderAId,
        orderNumber: 'ORD-IDEMPOTENT-123',
        userId: userAId,
        status: 'PENDING_PAYMENT',
        subtotal: new Prisma.Decimal('49.99'),
        taxAmount: new Prisma.Decimal('0.00'),
        shippingAmount: new Prisma.Decimal('0.00'),
        totalAmount: new Prisma.Decimal('49.99'),
        currency: 'USD',
        idempotencyKey,
        shippingAddress: validShippingAddress,
        items: [
          {
            id: 'oi-1',
            productId: productId1,
            productName: 'Gaming Mouse',
            productSku: 'GM-100',
            unitPrice: new Prisma.Decimal('49.99'),
            quantity: 1,
            lineTotal: new Prisma.Decimal('49.99'),
            createdAt: new Date()
          }
        ],
        payments: []
      };

      prisma.order.findUnique.mockResolvedValueOnce(existingOrder);

      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({ shippingAddress: validShippingAddress });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order.id).toBe(orderAId);
      expect(res.body.data.order.idempotencyKey).toBe(idempotencyKey);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('Concurrent Purchases (Race Condition Test)', () => {
    it('should allow only one checkout to succeed and reject concurrent attempt when stock is 1', async () => {
      let currentStock = 1;

      // Mock cart for User A
      prisma.cart.findUnique.mockResolvedValue({
        id: cartAId,
        userId: userAId,
        items: [
          {
            id: 'cart-item-1',
            productId: productId1,
            quantity: 1,
            product: { id: productId1, name: 'Rare Collectible', price: '200.00', stock: 1, isActive: true }
          }
        ]
      });

      // Simulate transactional atomic decrement
      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          product: {
            findUnique: jest.fn().mockImplementation(() =>
              Promise.resolve({
                id: productId1,
                name: 'Rare Collectible',
                sku: 'RARE-01',
                price: new Prisma.Decimal('200.00'),
                stock: currentStock,
                isActive: true
              })
            ),
            update: jest.fn().mockImplementation(() => {
              if (currentStock < 1) {
                throw new Error('Stock cannot be negative');
              }
              currentStock -= 1;
              return Promise.resolve({ id: productId1, stock: currentStock });
            })
          },
          inventory: { create: jest.fn().mockResolvedValue({}) },
          order: {
            create: jest.fn().mockResolvedValue({
              id: orderAId,
              orderNumber: 'ORD-RACE-WINNER',
              userId: userAId,
              status: 'PENDING_PAYMENT',
              subtotal: new Prisma.Decimal('200.00'),
              taxAmount: new Prisma.Decimal('0.00'),
              shippingAmount: new Prisma.Decimal('0.00'),
              totalAmount: new Prisma.Decimal('200.00'),
              currency: 'USD',
              shippingAddress: validShippingAddress,
              items: []
            })
          },
          cartItem: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) }
        };

        return callback(tx);
      });

      // Execute two checkout requests in parallel
      const [res1, res2] = await Promise.all([
        request(app)
          .post('/api/v1/orders/checkout')
          .set('Authorization', `Bearer ${tokenUserA}`)
          .send({ shippingAddress: validShippingAddress }),
        request(app)
          .post('/api/v1/orders/checkout')
          .set('Authorization', `Bearer ${tokenUserA}`)
          .send({ shippingAddress: validShippingAddress })
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([201, 409]);
      expect(currentStock).toBe(0);
    });
  });

  describe('GET /api/v1/orders (Order History)', () => {
    it('should return paginated order history for the authenticated user', async () => {
      const mockOrders = [
        {
          id: orderAId,
          orderNumber: 'ORD-HIST-1',
          userId: userAId,
          status: 'PENDING_PAYMENT',
          subtotal: new Prisma.Decimal('50.00'),
          taxAmount: new Prisma.Decimal('0.00'),
          shippingAmount: new Prisma.Decimal('0.00'),
          totalAmount: new Prisma.Decimal('50.00'),
          currency: 'USD',
          shippingAddress: validShippingAddress,
          items: []
        }
      ];

      prisma.order.findMany.mockResolvedValueOnce(mockOrders);
      prisma.order.count.mockResolvedValueOnce(1);

      const res = await request(app)
        .get('/api/v1/orders?page=1&limit=10')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.meta.total).toBe(1);
    });
  });

  describe('GET /api/v1/orders/:id (Ownership & IDOR Protection)', () => {
    it('should return order details when owned by requesting user', async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        id: orderAId,
        orderNumber: 'ORD-1',
        userId: userAId,
        status: 'PENDING_PAYMENT',
        subtotal: new Prisma.Decimal('50.00'),
        taxAmount: new Prisma.Decimal('0.00'),
        shippingAmount: new Prisma.Decimal('0.00'),
        totalAmount: new Prisma.Decimal('50.00'),
        currency: 'USD',
        shippingAddress: validShippingAddress,
        items: []
      });

      const res = await request(app)
        .get(`/api/v1/orders/${orderAId}`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.order.id).toBe(orderAId);
    });

    it('should return 404 Not Found when User B attempts to access User A order (IDOR Defense)', async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        id: orderAId,
        userId: userAId // Belongs to User A
      });

      const res = await request(app)
        .get(`/api/v1/orders/${orderAId}`)
        .set('Authorization', `Bearer ${tokenUserB}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Order not found/);
    });

    it('should allow ADMIN to view any order', async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        id: orderAId,
        orderNumber: 'ORD-1',
        userId: userAId,
        status: 'PENDING_PAYMENT',
        subtotal: new Prisma.Decimal('50.00'),
        taxAmount: new Prisma.Decimal('0.00'),
        shippingAmount: new Prisma.Decimal('0.00'),
        totalAmount: new Prisma.Decimal('50.00'),
        currency: 'USD',
        shippingAddress: validShippingAddress,
        items: []
      });

      const res = await request(app)
        .get(`/api/v1/orders/${orderAId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
      expect(res.body.data.order.id).toBe(orderAId);
    });
  });

  describe('PATCH /api/v1/orders/:id/cancel (Cancellation & Inventory Restock)', () => {
    it('should cancel PENDING_PAYMENT order and restock inventory', async () => {
      const mockOrder = {
        id: orderAId,
        orderNumber: 'ORD-CANCEL-100',
        userId: userAId,
        status: 'PENDING_PAYMENT',
        items: [{ productId: productId1, quantity: 2 }]
      };

      prisma.order.findUnique.mockResolvedValueOnce(mockOrder);

      prisma.$transaction.mockImplementationOnce(async (callback) => {
        const tx = {
          order: {
            update: jest.fn().mockResolvedValueOnce({
              ...mockOrder,
              status: 'CANCELLED',
              subtotal: new Prisma.Decimal('100.00'),
              taxAmount: new Prisma.Decimal('0.00'),
              shippingAmount: new Prisma.Decimal('0.00'),
              totalAmount: new Prisma.Decimal('100.00'),
              currency: 'USD',
              shippingAddress: validShippingAddress,
              items: []
            })
          },
          product: {
            update: jest.fn().mockResolvedValueOnce({ id: productId1, stock: 12 })
          },
          inventory: {
            create: jest.fn().mockResolvedValueOnce({})
          }
        };
        return callback(tx);
      });

      const res = await request(app)
        .patch(`/api/v1/orders/${orderAId}/cancel`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order.status).toBe('CANCELLED');
    });

    it('should return 400 Bad Request when attempting to cancel non-PENDING order', async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        id: orderAId,
        userId: userAId,
        status: 'PAID'
      });

      const res = await request(app)
        .patch(`/api/v1/orders/${orderAId}/cancel`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Cannot cancel order in PAID status/);
    });
  });
});
