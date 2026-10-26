const request = require('supertest');
const app = require('../../src/app');

describe('Health and System Routes', () => {
  describe('GET /api/v1/health', () => {
    it('should return 200 OK with system status and envelope structure', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('statusCode', 200);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('data');

      const data = res.body.data;
      expect(data).toHaveProperty('status');
      expect(['healthy', 'degraded']).toContain(data.status);
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('environment');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('memory');
      expect(data.memory).toHaveProperty('rssMb');
      expect(data).toHaveProperty('services');
      expect(data.services).toHaveProperty('database');
      expect(data.services.database).toHaveProperty('status');
    });
  });

  describe('GET /health (Root Probe)', () => {
    it('should return 200 OK for container health check', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET / (Root API Info)', () => {
    it('should return 200 OK with API info and standard envelope', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('version');
      expect(res.body.data).toHaveProperty('docs');
    });
  });

  describe('404 Not Found Handling', () => {
    it('should return 404 with standardized error envelope for undefined route', async () => {
      const res = await request(app).get('/api/v1/non-existent-endpoint-test');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('statusCode', 404);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
      expect(res.body.error.message).toContain('Route not found');
    });
  });

  describe('Malformed JSON Handling', () => {
    it('should return 400 Bad Request with validation code when receiving broken JSON', async () => {
      const res = await request(app)
        .post('/api/v1/health')
        .set('Content-Type', 'application/json')
        .send('{"invalidJson": }');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('Invalid JSON syntax');
    });
  });
});
