jest.mock('../../src/lib/redis', () => ({
  isAvailable: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  scanDel: jest.fn()
}));

const redisClient = require('../../src/lib/redis');
const cacheService = require('../../src/services/cache.service');

describe('Cache Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateCatalogQueryKey', () => {
    it('should generate identical deterministic keys regardless of query parameter order', () => {
      const query1 = { page: 1, limit: 10, search: 'keyboard', sortBy: 'price' };
      const query2 = { sortBy: 'price', search: 'keyboard', limit: 10, page: 1 };

      const key1 = cacheService.generateCatalogQueryKey(query1);
      const key2 = cacheService.generateCatalogQueryKey(query2);

      expect(key1).toBe(key2);
      expect(key1).toMatch(/^quickcart:products:list:[a-f0-9]{16}$/);
    });

    it('should ignore empty, null, or undefined parameters in hash generation', () => {
      const query1 = { page: 1, limit: 10, search: '' };
      const query2 = { page: 1, limit: 10 };

      const key1 = cacheService.generateCatalogQueryKey(query1);
      const key2 = cacheService.generateCatalogQueryKey(query2);

      expect(key1).toBe(key2);
    });
  });

  describe('get and set', () => {
    it('should return deserialized JSON on cache hit', async () => {
      const payload = { id: 'p1', name: 'Product 1', price: '29.99' };
      redisClient.get.mockResolvedValueOnce(JSON.stringify(payload));

      const result = await cacheService.get('quickcart:products:id:p1');
      expect(result).toEqual(payload);
      expect(redisClient.get).toHaveBeenCalledWith('quickcart:products:id:p1');
    });

    it('should return null on cache miss', async () => {
      redisClient.get.mockResolvedValueOnce(null);

      const result = await cacheService.get('quickcart:products:id:missing');
      expect(result).toBeNull();
    });

    it('should return null gracefully if Redis data is corrupted or invalid JSON', async () => {
      redisClient.get.mockResolvedValueOnce('invalid{json');

      const result = await cacheService.get('quickcart:products:id:broken');
      expect(result).toBeNull();
    });

    it('should serialize and set key with TTL', async () => {
      redisClient.set.mockResolvedValueOnce(true);
      const payload = { count: 5 };

      const success = await cacheService.set('quickcart:test', payload, 300);
      expect(success).toBe(true);
      expect(redisClient.set).toHaveBeenCalledWith(
        'quickcart:test',
        JSON.stringify(payload),
        300
      );
    });

    it('should return false gracefully if set fails or Redis is offline', async () => {
      redisClient.set.mockResolvedValueOnce(false);

      const success = await cacheService.set('quickcart:test', { val: 1 }, 300);
      expect(success).toBe(false);
    });
  });

  describe('Surgical Cache Invalidation', () => {
    it('should invalidate product by ID, slug, and purge all catalog list keys', async () => {
      redisClient.del.mockResolvedValueOnce(2);
      redisClient.scanDel.mockResolvedValueOnce(5);

      await cacheService.invalidateProduct({ id: 'prod-123', slug: 'mechanical-keyboard' });

      expect(redisClient.del).toHaveBeenCalledWith(
        'quickcart:products:id:prod-123',
        'quickcart:products:slug:mechanical-keyboard'
      );
      expect(redisClient.scanDel).toHaveBeenCalledWith('quickcart:products:list:*');
    });

    it('should invalidate categories and all catalog list keys', async () => {
      redisClient.scanDel.mockResolvedValue(3);

      await cacheService.invalidateCategory();

      expect(redisClient.scanDel).toHaveBeenCalledWith('quickcart:categories:*');
      expect(redisClient.scanDel).toHaveBeenCalledWith('quickcart:products:list:*');
    });

    it('should invalidate all application cache entries', async () => {
      redisClient.scanDel.mockResolvedValueOnce(10);

      await cacheService.invalidateAll();
      expect(redisClient.scanDel).toHaveBeenCalledWith('quickcart:*');
    });
  });
});
