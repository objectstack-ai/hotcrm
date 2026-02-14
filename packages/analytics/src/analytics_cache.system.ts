/**
 * Analytics Cache Configuration
 *
 * Caching configurations for analytics queries, KPI snapshots,
 * and dashboard widgets to improve read performance.
 */

import type { CacheConfig } from '@objectstack/spec/system';
import { CacheConfigSchema } from '@objectstack/spec/system';

export const ReportResultsCache = {
  enabled: true,
  tiers: [
    { name: 'report_results', type: 'memory', ttl: 300, maxSize: 1000, strategy: 'lru', warmup: false },
  ],
  invalidation: [
    { trigger: 'update', scope: 'key' },
    { trigger: 'manual', scope: 'pattern' },
  ],
  prefetch: false,
  compression: true,
  encryption: false,
} satisfies CacheConfig;

CacheConfigSchema.parse(ReportResultsCache);

export const KpiSnapshotCache = {
  enabled: true,
  tiers: [
    { name: 'kpi_snapshot', type: 'memory', ttl: 60, maxSize: 500, strategy: 'lru', warmup: false },
  ],
  invalidation: [
    { trigger: 'update', scope: 'key' },
  ],
  prefetch: false,
  compression: false,
  encryption: false,
} satisfies CacheConfig;

CacheConfigSchema.parse(KpiSnapshotCache);

export const DashboardWidgetCache = {
  enabled: true,
  tiers: [
    { name: 'dashboard_widget', type: 'memory', ttl: 120, maxSize: 200, strategy: 'lru', warmup: false },
  ],
  invalidation: [
    { trigger: 'update', scope: 'key' },
    { trigger: 'manual', scope: 'all' },
  ],
  prefetch: false,
  compression: false,
  encryption: false,
} satisfies CacheConfig;

CacheConfigSchema.parse(DashboardWidgetCache);

export default { ReportResultsCache, KpiSnapshotCache, DashboardWidgetCache };
