import type { HookContext } from '@objectstack/spec/data';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ReportFilterValidation,
  ReportAccessControl,
  ReportCacheInvalidation,
  ReportExecutionTracking
} from '../../../src/report.hook';

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

// ─── ReportFilterValidation ────────────────────────────────────────────────────

describe('ReportFilterValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct hook metadata', () => {
    expect(ReportFilterValidation.name).toBe('ReportFilterValidation');
    expect(ReportFilterValidation.object).toBe('report');
    expect(ReportFilterValidation.events).toContain('beforeInsert');
    expect(ReportFilterValidation.events).toContain('beforeUpdate');
  });

  it('should reject invalid JSON in filters', async () => {
    const doc = { filters: '{bad json' };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(ReportFilterValidation.handler(ctx)).rejects.toThrow(
      'Validation Error: filters field contains invalid JSON'
    );
  });

  it('should reject non-array filters', async () => {
    const doc = { filters: JSON.stringify({ not: 'an array' }) };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(ReportFilterValidation.handler(ctx)).rejects.toThrow(
      'Filters must be a JSON array'
    );
  });

  it('should reject filters missing field or operator', async () => {
    const doc = { filters: JSON.stringify([{ value: 'x' }]) };
    const ctx = createMockContext('beforeUpdate', doc);

    await expect(ReportFilterValidation.handler(ctx)).rejects.toThrow(
      'Each filter must have "field" and "operator" properties'
    );
  });

  it('should accept valid filters', async () => {
    const doc = {
      filters: JSON.stringify([{ field: 'amount', operator: '>', value: 100 }])
    };
    const ctx = createMockContext('beforeInsert', doc);
    mockQlFind.mockResolvedValue([]);

    await expect(ReportFilterValidation.handler(ctx)).resolves.toBeUndefined();
  });

  it('should reject invalid object_name', async () => {
    const doc = { object_name: 'nonexistent_obj' };
    mockQlFind.mockRejectedValue(new Error('unknown object'));
    const ctx = createMockContext('beforeInsert', doc);

    await expect(ReportFilterValidation.handler(ctx)).rejects.toThrow(
      'Validation Error: Source object "nonexistent_obj" does not exist'
    );
  });

  it('should accept valid object_name', async () => {
    const doc = { object_name: 'account' };
    mockQlFind.mockResolvedValue([]);
    const ctx = createMockContext('beforeInsert', doc);

    await expect(ReportFilterValidation.handler(ctx)).resolves.toBeUndefined();
  });
});

// ─── ReportAccessControl ───────────────────────────────────────────────────────

describe('ReportAccessControl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct hook metadata', () => {
    expect(ReportAccessControl.name).toBe('ReportAccessControl');
    expect(ReportAccessControl.object).toBe('report');
    expect(ReportAccessControl.events).toContain('beforeRead');
  });

  it('should allow access when user is the owner', async () => {
    const report = { _id: 'rpt_001', owner_id: 'user_123', is_public: false };
    const ctx = createMockContext('beforeRead', {});
    ctx.result = report;

    await expect(ReportAccessControl.handler(ctx)).resolves.toBeUndefined();
  });

  it('should allow access when report is public', async () => {
    const report = { _id: 'rpt_002', owner_id: 'other_user', is_public: true };
    const ctx = createMockContext('beforeRead', {});
    ctx.result = report;

    await expect(ReportAccessControl.handler(ctx)).resolves.toBeUndefined();
  });

  it('should deny access for non-owner on private report', async () => {
    const report = { _id: 'rpt_003', owner_id: 'other_user', is_public: false };
    const ctx = createMockContext('beforeRead', {});
    ctx.result = report;

    await expect(ReportAccessControl.handler(ctx)).rejects.toThrow(
      'Access Denied: You do not have permission to view this report'
    );
  });

  it('should pass when result is undefined', async () => {
    const ctx = createMockContext('beforeRead', {});
    ctx.result = undefined;

    await expect(ReportAccessControl.handler(ctx)).resolves.toBeUndefined();
  });
});

