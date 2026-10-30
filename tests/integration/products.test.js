const { Prisma } = require('@prisma/client');

jest.mock('../../src/lib/prisma', () => ({
  product: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  category: {
    findUnique: jest.fn(),
    findFirst: jest.fn()
  },
  productImage: {
    deleteMany: jest.fn(),
    createMany: jest.fn()
  },
  $transaction: jest.fn((callback) =>
    callback({
      product: {
        update: jest.fn()
      },
      productImage: {
        deleteMany: jest.fn(),
        createMany: jest.fn()
      }
    })
  )
}));

const request = require('supertest');
const prisma = require('../../src/lib/prisma');
const app = require('../../src/app');
const { generateAccessToken } = require('../../src/utils/token');

describe('Products API (/api/v1/products)', () => {
  let adminToken;
  let customerToken;

  beforeAll(() => {
    adminToken = generateAccessToken({
      id: 'admin-uuid',
      email: 'admin@quickcart.com',
      role: 'ADMIN'
    });

    customerToken = generateAccessToken({
      id: 'customer-uuid',
      email: 'customer@quickcart.com',
      role: 'CUSTOMER'
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/products (Catalog, Filtering, Search, Pagination)', () => {
    it('should return 200 with paginated active products and standard metadata envelope', async () => {
      const mockProducts = [
        {
          id: 'p-1',
          name: 'Wireless Headphones',
          slug: 'wireless-headphones',
          sku: 'WH-001',
          description: 'High quality sound',
          price: new Prisma.Decimal(249.99),
          stock: 25,
          isActive: true,
          category: { id: 'c-1', name: 'Audio', slug: 'audio' },
          images: [{ url: 'https://img.test/1.jpg', isPrimary: true }]
        }
      ];

      prisma.product.count.mockResolvedValue(1);
      prisma.product.findMany.mockResolvedValue(mockProducts);

      const res = await request(app).get('/api/v1/products?page=1&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].price).toBe('249.99');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1
      });

      // Verify public query only looks for active products
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true })
        })
      );
    });

    it('should allow ADMIN to view inactive products with isActive=false query', async () => {
      prisma.product.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/products?isActive=false')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: false })
        })
      );
    });

    it('should clamp excessive pagination limit to maxPageSize (50)', async () => {
      prisma.product.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      const res = await request(app).get('/api/v1/products?limit=1000');

      expect(res.status).toBe(200);
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 })
      );
      expect(res.body.meta.limit).toBe(50);
    });

    it('should filter by search keyword in title or description', async () => {
      prisma.product.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      const res = await request(app).get('/api/v1/products?search=bluetooth');

      expect(res.status).toBe(200);
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'bluetooth', mode: 'insensitive' } },
              { description: { contains: 'bluetooth', mode: 'insensitive' } }
            ]
          })
        })
      );
    });

    it('should filter by price range', async () => {
      prisma.product.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      const res = await request(app).get('/api/v1/products?minPrice=50&maxPrice=200');

      expect(res.status).toBe(200);
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            price: {
              gte: new Prisma.Decimal(50),
              lte: new Prisma.Decimal(200)
            }
          })
        })
      );
    });

    it('should filter by category slug including subcategories', async () => {
      prisma.category.findFirst.mockResolvedValue({
        id: 'cat-parent-id',
        slug: 'electronics',
        children: [{ id: 'cat-sub-1' }]
      });
      prisma.product.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      const res = await request(app).get('/api/v1/products?category=electronics');

      expect(res.status).toBe(200);
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: { in: ['cat-parent-id', 'cat-sub-1'] }
          })
        })
      );
    });

    it('should return 400 Bad Request when minPrice is greater than maxPrice', async () => {
      const res = await request(app).get('/api/v1/products?minPrice=300&maxPrice=100');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d) => d.field === 'maxPrice')).toBe(true);
    });

    it('should return 400 Bad Request when minPrice is negative', async () => {
      const res = await request(app).get('/api/v1/products?minPrice=-10');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/products/:id', () => {
    const productId = '11111111-1111-1111-1111-111111111111';

    it('should return 200 with product details for active product', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: productId,
        name: 'Headphones Pro',
        price: new Prisma.Decimal(199.99),
        isActive: true
      });

      const res = await request(app).get(`/api/v1/products/${productId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(productId);
      expect(res.body.data.price).toBe('199.99');
    });

    it('should return 400 Bad Request if ID is not a valid UUID', async () => {
      const res = await request(app).get('/api/v1/products/invalid-uuid-format');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 Not Found if product is inactive for public visitor', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: productId,
        isActive: false
      });

      const res = await request(app).get(`/api/v1/products/${productId}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 200 if product is inactive but requested by ADMIN', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: productId,
        name: 'Inactive Item',
        price: new Prisma.Decimal(50.0),
        isActive: false
      });

      const res = await request(app)
        .get(`/api/v1/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(productId);
      expect(res.body.data.isActive).toBe(false);
    });
  });

  describe('GET /api/v1/products/slug/:slug', () => {
    it('should return 200 with product details for valid slug', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'p-slug-1',
        slug: 'sony-wh-1000xm5',
        price: new Prisma.Decimal(399.99),
        isActive: true
      });

      const res = await request(app).get('/api/v1/products/slug/sony-wh-1000xm5');

      expect(res.status).toBe(200);
      expect(res.body.data.slug).toBe('sony-wh-1000xm5');
    });

    it('should return 404 Not Found when product slug does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/v1/products/slug/nonexistent-item');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/v1/products (Creation & Authorization)', () => {
    const validPayload = {
      name: 'Wireless Ergonomic Keyboard',
      sku: 'KB-ERGO-001',
      description: 'Comfortable split keyboard',
      price: 129.99,
      stock: 50,
      categoryId: '22222222-2222-2222-2222-222222222222',
      images: [{ url: 'https://img.test/kb.jpg', isPrimary: true }]
    };

    it('should return 401 Unauthorized if no authentication token provided', async () => {
      const res = await request(app).post('/api/v1/products').send(validPayload);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 403 Forbidden if CUSTOMER tries to create a product', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(validPayload);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 201 Created when ADMIN creates a product', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: validPayload.categoryId });
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.product.create.mockResolvedValue({
        id: 'new-prod-id',
        name: validPayload.name,
        slug: 'wireless-ergonomic-keyboard',
        sku: 'KB-ERGO-001',
        description: validPayload.description,
        price: new Prisma.Decimal(129.99),
        stock: 50,
        categoryId: validPayload.categoryId,
        isActive: true,
        images: [{ url: 'https://img.test/kb.jpg', isPrimary: true }]
      });

      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe('wireless-ergonomic-keyboard');
      expect(res.body.data.sku).toBe('KB-ERGO-001');
      expect(res.body.data.price).toBe('129.99');
    });

    it('should return 400 Bad Request when price is 0 or negative', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validPayload, price: 0 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d) => d.field === 'price')).toBe(true);
    });

    it('should return 400 Bad Request when stock is negative', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validPayload, stock: -5 });

      expect(res.status).toBe(400);
      expect(res.body.error.details.some((d) => d.field === 'stock')).toBe(true);
    });

    it('should return 404 Not Found if category does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validPayload);

      expect(res.status).toBe(404);
      expect(res.body.error.message).toContain('Category not found');
    });

    it('should return 409 Conflict if product SKU already exists', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: validPayload.categoryId });
      prisma.product.findUnique
        .mockResolvedValueOnce(null) // slug check
        .mockResolvedValueOnce({ id: 'existing', sku: 'KB-ERGO-001' }); // sku check

      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validPayload);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.message).toContain('SKU');
    });
  });

  describe('PUT /api/v1/products/:id (Update & Concurrency)', () => {
    const productId = '33333333-3333-3333-3333-333333333333';

    it('should return 403 Forbidden for non-admin', async () => {
      const res = await request(app)
        .put(`/api/v1/products/${productId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ price: 149.99 });

      expect(res.status).toBe(403);
    });

    it('should return 200 OK when ADMIN updates product and increments version', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: productId,
        name: 'Keyboard',
        slug: 'keyboard',
        sku: 'KB-01',
        price: new Prisma.Decimal(99.99),
        version: 1
      });

      prisma.$transaction.mockResolvedValue({
        id: productId,
        name: 'Keyboard v2',
        slug: 'keyboard',
        sku: 'KB-01',
        price: new Prisma.Decimal(119.99),
        version: 2
      });

      const res = await request(app)
        .put(`/api/v1/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Keyboard v2', price: 119.99 });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Keyboard v2');
      expect(res.body.data.price).toBe('119.99');
    });
  });

  describe('DELETE /api/v1/products/:id', () => {
    const productId = '44444444-4444-4444-4444-444444444444';

    it('should return 403 Forbidden for non-admin', async () => {
      const res = await request(app)
        .delete(`/api/v1/products/${productId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });

    it('should soft-delete product if referenced in orders to preserve audit trail', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: productId,
        _count: { orderItems: 2, cartItems: 0 }
      });
      prisma.product.update.mockResolvedValue({ id: productId, isActive: false });

      const res = await request(app)
        .delete(`/api/v1/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.softDeleted).toBe(true);
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: productId },
        data: { isActive: false }
      });
    });

    it('should hard-delete product if completely unreferenced', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: productId,
        _count: { orderItems: 0, cartItems: 0 }
      });
      prisma.product.delete.mockResolvedValue({ id: productId });

      const res = await request(app)
        .delete(`/api/v1/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.softDeleted).toBe(false);
      expect(prisma.product.delete).toHaveBeenCalledWith({
        where: { id: productId }
      });
    });
  });
});
