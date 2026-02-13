import type { HookContext } from '@objectstack/spec/data';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MetricFormulaValidation,
  MetricCircularDependency,
  MetricAggregationComputation
} from '../../../src/metric.hook';

const mockQlFind = vi.fn();
const mockQlDocGet = vi.fn();
const mockQlDocCreate = vi.fn();
const mockQlDocUpdate = vi.fn();

const createMockContext = (
  event: string,
  doc: any,
  previous?: any,
  result?: any
): HookContext => {
  const baseContext: any = {
    event,
    ql: {
      find: mockQlFind,
      doc: {
        get: mockQlDocGet,
        create: mockQlDocCreate,
        update: mockQlDocUpdate
      }
    },
    session: { userId: 'user_123', tenantId: 'tenant_123' },
    user: { id: 'user_123', email: 'user@test.com' }
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

// ─── MetricFormulaValidation ───────────────────────────────────────────────────

describe('MetricFormulaValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct hook metadata', () => {
    expect(MetricFormulaValidation.name).toBe('MetricFormulaValidation');
    expect(MetricFormulaValidation.object).toBe('metric');
    expect(MetricFormulaValidation.events).toContain('beforeInsert');
    expect(MetricFormulaValidation.events).toContain('beforeUpdate');
  });

  it('should reject empty formula', async () => {
    const doc = { formula: '  ' };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(MetricFormulaValidation.handler(ctx)).rejects.toThrow(
      'Validation Error: Formula cannot be empty'
    );
  });

  it('should reject formula with eval()', async () => {
    const doc = { formula: 'eval("bad code")' };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(MetricFormulaValidation.handler(ctx)).rejects.toThrow(
      'Validation Error: Formula contains forbidden expressions'
    );
  });

  it('should reject formula with import statement', async () => {
    const doc = { formula: 'import fs from "fs"' };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(MetricFormulaValidation.handler(ctx)).rejects.toThrow(
      'Validation Error: Formula contains forbidden expressions'
    );
  });

  it('should reject formula with require()', async () => {
    const doc = { formula: 'require("child_process")' };
    const ctx = createMockContext('beforeUpdate', doc);

    await expect(MetricFormulaValidation.handler(ctx)).rejects.toThrow(
      'Validation Error: Formula contains forbidden expressions'
    );
  });

  it('should reject formula with unbalanced parentheses', async () => {
    const doc = { formula: 'SUM(amount' };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(MetricFormulaValidation.handler(ctx)).rejects.toThrow(
      'Validation Error: Formula has unbalanced parentheses'
    );
  });

  it('should reject formula with unknown function', async () => {
    const doc = { formula: 'UNKNOWN(field)' };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(MetricFormulaValidation.handler(ctx)).rejects.toThrow(
      'Unknown function "UNKNOWN"'
    );
  });

  it('should accept valid formula with allowed functions', async () => {
    const doc = { formula: 'SUM(amount) + AVG(quantity)' };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(MetricFormulaValidation.handler(ctx)).resolves.toBeUndefined();
  });

  it('should accept formula with IF and COALESCE', async () => {
    const doc = { formula: 'IF(COALESCE(amount, 0) > 0, amount, 0)' };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(MetricFormulaValidation.handler(ctx)).resolves.toBeUndefined();
  });

  it('should skip validation when formula is null', async () => {
    const doc = { formula: null };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(MetricFormulaValidation.handler(ctx)).resolves.toBeUndefined();
  });
});

// ─── MetricCircularDependency ──────────────────────────────────────────────────

describe('MetricCircularDependency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct hook metadata', () => {
    expect(MetricCircularDependency.name).toBe('MetricCircularDependency');
    expect(MetricCircularDependency.object).toBe('metric');
    expect(MetricCircularDependency.events).toContain('beforeInsert');
    expect(MetricCircularDependency.events).toContain('beforeUpdate');
  });

  it('should reject self-referencing metric', async () => {
    const doc = {
      name: 'revenue',
      is_calculated: true,
      formula: 'SUM(${revenue})'
    };
    const ctx = createMockContext('beforeInsert', doc);
    mockQlFind.mockResolvedValue([]);

    await expect(MetricCircularDependency.handler(ctx)).rejects.toThrow(
      'Metric "revenue" cannot reference itself'
    );
  });

  it('should reject circular dependency chain', async () => {
    const doc = {
      name: 'metric_a',
      is_calculated: true,
      formula: '${metric_b} + 1'
    };
    // metric_b references metric_a
    mockQlFind.mockResolvedValueOnce([
      { name: 'metric_b', formula: '${metric_a} * 2' }
    ]);

    const ctx = createMockContext('beforeInsert', doc);

    await expect(MetricCircularDependency.handler(ctx)).rejects.toThrow(
      'Circular dependency detected'
    );
  });

  it('should allow non-circular dependencies', async () => {
    const doc = {
      name: 'total_revenue',
      is_calculated: true,
      formula: '${base_revenue} + ${bonus_revenue}'
    };
    mockQlFind
      .mockResolvedValueOnce([{ name: 'base_revenue', formula: 'SUM(amount)' }])
      .mockResolvedValueOnce([{ name: 'bonus_revenue', formula: 'SUM(bonus)' }]);

    const ctx = createMockContext('beforeInsert', doc);

    await expect(MetricCircularDependency.handler(ctx)).resolves.toBeUndefined();
  });

  it('should skip when is_calculated is false', async () => {
    const doc = { name: 'simple', is_calculated: false, formula: 'amount' };
    const ctx = createMockContext('beforeInsert', doc);

    await MetricCircularDependency.handler(ctx);

    expect(mockQlFind).not.toHaveBeenCalled();
  });

  it('should skip when formula has no references', async () => {
    const doc = { name: 'simple', is_calculated: true, formula: 'SUM(amount)' };
    const ctx = createMockContext('beforeInsert', doc);

    await MetricCircularDependency.handler(ctx);

    expect(mockQlFind).not.toHaveBeenCalled();
  });
});

