const request = require('supertest');
const app = require('../../src/app');
const { HybridRateLimitStore } = require('../../src/middlewares/rate-limiter');

describe('Distributed Rate Limiting & Hybrid Fallback', () => {
  it('should initialize HybridRateLimitStore and operate in memory when Redis is offline', async () => {
    const store = new HybridRateLimitStore('test-prefix');
    store.init({ windowMs: 60000 });

    const key = '127.0.0.1';
    const hit1 = await store.increment(key);
    expect(hit1).toHaveProperty('totalHits');
    expect(hit1.totalHits).toBe(1);

    const hit2 = await store.increment(key);
    expect(hit2.totalHits).toBe(2);

    await store.resetKey(key);
    const hitAfterReset = await store.increment(key);
    expect(hitAfterReset.totalHits).toBe(1);
  });

  it('should allow normal requests to pass without crashing when Redis is unavailable', async () => {
    // Making multiple requests to public endpoint /health
    const res1 = await request(app).get('/health');
    const res2 = await request(app).get('/health');

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
  });
});
