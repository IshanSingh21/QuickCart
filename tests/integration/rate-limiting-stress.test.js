const express = require('express');
const request = require('supertest');
const rateLimit = require('express-rate-limit');
const { createRateLimitHandler, HybridRateLimitStore } = require('../../src/middlewares/rate-limiter');
const errorHandler = require('../../src/middlewares/error-handler');

describe('Rate Limiting Stress & Protection Suite (OWASP A04 Defense)', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Configure a strict test limiter with 5 requests max
    const strictAuthLimiter = rateLimit({
      windowMs: 60 * 1000,
      max: 5,
      standardHeaders: true,
      legacyHeaders: false,
      handler: createRateLimitHandler('Too many authentication attempts. Please try again later.')
    });

    app.post('/api/v1/auth/login', strictAuthLimiter, (req, res) => {
      res.status(200).json({ success: true, message: 'Authenticated' });
    });

    app.use(errorHandler);
  });

  it('should allow requests within the quota (1 to 5) with 200 OK', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'user@example.com', password: 'Password123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    }
  });

  it('should block the 6th request exceeding the quota with 429 Too Many Requests', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.com', password: 'Password123!' });

    expect(res.status).toBe(429);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(res.body.error.message).toMatch(/Too many authentication attempts\. Please try again later\./);
    expect(res.headers['retry-after']).toBeDefined();
  });

  it('should operate correctly with HybridRateLimitStore fallback', () => {
    const hybridStore = new HybridRateLimitStore('test-stress');
    expect(hybridStore.memoryStore).toBeDefined();
  });
});