// ─── ReportCacheInvalidation ───────────────────────────────────────────────────

describe('ReportCacheInvalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct hook metadata', () => {
    expect(ReportCacheInvalidation.name).toBe('ReportCacheInvalidation');
    expect(ReportCacheInvalidation.object).toBe('report');
    expect(ReportCacheInvalidation.events).toContain('afterUpdate');
  });

  it('should mark cached snapshots as stale', async () => {
    const report = { _id: 'rpt_001', name: 'Sales Report' };
    const snapshots = [{ _id: 'snap_001' }, { _id: 'snap_002' }];
    mockQlFind.mockResolvedValue(snapshots);
    mockQlDocUpdate.mockResolvedValue({});

    const ctx = createMockContext('afterUpdate', report);

    await ReportCacheInvalidation.handler(ctx);

    expect(mockQlFind).toHaveBeenCalledWith('snapshot', {
      filters: [['report_id', '=', 'rpt_001']]
    });
    expect(mockQlDocUpdate).toHaveBeenCalledTimes(2);
    expect(mockQlDocUpdate).toHaveBeenCalledWith('snapshot', 'snap_001', { is_stale: true });
    expect(mockQlDocUpdate).toHaveBeenCalledWith('snapshot', 'snap_002', { is_stale: true });
  });

  it('should skip when report has no _id', async () => {
    const ctx = createMockContext('afterUpdate', {});
    ctx.result = {};

    await ReportCacheInvalidation.handler(ctx);

    expect(mockQlFind).not.toHaveBeenCalled();
  });

  it('should not throw when cache invalidation fails', async () => {
    const report = { _id: 'rpt_001' };
    mockQlFind.mockRejectedValue(new Error('DB down'));

    const ctx = createMockContext('afterUpdate', report);

    await expect(ReportCacheInvalidation.handler(ctx)).resolves.toBeUndefined();
  });
});

// ─── ReportExecutionTracking ───────────────────────────────────────────────────

describe('ReportExecutionTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct hook metadata', () => {
    expect(ReportExecutionTracking.name).toBe('ReportExecutionTracking');
    expect(ReportExecutionTracking.object).toBe('report');
    expect(ReportExecutionTracking.events).toContain('afterRead');
  });

  it('should increment run_count and set last_run_at', async () => {
    const report = { _id: 'rpt_001', run_count: 5 };
    mockQlDocUpdate.mockResolvedValue({});
    const ctx = createMockContext('afterRead', report);

    await ReportExecutionTracking.handler(ctx);

    expect(mockQlDocUpdate).toHaveBeenCalledWith(
      'report',
      'rpt_001',
      expect.objectContaining({ run_count: 6 })
    );
    // last_run_at should be an ISO string
    const updateArg = mockQlDocUpdate.mock.calls[0][2];
    expect(updateArg.last_run_at).toBeDefined();
    expect(typeof updateArg.last_run_at).toBe('string');
  });

  it('should default run_count to 1 when undefined', async () => {
    const report = { _id: 'rpt_002' };
    mockQlDocUpdate.mockResolvedValue({});
    const ctx = createMockContext('afterRead', report);

    await ReportExecutionTracking.handler(ctx);

    expect(mockQlDocUpdate).toHaveBeenCalledWith(
      'report',
      'rpt_002',
      expect.objectContaining({ run_count: 1 })
    );
  });

  it('should skip when report has no _id', async () => {
    const ctx = createMockContext('afterRead', {});
    ctx.result = {};

    await ReportExecutionTracking.handler(ctx);

    expect(mockQlDocUpdate).not.toHaveBeenCalled();
  });

  it('should not throw when tracking update fails', async () => {
    const report = { _id: 'rpt_003', run_count: 0 };
    mockQlDocUpdate.mockRejectedValue(new Error('DB down'));
    const ctx = createMockContext('afterRead', report);

    await expect(ReportExecutionTracking.handler(ctx)).resolves.toBeUndefined();
  });
});
