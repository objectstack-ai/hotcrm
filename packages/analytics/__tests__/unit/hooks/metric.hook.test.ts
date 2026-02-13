import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HookContext } from '@objectstack/spec/data';
import { MetricValidationTrigger } from '../../../src/hooks/metric.hook';

const createMockContext = (
  event: string,
  doc: any,
  previous?: any,
  result?: any
): HookContext => {
  const baseContext: any = {
    event,
    ql: {
      find: vi.fn(),
      doc: { get: vi.fn(), create: vi.fn(), update: vi.fn() }
    },
    session: { userId: 'user_123', tenantId: 'tenant_123' }
  };

  if (event.startsWith('before')) {
    baseContext.input = { doc };
    baseContext.previous = previous;
  } else {
    baseContext.result = result || doc;
    baseContext.previous = previous;
    baseContext.input = { doc };
  }
  return baseContext;
};

describe('Metric Hook - MetricValidationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should accept metric with formula', async () => {
    const doc = {
      name: 'Revenue Growth',
      formula: 'SUM(amount) / COUNT(deals)',
      source_object: 'opportunity'
    };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(MetricValidationTrigger.handler(ctx)).resolves.not.toThrow();
  });

  it('should accept metric with aggregation_type instead of formula', async () => {
    const doc = {
      name: 'Total Deals',
      aggregation_type: 'count',
      source_object: 'opportunity'
    };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(MetricValidationTrigger.handler(ctx)).resolves.not.toThrow();
  });

  it('should throw when neither formula nor aggregation_type is set', async () => {
    const doc = { name: 'Bad Metric', source_object: 'opportunity' };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(MetricValidationTrigger.handler(ctx)).rejects.toThrow(
      'Either formula or aggregation_type must be specified'
    );
  });

  it('should accept valid JSON array in filters', async () => {
    const doc = {
      name: 'Filtered Metric',
      aggregation_type: 'sum',
      filters: JSON.stringify([['stage', '=', 'closed_won']])
    };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(MetricValidationTrigger.handler(ctx)).resolves.not.toThrow();
  });

  it('should throw on invalid JSON in filters', async () => {
    const doc = {
      name: 'Bad Filter Metric',
      aggregation_type: 'sum',
      filters: '{not valid json}'
    };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(MetricValidationTrigger.handler(ctx)).rejects.toThrow(
      'Invalid JSON in filters field'
    );
  });

  it('should throw when filters is valid JSON but not an array', async () => {
    const doc = {
      name: 'Object Filter Metric',
      aggregation_type: 'sum',
      filters: JSON.stringify({ field: 'stage', op: '=' })
    };
    const ctx = createMockContext('beforeUpdate', doc);

    await expect(MetricValidationTrigger.handler(ctx)).rejects.toThrow(
      'Filters must be a JSON array'
    );
  });

  it('should detect circular self-reference in formula', async () => {
    const doc = {
      name: 'Revenue Growth',
      formula: 'Revenue Growth * 1.1',
      source_object: 'opportunity'
    };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(MetricValidationTrigger.handler(ctx)).rejects.toThrow(
      'Circular dependency detected'
    );
  });

  it('should allow formula referencing other metric names', async () => {
    const doc = {
      name: 'Total Revenue',
      formula: 'SUM(amount)',
      source_object: 'opportunity'
    };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(MetricValidationTrigger.handler(ctx)).resolves.not.toThrow();
  });
});
