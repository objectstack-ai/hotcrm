import { CacheConfigSchema, type CacheConfig } from '@objectstack/spec/system';

/**
 * Cache configuration for the product catalog.
 * Products are high-read, low-write objects — aggressive caching is appropriate.
 */
export const productCatalogCacheConfig: CacheConfig = CacheConfigSchema.parse({
  enabled: true,
  tiers: [
    {
      name: 'product_memory',
      type: 'memory',
      ttl: 300,
      maxSize: 5000,
      strategy: 'lru',
      warmup: true,
    },
    {
      name: 'product_redis',
      type: 'redis',
      ttl: 3600,
      strategy: 'lfu',
      warmup: false,
    },
  ],
  invalidation: [
    { trigger: 'update', scope: 'key' },
    { trigger: 'delete', scope: 'key' },
    { trigger: 'create', scope: 'tag' },
  ],
  prefetch: true,
  compression: true,
  encryption: false,
});

/**
 * Cache configuration for knowledge articles.
 * Articles are frequently read by both agents and customers.
 */
export const knowledgeArticleCacheConfig: CacheConfig = CacheConfigSchema.parse(
  {
    enabled: true,
    tiers: [
      {
        name: 'knowledge_memory',
        type: 'memory',
        ttl: 600,
        maxSize: 2000,
        strategy: 'lru',
        warmup: true,
      },
      {
        name: 'knowledge_redis',
        type: 'redis',
        ttl: 7200,
        strategy: 'lfu',
        warmup: false,
      },
    ],
    invalidation: [
      { trigger: 'update', scope: 'key' },
      { trigger: 'delete', scope: 'key' },
    ],
    prefetch: true,
    compression: true,
    encryption: false,
  },
);

export const cacheConfigs = {
  productCatalogCacheConfig,
  knowledgeArticleCacheConfig,
};

export default cacheConfigs;
