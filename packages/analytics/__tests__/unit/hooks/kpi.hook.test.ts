import type { HookContext } from '@objectstack/spec/data';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  KPIThresholdAlert,
  KPITrendCalculation,
  KPIAutoRefresh
} from '../../../src/kpi.hook';

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

// ─── KPIThresholdAlert ─────────────────────────────────────────────────────────

describe('KPIThresholdAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct hook metadata', () => {
    expect(KPIThresholdAlert.name).toBe('KPIThresholdAlert');
    expect(KPIThresholdAlert.object).toBe('kpi');
    expect(KPIThresholdAlert.events).toContain('afterUpdate');
  });

  it('should create critical alert when value drops below critical threshold', async () => {
    const kpi = {
      _id: 'kpi_001',
      name: 'Revenue',
      current_value: 40,
      threshold_critical: 50,
      threshold_warning: 70,
      owner_id: 'user_123'
    };
    const previous = { current_value: 60 };
    mockQlDocCreate.mockResolvedValue({});

    const ctx = createMockContext('afterUpdate', kpi, previous);

    await KPIThresholdAlert.handler(ctx);

    expect(mockQlDocCreate).toHaveBeenCalledWith(
      'activity',
      expect.objectContaining({
        Priority: 'critical',
        Subject: expect.stringContaining('Critical Alert')
      })
    );
  });

  it('should create warning alert when value drops below warning threshold', async () => {
    const kpi = {
      _id: 'kpi_002',
      name: 'NPS Score',
      current_value: 60,
      threshold_warning: 70,
      owner_id: 'user_123'
    };
    const previous = { current_value: 75 };
    mockQlDocCreate.mockResolvedValue({});

    const ctx = createMockContext('afterUpdate', kpi, previous);

    await KPIThresholdAlert.handler(ctx);

    expect(mockQlDocCreate).toHaveBeenCalledWith(
      'activity',
      expect.objectContaining({
        Priority: 'high',
        Subject: expect.stringContaining('Warning Alert')
      })
    );
  });

  it('should skip when value has not changed', async () => {
    const kpi = {
      _id: 'kpi_003',
      name: 'Pipeline',
      current_value: 100,
      threshold_warning: 50
    };
    const previous = { current_value: 100 };
    const ctx = createMockContext('afterUpdate', kpi, previous);

    await KPIThresholdAlert.handler(ctx);

    expect(mockQlDocCreate).not.toHaveBeenCalled();
  });

  it('should skip when kpi has no _id', async () => {
    const ctx = createMockContext('afterUpdate', {});
    ctx.result = {};

    await KPIThresholdAlert.handler(ctx);

    expect(mockQlDocCreate).not.toHaveBeenCalled();
  });

  it('should not throw when alert creation fails', async () => {
    const kpi = {
      _id: 'kpi_004',
      name: 'Revenue',
      current_value: 30,
      threshold_critical: 50,
      owner_id: 'user_123'
    };
    const previous = { current_value: 60 };
    mockQlDocCreate.mockRejectedValue(new Error('DB down'));

    const ctx = createMockContext('afterUpdate', kpi, previous);

    await expect(KPIThresholdAlert.handler(ctx)).resolves.toBeUndefined();
  });
});

// ─── KPITrendCalculation ───────────────────────────────────────────────────────

describe('KPITrendCalculation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct hook metadata', () => {
    expect(KPITrendCalculation.name).toBe('KPITrendCalculation');
    expect(KPITrendCalculation.object).toBe('kpi');
    expect(KPITrendCalculation.events).toContain('beforeUpdate');
  });

  it('should set trend to "up" when value increases significantly', async () => {
    const doc = { current_value: 120 };
    const previous = { current_value: 100 };
    const ctx = createMockContext('beforeUpdate', doc, previous);

    await KPITrendCalculation.handler(ctx);

    expect(doc.trend).toBe('up');
  });

  it('should set trend to "down" when value decreases significantly', async () => {
    const doc = { current_value: 80 } as any;
    const previous = { current_value: 100 };
    const ctx = createMockContext('beforeUpdate', doc, previous);

    await KPITrendCalculation.handler(ctx);

    expect(doc.trend).toBe('down');
  });

  it('should set trend to "flat" when change is within 1% threshold', async () => {
    const doc = { current_value: 100.5 } as any;
    const previous = { current_value: 100 };
    const ctx = createMockContext('beforeUpdate', doc, previous);

    await KPITrendCalculation.handler(ctx);

    expect(doc.trend).toBe('flat');
  });

  it('should skip when current_value is null', async () => {
    const doc = { current_value: null } as any;
    const previous = { current_value: 100 };
    const ctx = createMockContext('beforeUpdate', doc, previous);

    await KPITrendCalculation.handler(ctx);

    expect(doc.trend).toBeUndefined();
  });

  it('should skip when previous current_value is null', async () => {
    const doc = { current_value: 100 } as any;
    const previous = { current_value: null };
    const ctx = createMockContext('beforeUpdate', doc, previous);

    await KPITrendCalculation.handler(ctx);

    expect(doc.trend).toBeUndefined();
  });
});

// ─── KPIAutoRefresh ────────────────────────────────────────────────────────────

describe('KPIAutoRefresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct hook metadata', () => {
    expect(KPIAutoRefresh.name).toBe('KPIAutoRefresh');
    expect(KPIAutoRefresh.object).toBe('kpi');
    expect(KPIAutoRefresh.events).toContain('afterInsert');
  });

  it('should schedule refresh activity after KPI creation', async () => {
    const kpi = {
      _id: 'kpi_001',
      name: 'Win Rate',
      period: 'weekly',
      owner_id: 'user_123'
    };
    mockQlDocCreate.mockResolvedValue({});
    const ctx = createMockContext('afterInsert', kpi);

    await KPIAutoRefresh.handler(ctx);

    expect(mockQlDocCreate).toHaveBeenCalledWith(
      'activity',
      expect.objectContaining({
        Subject: expect.stringContaining('KPI Refresh Scheduled'),
        Type: 'Schedule'
      })
    );
  });

  it('should skip when kpi has no _id', async () => {
    const ctx = createMockContext('afterInsert', {});
    ctx.result = {};

    await KPIAutoRefresh.handler(ctx);

    expect(mockQlDocCreate).not.toHaveBeenCalled();
  });

  it('should skip when kpi has no period', async () => {
    const kpi = { _id: 'kpi_002', name: 'Test' };
    const ctx = createMockContext('afterInsert', kpi);

    await KPIAutoRefresh.handler(ctx);

    expect(mockQlDocCreate).not.toHaveBeenCalled();
  });

  it('should not throw when scheduling fails', async () => {
    const kpi = {
      _id: 'kpi_003',
      name: 'Pipeline',
      period: 'monthly',
      owner_id: 'user_123'
    };
    mockQlDocCreate.mockRejectedValue(new Error('DB down'));
    const ctx = createMockContext('afterInsert', kpi);

    await expect(KPIAutoRefresh.handler(ctx)).resolves.toBeUndefined();
  });
});
