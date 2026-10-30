jest.mock('../../src/lib/prisma', () => ({
  category: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}));

const request = require('supertest');
const prisma = require('../../src/lib/prisma');
const app = require('../../src/app');
const { generateAccessToken } = require('../../src/utils/token');

describe('Categories API (/api/v1/categories)', () => {
  let adminToken;
  let customerToken;

  beforeAll(() => {
    adminToken = generateAccessToken({
      id: 'admin-user-id',
      email: 'admin@quickcart.com',
      role: 'ADMIN'
    });

    customerToken = generateAccessToken({
      id: 'customer-user-id',
      email: 'customer@quickcart.com',
      role: 'CUSTOMER'
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/categories', () => {
    it('should return 200 with list of root categories and subcategories', async () => {
      const mockCategories = [
        {
          id: 'cat-root-1',
          name: 'Electronics',
          slug: 'electronics',
          parentId: null,
          children: [
            { id: 'cat-sub-1', name: 'Smartphones', slug: 'smartphones', parentId: 'cat-root-1' }
          ]
        }
      ];
      prisma.category.findMany.mockResolvedValue(mockCategories);

      const res = await request(app).get('/api/v1/categories');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockCategories);
    });
  });

  describe('GET /api/v1/categories/:id', () => {
    it('should return 200 with category details when valid UUID provided', async () => {
      const categoryId = '11111111-1111-1111-1111-111111111111';
      prisma.category.findUnique.mockResolvedValue({
        id: categoryId,
        name: 'Electronics',
        slug: 'electronics',
        parent: null,
        children: []
      });

      const res = await request(app).get(`/api/v1/categories/${categoryId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(categoryId);
      expect(res.body.data.name).toBe('Electronics');
    });

    it('should return 400 Bad Request when category ID is not a valid UUID', async () => {
      const res = await request(app).get('/api/v1/categories/not-a-valid-uuid');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 Not Found when category does not exist', async () => {
      const categoryId = '22222222-2222-2222-2222-222222222222';
      prisma.category.findUnique.mockResolvedValue(null);

      const res = await request(app).get(`/api/v1/categories/${categoryId}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/v1/categories (Authorization & Creation)', () => {
    it('should return 401 Unauthorized if no token provided', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .send({ name: 'Gaming' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 403 Forbidden if CUSTOMER tries to create a category', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ name: 'Gaming' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 201 Created when ADMIN creates a category', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      prisma.category.create.mockResolvedValue({
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Gaming',
        slug: 'gaming',
        description: 'Gaming gear',
        parentId: null
      });

      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Gaming',
          description: 'Gaming gear'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Gaming');
      expect(res.body.data.slug).toBe('gaming');
    });

    it('should return 400 Bad Request when category name is missing', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Missing name' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 Conflict if category slug already exists', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'existing-id',
        slug: 'gaming'
      });

      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Gaming', slug: 'gaming' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  describe('PUT /api/v1/categories/:id', () => {
    const categoryId = '44444444-4444-4444-4444-444444444444';

    it('should return 403 Forbidden for non-admin user', async () => {
      const res = await request(app)
        .put(`/api/v1/categories/${categoryId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ name: 'New Name' });

      expect(res.status).toBe(403);
    });

    it('should return 200 OK when ADMIN updates category', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: categoryId,
        name: 'Old Name',
        slug: 'old-name'
      });
      prisma.category.update.mockResolvedValue({
        id: categoryId,
        name: 'Updated Gear',
        slug: 'updated-gear'
      });

      const res = await request(app)
        .put(`/api/v1/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Gear' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Gear');
    });

    it('should return 400 Bad Request if category is set as its own parent', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: categoryId,
        slug: 'gear'
      });

      const res = await request(app)
        .put(`/api/v1/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ parentId: categoryId });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('cannot be its own parent');
    });
  });

  describe('DELETE /api/v1/categories/:id', () => {
    const categoryId = '55555555-5555-5555-5555-555555555555';

    it('should return 403 Forbidden for non-admin user', async () => {
      const res = await request(app)
        .delete(`/api/v1/categories/${categoryId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 409 Conflict if category has subcategories', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: categoryId,
        _count: { children: 1, products: 0 }
      });

      const res = await request(app)
        .delete(`/api/v1/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain('existing subcategories');
    });

    it('should return 200 OK when deleting unused category', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: categoryId,
        _count: { children: 0, products: 0 }
      });
      prisma.category.delete.mockResolvedValue({ id: categoryId });

      const res = await request(app)
        .delete(`/api/v1/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);
    });
  });
});
