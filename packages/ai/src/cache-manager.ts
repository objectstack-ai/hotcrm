/**
 * Redis Cache Manager
 * 
 * Provides Redis-based caching for ML predictions
 * Falls back to in-memory cache if Redis is not available
 */

import { createLogger } from '@hotcrm/core';
const logger = createLogger('ai:cache-manager');

export interface CacheConfig {
  /** Redis connection URL */
  redisUrl?: string;
  
  /** Default TTL in seconds */
  defaultTtl?: number;
  
  /** Enable/disable caching */
  enabled?: boolean;
  
  /** Use in-memory fallback if Redis unavailable */
  useMemoryFallback?: boolean;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

/**
 * Cache Manager with Redis support and in-memory fallback
 */
export class CacheManager {
  private static instance: CacheManager;
  private config: CacheConfig;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private redisClient: any = null; // Will be Redis client
  private useRedis: boolean = false;
  
  private constructor(config: CacheConfig = {}) {
    this.config = {
      defaultTtl: config.defaultTtl || 300, // 5 minutes
      enabled: config.enabled !== false,
      useMemoryFallback: config.useMemoryFallback !== false,
      ...config
    };
    
    this.initializeRedis();
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(config?: CacheConfig): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager(config);
    }
    return CacheManager.instance;
  }
  
  /**
   * Reset singleton instance for test isolation.
   * Call in beforeEach/afterEach to ensure a clean slate between tests.
   */
  static resetInstance(): void {
    if (CacheManager.instance) {
      CacheManager.instance.memoryCache.clear();
      CacheManager.instance.redisClient = null;
      CacheManager.instance.useRedis = false;
    }
    CacheManager.instance = undefined as unknown as CacheManager;
  }
  
  /**
   * Initialize Redis client
   */
  private async initializeRedis(): Promise<void> {
    if (!this.config.redisUrl) {
      logger.info('[Cache] No Redis URL provided, using in-memory cache');
      return;
    }
    
    try {
      // In production, would initialize actual Redis client:
      // import { createClient } from 'redis';
      // this.redisClient = createClient({ url: this.config.redisUrl });
      // await this.redisClient.connect();
      // this.useRedis = true;
      // logger.info('[Cache] Redis connected successfully');
      
      logger.info('[Cache] Redis initialization placeholder - using in-memory cache');
    } catch (error) {
      logger.error({ err: error }, '[Cache] Redis initialization failed');
      
      if (this.config.useMemoryFallback) {
        logger.info('[Cache] Falling back to in-memory cache');
      }
    }
  }
  
  /**
   * Get value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.config.enabled) {
      return null;
    }
    
    try {
      if (this.useRedis && this.redisClient) {
        // const value = await this.redisClient.get(key);
        // if (value) {
        //   const entry = JSON.parse(value);
        //   return entry.data as T;
        // }
        return null;
      }
      
      // In-memory cache
      const entry = this.memoryCache.get(key);
      if (!entry) {
        return null;
      }
      
      // Check if expired
      const now = Date.now();
      if (now - entry.timestamp > entry.ttl * 1000) {
        this.memoryCache.delete(key);
        return null;
      }
      
      // Increment hit counter
      entry.hits++;
      
      return entry.data as T;
    } catch (error) {
      logger.error({ err: error }, '[Cache] Get error');
      return null;
    }
  }
  
  /**
   * Set value in cache
   */
  async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.config.enabled) {
      return;
    }
    
    const cacheTtl = ttl || this.config.defaultTtl!;
    
    try {
      if (this.useRedis && this.redisClient) {
        // const entry = { data: value, timestamp: Date.now() };
        // await this.redisClient.setEx(key, cacheTtl, JSON.stringify(entry));
        return;
      }
      
      // In-memory cache
      this.memoryCache.set(key, {
        data: value,
        timestamp: Date.now(),
        ttl: cacheTtl,
        hits: 0
      });
      
      // Clean up expired entries periodically
      this.cleanupExpired();
    } catch (error) {
      logger.error({ err: error }, '[Cache] Set error');
    }
  }
  
  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      if (this.useRedis && this.redisClient) {
        // await this.redisClient.del(key);
        return;
      }
      
      this.memoryCache.delete(key);
    } catch (error) {
      logger.error({ err: error }, '[Cache] Delete error');
    }
  }
  
  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      if (this.useRedis && this.redisClient) {
        // await this.redisClient.flushAll();
        return;
      }
      
      this.memoryCache.clear();
    } catch (error) {
      logger.error({ err: error }, '[Cache] Clear error');
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hits: number;
    backend: 'redis' | 'memory';
  } {
    const entries = Array.from(this.memoryCache.values());
    
    return {
      size: this.memoryCache.size,
      hits: entries.reduce((sum, entry) => sum + entry.hits, 0),
      backend: this.useRedis ? 'redis' : 'memory'
    };
  }
  
  /**
   * Clean up expired entries (in-memory only)
   */
  private cleanupExpired(): void {
    // Don't clean on every set, only probabilistically
    if (Math.random() > 0.1) return;
    
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.memoryCache.delete(key));
  }
}

export default CacheManager;
