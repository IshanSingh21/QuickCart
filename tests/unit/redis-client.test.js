const redisClient = require('../../src/lib/redis');

describe('Redis Client Unit Tests', () => {
  afterAll(async () => {
    await redisClient.disconnect();
  });

  describe('Connection & Availability', () => {
    it('should report availability status accurately', () => {
      const isAvailable = redisClient.isAvailable();
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should return disconnected status on ping if Redis is not ready', async () => {
      // If redis is not running locally, ping should return disconnected gracefully
      const health = await redisClient.ping();
      expect(health).toHaveProperty('status');
      expect(['connected', 'disconnected', 'degraded']).toContain(health.status);
    });
  });

  describe('Graceful Fallback When Offline', () => {
    it('should return null on get when offline without throwing unhandled exceptions', async () => {
      const origReady = redisClient.isReady;
      redisClient.isReady = false;

      const val = await redisClient.get('any-key');
      expect(val).toBeNull();

      redisClient.isReady = origReady;
    });

    it('should return false on set when offline without throwing', async () => {
      const origReady = redisClient.isReady;
      redisClient.isReady = false;

      const ok = await redisClient.set('any-key', 'val', 60);
      expect(ok).toBe(false);

      redisClient.isReady = origReady;
    });

    it('should return 0 on del when offline', async () => {
      const origReady = redisClient.isReady;
      redisClient.isReady = false;

      const count = await redisClient.del('any-key');
      expect(count).toBe(0);

      redisClient.isReady = origReady;
    });

    it('should return 0 on scanDel when offline', async () => {
      const origReady = redisClient.isReady;
      redisClient.isReady = false;

      const count = await redisClient.scanDel('quickcart:*');
      expect(count).toBe(0);

      redisClient.isReady = origReady;
    });

    it('should throw Error on rawCall when offline so rate-limit-redis fails open', async () => {
      const origReady = redisClient.isReady;
      redisClient.isReady = false;

      await expect(redisClient.rawCall('PING')).rejects.toThrow('Redis is not available');

      redisClient.isReady = origReady;
    });
  });
});
