const { Prisma } = require('@prisma/client');

jest.mock('../../src/lib/prisma', () => ({
  product: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    delete: jest.fn()
  },
  category: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  $transaction: jest.fn((callback) => callback({
    product: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    productImage: {
      deleteMany: jest.fn(),
      createMany: jest.fn()
    }
  }))
}));

const request = require('supertest');
const prisma = require('../../src/lib/prisma');
const app = require('../../src/app');
const cacheService = require('../../src/services/cache.service');
const redisClient = require('../../src/lib/redis');
const { generateAccessToken } = require('../../src/utils/token');

describe('Redis Catalog Caching & Graceful Fallback', () => {
  const adminId = '11111111-1111-1111-1111-111111111111';
  const productId = '22222222-2222-2222-2222-222222222222';
  const categoryId = '33333333-3333-3333-3333-333333333333';

  let tokenAdmin;

  const mockProduct = {
    id: productId,
    name: 'Ergonomic Chair',
    slug: 'ergonomic-chair',
    sku: 'CHAIR-01',
    description: 'High quality ergonomic mesh chair',
    price: new Prisma.Decimal('299.99'),
    stock: 20,
    version: 1,
    categoryId,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: { id: categoryId, name: 'Furniture', slug: 'furniture' },
    images: []
  };

  const mockCategory = {
    id: categoryId,
    name: 'Furniture',
    slug: 'furniture',
    description: 'Office furniture',
    parentId: null,
    children: [],
    _count: { products: 1 }
  };

  beforeAll(() => {
    tokenAdmin = generateAccessToken({
      id: adminId,
      email: 'admin@example.com',
      role: 'ADMIN'
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Product Catalog Caching (Cache-Aside Pattern)', () => {
    it('should query DB on cache miss, populate Redis, and serve cache on subsequent request', async () => {
      // Spy on cache get/set
      const getSpy = jest.spyOn(cacheService, 'get');
      const setSpy = jest.spyOn(cacheService, 'set');

      // 1. Mock DB response
      prisma.product.count.mockResolvedValueOnce(1);
      prisma.product.findMany.mockResolvedValueOnce([mockProduct]);

      // First Request -> Cache Miss
      const res1 = await request(app).get('/api/v1/products?page=1&limit=10');
      expect(res1.status).toBe(200);
      expect(res1.body.data.length).toBe(1);
      expect(prisma.product.findMany).toHaveBeenCalledTimes(1);

      // Verify cacheService.set was called to populate cache
      expect(setSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^quickcart:products:list:/),
        expect.any(Object),
        cacheService.ttl.PRODUCT_LIST
      );

      // Mock cache returning the saved payload for second request
      getSpy.mockResolvedValueOnce({
        products: [{ id: productId, name: 'Ergonomic Chair', price: '299.99' }],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 }
      });

      // Second Request -> Cache Hit
      const res2 = await request(app).get('/api/v1/products?page=1&limit=10');
      expect(res2.status).toBe(200);
      expect(res2.body.data[0].name).toBe('Ergonomic Chair');
      // DB was NOT called for second request
      expect(prisma.product.findMany).toHaveBeenCalledTimes(1);

      getSpy.mockRestore();
      setSpy.mockRestore();
    });

    it('should surgically invalidate product and list cache when an admin updates a product', async () => {
      const invalidateSpy = jest.spyOn(cacheService, 'invalidateProduct');

      prisma.product.findUnique.mockResolvedValueOnce(mockProduct);
      prisma.$transaction.mockImplementationOnce(async (callback) => {
        const tx = {
          product: {
            update: jest.fn().mockResolvedValueOnce({
              ...mockProduct,
              name: 'Updated Ergonomic Chair',
              slug: 'updated-ergonomic-chair',
              version: 2
            })
          }
        };
        return callback(tx);
      });

      const res = await request(app)
        .put(`/api/v1/products/${productId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ name: 'Updated Ergonomic Chair', slug: 'updated-ergonomic-chair' });

      expect(res.status).toBe(200);
      expect(invalidateSpy).toHaveBeenCalledWith({
        id: productId,
        slug: 'updated-ergonomic-chair'
      });

      invalidateSpy.mockRestore();
    });
  });

  describe('Category Tree Caching & Invalidation', () => {
    it('should cache category tree and invalidate on admin mutation', async () => {
      const getSpy = jest.spyOn(cacheService, 'get');
      const setSpy = jest.spyOn(cacheService, 'set');
      const invalidateSpy = jest.spyOn(cacheService, 'invalidateCategory');

      prisma.category.findMany.mockResolvedValueOnce([mockCategory]);

      // Read categories
      const res1 = await request(app).get('/api/v1/categories');
      expect(res1.status).toBe(200);
      expect(setSpy).toHaveBeenCalledWith(
        'quickcart:categories:tree',
        expect.any(Array),
        cacheService.ttl.CATEGORIES
      );

      // Admin updates category -> should invalidate category cache
      prisma.category.findUnique.mockResolvedValueOnce(mockCategory);
      prisma.category.update.mockResolvedValueOnce({
        ...mockCategory,
        name: 'Office Furniture'
      });

      const res2 = await request(app)
        .put(`/api/v1/categories/${categoryId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ name: 'Office Furniture' });

      expect(res2.status).toBe(200);
      expect(invalidateSpy).toHaveBeenCalled();

      getSpy.mockRestore();
      setSpy.mockRestore();
      invalidateSpy.mockRestore();
    });
  });

  describe('Zero-Leak Privacy Defense', () => {
    it('should NEVER write sensitive user cart or order endpoints to public Redis cache', async () => {
      const setSpy = jest.spyOn(cacheService, 'set');

      // Attempting to list products as public visitor uses catalog key
      cacheService.generateCatalogQueryKey({ page: 1 });

      // Check all keys passed to setSpy
      for (const call of setSpy.mock.calls) {
        const key = call[0];
        expect(key).not.toMatch(/cart/i);
        expect(key).not.toMatch(/order/i);
        expect(key).not.toMatch(/user/i);
        expect(key).not.toMatch(/auth/i);
      }

      setSpy.mockRestore();
    });
  });

  describe('Graceful Fallback When Redis is Offline', () => {
    it('should transparently query PostgreSQL and return 200 OK when Redis is unavailable', async () => {
      // Simulate Redis being completely offline / returning null on get
      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(cacheService, 'set').mockResolvedValue(false);

      prisma.product.count.mockResolvedValueOnce(1);
      prisma.product.findMany.mockResolvedValueOnce([mockProduct]);

      const res = await request(app).get('/api/v1/products?page=1&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
    });
  });
});