// ─── MetricAggregationComputation ──────────────────────────────────────────────

describe('MetricAggregationComputation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct hook metadata', () => {
    expect(MetricAggregationComputation.name).toBe('MetricAggregationComputation');
    expect(MetricAggregationComputation.object).toBe('metric');
    expect(MetricAggregationComputation.events).toContain('afterInsert');
  });

  it('should compute count aggregation', async () => {
    const metric = {
      _id: 'met_001',
      name: 'Total Accounts',
      source_object: 'account',
      aggregation_type: 'count',
      formula: '_id'
    };
    mockQlFind.mockResolvedValue([
      { _id: '1', amount: 100 },
      { _id: '2', amount: 200 },
      { _id: '3', amount: 300 }
    ]);
    mockQlDocUpdate.mockResolvedValue({});

    const ctx = createMockContext('afterInsert', metric);

    await MetricAggregationComputation.handler(ctx);

    expect(mockQlDocUpdate).toHaveBeenCalledWith(
      'metric',
      'met_001',
      expect.objectContaining({
        description: expect.stringContaining('[Initial value: 3]')
      })
    );
  });

  it('should compute sum aggregation', async () => {
    const metric = {
      _id: 'met_002',
      name: 'Total Revenue',
      source_object: 'opportunity',
      aggregation_type: 'sum',
      formula: 'amount'
    };
    mockQlFind.mockResolvedValue([
      { _id: '1', amount: 100 },
      { _id: '2', amount: 200 }
    ]);
    mockQlDocUpdate.mockResolvedValue({});

    const ctx = createMockContext('afterInsert', metric);

    await MetricAggregationComputation.handler(ctx);

    expect(mockQlDocUpdate).toHaveBeenCalledWith(
      'metric',
      'met_002',
      expect.objectContaining({
        description: expect.stringContaining('[Initial value: 300]')
      })
    );
  });

  it('should compute avg aggregation', async () => {
    const metric = {
      _id: 'met_003',
      name: 'Average Deal',
      source_object: 'opportunity',
      aggregation_type: 'avg',
      formula: 'amount'
    };
    mockQlFind.mockResolvedValue([
      { _id: '1', amount: 100 },
      { _id: '2', amount: 300 }
    ]);
    mockQlDocUpdate.mockResolvedValue({});

    const ctx = createMockContext('afterInsert', metric);

    await MetricAggregationComputation.handler(ctx);

    expect(mockQlDocUpdate).toHaveBeenCalledWith(
      'metric',
      'met_003',
      expect.objectContaining({
        description: expect.stringContaining('[Initial value: 200]')
      })
    );
  });

  it('should skip when metric has no _id', async () => {
    const ctx = createMockContext('afterInsert', {});
    ctx.result = {};

    await MetricAggregationComputation.handler(ctx);

    expect(mockQlFind).not.toHaveBeenCalled();
  });

  it('should skip when source_object is missing', async () => {
    const metric = { _id: 'met_004', aggregation_type: 'count' };
    const ctx = createMockContext('afterInsert', metric);

    await MetricAggregationComputation.handler(ctx);

    expect(mockQlFind).not.toHaveBeenCalled();
  });

  it('should skip when no records found', async () => {
    const metric = {
      _id: 'met_005',
      name: 'Empty',
      source_object: 'account',
      aggregation_type: 'count',
      formula: '_id'
    };
    mockQlFind.mockResolvedValue([]);

    const ctx = createMockContext('afterInsert', metric);

    await MetricAggregationComputation.handler(ctx);

    expect(mockQlDocUpdate).not.toHaveBeenCalled();
  });

  it('should not throw when computation fails', async () => {
    const metric = {
      _id: 'met_006',
      name: 'Broken',
      source_object: 'account',
      aggregation_type: 'sum',
      formula: 'amount'
    };
    mockQlFind.mockRejectedValue(new Error('DB down'));

    const ctx = createMockContext('afterInsert', metric);

    await expect(MetricAggregationComputation.handler(ctx)).resolves.toBeUndefined();
  });
});
