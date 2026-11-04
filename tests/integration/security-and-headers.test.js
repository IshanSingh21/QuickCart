jest.mock('../../src/lib/prisma', () => ({
  product: {
    count: jest.fn().mockResolvedValue(0),
    findMany: jest.fn().mockResolvedValue([])
  },
  category: {
    findFirst: jest.fn().mockResolvedValue(null)
  },
  user: {
    findUnique: jest.fn(),
    create: jest.fn()
  }
}));

const request = require('supertest');
const prisma = require('../../src/lib/prisma');
const app = require('../../src/app');
const config = require('../../src/config/env');

describe('Security Headers, CORS & Payload Safety Review', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.product.count.mockResolvedValue(0);
    prisma.product.findMany.mockResolvedValue([]);
    prisma.category.findFirst.mockResolvedValue(null);
  });

  describe('HTTP Security Headers (Helmet)', () => {
    it('should include essential defensive security headers on all responses', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    });

    it('should strip X-Powered-By header to prevent technology fingerprinting', async () => {
      const res = await request(app).get('/');

      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('CORS Configuration & Origin Validation', () => {
    it('should reflect allowed origin and permit credentials in CORS response', async () => {
      const testOrigin = 'http://localhost:3000';
      const res = await request(app)
        .get('/api/v1/health')
        .set('Origin', testOrigin);

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe(testOrigin);
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should respond appropriately to CORS preflight OPTIONS requests', async () => {
      const testOrigin = 'http://localhost:3000';
      const res = await request(app)
        .options('/api/v1/health')
        .set('Origin', testOrigin)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization,Idempotency-Key');

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe(testOrigin);
      expect(res.headers['access-control-allow-methods']).toContain('POST');
      expect(res.headers['access-control-allow-headers']).toContain('Idempotency-Key');
    });
  });

  describe('Payload Size Limit (DoS Defense - OWASP A04)', () => {
    it('should reject request bodies exceeding the 10kb threshold with 413 Payload Too Large', async () => {
      // 15 KB payload exceeds express.json({ limit: '10kb' })
      const oversizedPayload = {
        data: 'x'.repeat(15 * 1024)
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(oversizedPayload));

      expect(res.status).toBe(413);
    });
  });

  describe('SQL Injection Resilience across Search & Filter Endpoints', () => {
    it('should safely parameterize SQL injection probes in catalog search without execution or errors', async () => {
      const injectionVectors = [
        "' OR '1'='1",
        "'; DROP TABLE products; --",
        "1' UNION SELECT * FROM users --",
        "admin'--",
        "\" OR \"\"=\""
      ];

      for (const vector of injectionVectors) {
        const res = await request(app)
          .get('/api/v1/products')
          .query({ search: vector });

        // Should return 200 OK with empty/safe data array, never 500 Database Error
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      }
    });
  });

  describe('Sensitive Internal Data Exposure on 500 Errors', () => {
    it('should never expose stack traces or internal schema details in production mode', async () => {
      const originalEnv = config.env;
      config.env = 'production';

      prisma.user.findUnique.mockRejectedValueOnce(
        new Error('SELECT * FROM "users" WHERE "email" = ... Database connection failed')
      );

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'valid.email@example.com',
          password: 'Password123!'
        });

      // In production, internal 500 errors are sanitized to generic message
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('An unexpected internal server error occurred');
      expect(res.body.stack).toBeUndefined();
      expect(res.body.error.details).toBeUndefined();
      expect(res.text).not.toContain('SELECT * FROM');

      config.env = originalEnv;
    });
  });
});
