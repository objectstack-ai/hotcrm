import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CacheManager } from '../../src/cache-manager';

describe('CacheManager — resetInstance test isolation', () => {
  afterEach(() => {
    CacheManager.resetInstance();
  });

  it('should fully reset singleton so next getInstance creates fresh instance', async () => {
    const cm1 = CacheManager.getInstance();
    await cm1.set('key', 'value', 60);
    expect(await cm1.get('key')).toBe('value');

    CacheManager.resetInstance();

    const cm2 = CacheManager.getInstance();
    // After reset, the new instance should have an empty cache
    expect(await cm2.get('key')).toBeNull();
    expect(cm2.getStats().size).toBe(0);
  });

  it('should allow a different config after reset', () => {
    const cm1 = CacheManager.getInstance({ defaultTtl: 300 });
    CacheManager.resetInstance();

    const cm2 = CacheManager.getInstance({ defaultTtl: 600 });
    // Should be a brand new instance (not same reference as cm1)
    expect(cm2).not.toBe(cm1);
  });

  it('should not throw when called before any getInstance', () => {
    // Fresh state — no instance exists yet
    expect(() => CacheManager.resetInstance()).not.toThrow();
  });

  it('should not throw when called twice in a row', () => {
    CacheManager.getInstance();
    CacheManager.resetInstance();
    expect(() => CacheManager.resetInstance()).not.toThrow();
  });

  it('should isolate cache state between test runs', async () => {
    // Simulate test A
    const cmA = CacheManager.getInstance();
    await cmA.set('shared', 'from-test-a', 60);
    CacheManager.resetInstance();

    // Simulate test B — should not see test A's data
    const cmB = CacheManager.getInstance();
    expect(await cmB.get('shared')).toBeNull();
  });
});
