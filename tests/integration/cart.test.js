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
    findUnique: jest.fn()
  },
  $transaction: jest.fn((callback) =>
    callback({
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
        findUnique: jest.fn()
      }
    })
  )
}));

const request = require('supertest');
const prisma = require('../../src/lib/prisma');
const app = require('../../src/app');
const { generateAccessToken } = require('../../src/utils/token');

describe('Shopping Cart API (/api/v1/cart)', () => {
  const userAId = '11111111-1111-1111-1111-111111111111';
  const userBId = '22222222-2222-2222-2222-222222222222';
  const cartAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const cartBId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const productId = '33333333-3333-3333-3333-333333333333';
  const itemAId = '44444444-4444-4444-4444-444444444444';
  const itemBId = '55555555-5555-5555-5555-555555555555';

  let tokenUserA;
  let tokenUserB;

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
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication & Access Control', () => {
    it('should return 401 Unauthorized when viewing cart without token', async () => {
      const res = await request(app).get('/api/v1/cart');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 Unauthorized when adding items without token', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .send({ productId, quantity: 1 });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/cart (View Current Cart & Server-Side Price Lookup)', () => {
    it('should return 200 with user cart and authoritative live product pricing', async () => {
      const mockProduct = {
        id: productId,
        name: 'Wireless Headphones',
        slug: 'wireless-headphones',
        sku: 'WH-001',
        price: new Prisma.Decimal(299.99),
        stock: 15,
        isActive: true,
        category: { id: 'cat-1', name: 'Audio', slug: 'audio' },
        images: [{ url: 'https://img.test/wh.jpg', isPrimary: true }]
      };

      prisma.cart.findUnique
        .mockResolvedValueOnce({ id: cartAId, userId: userAId })
        .mockResolvedValueOnce({
          id: cartAId,
          userId: userAId,
          items: [
            {
              id: itemAId,
              quantity: 2,
              product: mockProduct
            }
          ]
        });

      const res = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cartId).toBe(cartAId);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].currentPrice).toBe('299.99');
      expect(res.body.data.items[0].lineTotal).toBe('599.98');
      expect(res.body.data.items[0].isAvailable).toBe(true);
      expect(res.body.data.subtotal).toBe('599.98');
      expect(res.body.data.itemCount).toBe(2);
    });

    it('should return empty cart with subtotal 0.00 when user has no items', async () => {
      prisma.cart.findUnique
        .mockResolvedValueOnce({ id: cartAId, userId: userAId })
        .mockResolvedValueOnce({
          id: cartAId,
          userId: userAId,
          items: []
        });

      const res = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(0);
      expect(res.body.data.subtotal).toBe('0.00');
      expect(res.body.data.itemCount).toBe(0);
    });
  });

  describe('POST /api/v1/cart/items (Server-Side Price Authority & Validation)', () => {
    it('should reject client-supplied price and compute lineTotal strictly from database record', async () => {
      const actualDatabasePrice = 149.99;
      const mockProduct = {
        id: productId,
        name: 'Smart Watch',
        slug: 'smart-watch',
        sku: 'SW-001',
        price: new Prisma.Decimal(actualDatabasePrice),
        stock: 10,
        isActive: true,
        images: []
      };

      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          product: { findUnique: jest.fn().mockResolvedValue(mockProduct) },
          cart: {
            findUnique: jest.fn()
              .mockResolvedValueOnce({ id: cartAId, userId: userAId })
              .mockResolvedValueOnce({
                id: cartAId,
                userId: userAId,
                items: [{ id: itemAId, quantity: 2, product: mockProduct }]
              })
          },
          cartItem: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: itemAId })
          }
        };
        return callback(tx);
      });

      // Malicious client attempts to pass price: 0.01 and discount: 100
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          productId,
          quantity: 2,
          price: 0.01,
          discount: 100,
          userId: 'hacked-id'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.items[0].currentPrice).toBe('149.99'); // Authoritative DB price
      expect(res.body.data.items[0].lineTotal).toBe('299.98'); // 149.99 * 2
      expect(res.body.data.subtotal).toBe('299.98');
    });

    it('should return 400 Bad Request when quantity is 0 or negative', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ productId, quantity: 0 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 Bad Request when quantity exceeds maximum allowed (100)', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ productId, quantity: 101 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 Bad Request when productId is not a valid UUID', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ productId: 'invalid-id', quantity: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 Not Found when product does not exist or is inactive', async () => {
      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          product: { findUnique: jest.fn().mockResolvedValue(null) }
        };
        return callback(tx);
      });

      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ productId, quantity: 1 });

      expect(res.status).toBe(404);
      expect(res.body.error.message).toContain('Product not found or currently unavailable');
    });

    it('should return 409 Conflict when requested quantity exceeds available stock', async () => {
      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          product: {
            findUnique: jest.fn().mockResolvedValue({
              id: productId,
              stock: 2,
              isActive: true
            })
          },
          cart: { findUnique: jest.fn().mockResolvedValue({ id: cartAId, userId: userAId }) },
          cartItem: { findUnique: jest.fn().mockResolvedValue(null) }
        };
        return callback(tx);
      });

      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ productId, quantity: 5 });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain('exceeds available stock');
    });
  });

  describe('PATCH /api/v1/cart/items/:itemId (Ownership & Quantity Updates)', () => {
    it('should prevent User A from modifying User B cart item (Ownership Enforcement -> 404)', async () => {
      // User B owns itemBId in cartBId
      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          cartItem: {
            findUnique: jest.fn().mockResolvedValue({
              id: itemBId,
              cartId: cartBId,
              cart: { userId: userBId }, // Belongs to User B!
              product: { id: productId, stock: 10, isActive: true }
            })
          }
        };
        return callback(tx);
      });

      // User A attempts to update User B's item
      const res = await request(app)
        .patch(`/api/v1/cart/items/${itemBId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ quantity: 5 });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(res.body.error.message).toContain('Cart item not found');
    });

    it('should update quantity and return recalculation when item belongs to user', async () => {
      const mockProduct = {
        id: productId,
        name: 'Keyboard',
        price: new Prisma.Decimal(80.0),
        stock: 10,
        isActive: true,
        images: []
      };

      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          cartItem: {
            findUnique: jest.fn().mockResolvedValue({
              id: itemAId,
              cartId: cartAId,
              cart: { userId: userAId },
              product: mockProduct
            }),
            update: jest.fn()
          },
          cart: {
            findUnique: jest.fn().mockResolvedValue({
              id: cartAId,
              items: [{ id: itemAId, quantity: 3, product: mockProduct }]
            })
          }
        };
        return callback(tx);
      });

      const res = await request(app)
        .patch(`/api/v1/cart/items/${itemAId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ quantity: 3 });

      expect(res.status).toBe(200);
      expect(res.body.data.items[0].quantity).toBe(3);
      expect(res.body.data.items[0].lineTotal).toBe('240.00'); // 80.00 * 3
      expect(res.body.data.subtotal).toBe('240.00');
    });

    it('should return 409 Conflict if updated quantity exceeds product stock', async () => {
      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          cartItem: {
            findUnique: jest.fn().mockResolvedValue({
              id: itemAId,
              cartId: cartAId,
              cart: { userId: userAId },
              product: { id: productId, stock: 2, isActive: true }
            })
          }
        };
        return callback(tx);
      });

      const res = await request(app)
        .patch(`/api/v1/cart/items/${itemAId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ quantity: 5 });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain('exceeds available stock');
    });
  });

  describe('DELETE /api/v1/cart/items/:itemId (Remove Item & Ownership)', () => {
    it('should prevent User A from deleting User B cart item (Ownership Enforcement -> 404)', async () => {
      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          cartItem: {
            findUnique: jest.fn().mockResolvedValue({
              id: itemBId,
              cart: { userId: userBId }
            })
          }
        };
        return callback(tx);
      });

      const res = await request(app)
        .delete(`/api/v1/cart/items/${itemBId}`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should remove item when owned by user and recalculate totals', async () => {
      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          cartItem: {
            findUnique: jest.fn().mockResolvedValue({
              id: itemAId,
              cartId: cartAId,
              cart: { userId: userAId }
            }),
            delete: jest.fn()
          },
          cart: {
            findUnique: jest.fn().mockResolvedValue({
              id: cartAId,
              items: []
            })
          }
        };
        return callback(tx);
      });

      const res = await request(app)
        .delete(`/api/v1/cart/items/${itemAId}`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(0);
      expect(res.body.data.subtotal).toBe('0.00');
    });
  });

  describe('DELETE /api/v1/cart (Clear Cart)', () => {
    it('should clear all items in the authenticated user cart', async () => {
      prisma.cart.findUnique.mockResolvedValue({ id: cartAId, userId: userAId });
      prisma.cartItem.deleteMany.mockResolvedValue({ count: 2 });

      const res = await request(app)
        .delete('/api/v1/cart')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Cart cleared successfully');
      expect(res.body.data.items).toEqual([]);
      expect(res.body.data.subtotal).toBe('0.00');
      expect(res.body.data.itemCount).toBe(0);
    });
  });
});
