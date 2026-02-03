import { CacheManager } from '../../src/cache-manager';

describe('CacheManager', () => {
  let cacheManager;

  beforeEach(async () => {
    // Create a new instance for each test
    cacheManager = CacheManager.getInstance();
    // Clear cache between tests
    await cacheManager.clear();
  });

  afterEach(async () => {
    await cacheManager.clear();
  });

  describe('set and get', () => {
    it('should store and retrieve a value', async () => {
      // Arrange
      const key = 'test-key';
      const value = { score: 85, confidence: 0.92 };

      // Act
      await cacheManager.set(key, value, 60);
      const result = await cacheManager.get(key);

      // Assert
      expect(result).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      // Arrange
      const key = 'non-existent-key';

      // Act
      const result = await cacheManager.get(key);

      // Assert
      expect(result).toBeNull();
    });

    it('should store different types of values', async () => {
      // Arrange
      const stringKey = 'string-key';
      const numberKey = 'number-key';
      const arrayKey = 'array-key';
      const objectKey = 'object-key';

      // Act
      await cacheManager.set(stringKey, 'test-value', 60);
      await cacheManager.set(numberKey, 42, 60);
      await cacheManager.set(arrayKey, [1, 2, 3], 60);
      await cacheManager.set(objectKey, { a: 1, b: 2 }, 60);

      // Assert
      expect(await cacheManager.get(stringKey)).toBe('test-value');
      expect(await cacheManager.get(numberKey)).toBe(42);
      expect(await cacheManager.get(arrayKey)).toEqual([1, 2, 3]);
      expect(await cacheManager.get(objectKey)).toEqual({ a: 1, b: 2 });
    });
  });

  describe('TTL and expiration', () => {
    it('should expire entries after TTL', async () => {
      // Arrange
      const key = 'expiring-key';
      const value = { data: 'test' };
      const ttl = 1; // 1 second

      // Act
      await cacheManager.set(key, value, ttl);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const result = await cacheManager.get(key);

      // Assert
      expect(result).toBeNull();
    });

    it('should not expire entries before TTL', async () => {
      // Arrange
      const key = 'not-expiring-key';
      const value = { data: 'test' };
      const ttl = 5; // 5 seconds

      // Act
      await cacheManager.set(key, value, ttl);
      
      // Wait briefly but not to expiration
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const result = await cacheManager.get(key);

      // Assert
      expect(result).toEqual(value);
    });

    it('should use default TTL when not specified', async () => {
      // Arrange
      const key = 'default-ttl-key';
      const value = { data: 'test' };

      // Act
      await cacheManager.set(key, value);
      const result = await cacheManager.get(key);

      // Assert
      expect(result).toEqual(value);
    });
  });

  describe('delete', () => {
    it('should delete an existing entry', async () => {
      // Arrange
      const key = 'delete-key';
      const value = { data: 'test' };
      await cacheManager.set(key, value, 60);

      // Act
      await cacheManager.delete(key);
      const result = await cacheManager.get(key);

      // Assert
      expect(result).toBeNull();
    });

    it('should not throw when deleting non-existent entry', async () => {
      // Arrange
      const key = 'non-existent-key';

      // Act & Assert
      await expect(cacheManager.delete(key)).resolves.toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should clear all entries', async () => {
      // Arrange
      await cacheManager.set('key1', 'value1', 60);
      await cacheManager.set('key2', 'value2', 60);
      await cacheManager.set('key3', 'value3', 60);

      // Act
      await cacheManager.clear();

      // Assert
      expect(await cacheManager.get('key1')).toBeNull();
      expect(await cacheManager.get('key2')).toBeNull();
      expect(await cacheManager.get('key3')).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should track cache size and hits', async () => {
      // Arrange
      const key = 'stats-key';
      const value = { data: 'test' };
      await cacheManager.set(key, value, 60);

      // Act
      await cacheManager.get(key); // hit
      await cacheManager.get(key); // hit
      await cacheManager.get('non-existent'); // miss (doesn't affect stats)
      
      const stats = cacheManager.getStats();

      // Assert
      expect(stats.size).toBe(1);
      expect(stats.hits).toBe(2);
      expect(stats.backend).toBe('memory');
    });

    it('should track total hits correctly', async () => {
      // Arrange
      const key = 'rate-key';
      await cacheManager.set(key, 'value', 60);

      // Act
      await cacheManager.get(key); // hit
      await cacheManager.get(key); // hit
      await cacheManager.get(key); // hit
      
      const stats = cacheManager.getStats();

      // Assert
      expect(stats.size).toBe(1);
      expect(stats.hits).toBe(3);
      expect(stats.backend).toBe('memory');
    });

    it('should return correct backend type', async () => {
      // Act
      const stats = cacheManager.getStats();

      // Assert
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.backend).toBe('memory');
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      // Act
      const instance1 = CacheManager.getInstance();
      const instance2 = CacheManager.getInstance();

      // Assert
      expect(instance1).toBe(instance2);
    });

    it('should share state between instances', async () => {
      // Arrange
      const instance1 = CacheManager.getInstance();
      const instance2 = CacheManager.getInstance();

      // Act
      await instance1.set('shared-key', 'shared-value', 60);
      const result = await instance2.get('shared-key');

      // Assert
      expect(result).toBe('shared-value');
    });
  });
});
