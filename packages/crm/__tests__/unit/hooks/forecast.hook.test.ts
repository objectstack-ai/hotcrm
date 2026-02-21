import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import {
  ForecastCalculationTrigger,
  ForecastAggregationTrigger
} from '../../../src/hooks/forecast.hook';

vi.mock('@hotcrm/core', () => ({
  createLogger: () => ({
    info: (...args: any[]) => console.log(...args),
    warn: (...args: any[]) => console.warn(...args),
    error: (...args: any[]) => console.error(...args),
    debug: (...args: any[]) => console.debug(...args),
    fatal: (...args: any[]) => console.error(...args),
  }),
  logger: {
    info: (...args: any[]) => console.log(...args),
    warn: (...args: any[]) => console.warn(...args),
    error: (...args: any[]) => console.error(...args),
    debug: (...args: any[]) => console.debug(...args),
    fatal: (...args: any[]) => console.error(...args),
  },
}));

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

describe('Forecast Hook - ForecastCalculationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate quota_attainment', async () => {
    const doc = { amount: 75000, quota: 100000 };
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await ForecastCalculationTrigger.handler(ctx);

    expect(doc.quota_attainment).toBe(75);
    consoleSpy.mockRestore();
  });

  it('should calculate gap_to_quota', async () => {
    const doc = { amount: 60000, quota: 100000 };
    const ctx = createMockContext('beforeUpdate', doc, {});
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await ForecastCalculationTrigger.handler(ctx);

    expect(doc.gap_to_quota).toBe(40000);
    consoleSpy.mockRestore();
  });

  it('should calculate adjusted_amount with manager_adjustment', async () => {
    const doc = { amount: 80000, quota: 100000, manager_adjustment: 5000 };
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await ForecastCalculationTrigger.handler(ctx);

    expect(doc.adjusted_amount).toBe(85000);
    consoleSpy.mockRestore();
  });

  it('should set quota_attainment to 0 when quota is 0', async () => {
    const doc = { amount: 50000, quota: 0 };
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await ForecastCalculationTrigger.handler(ctx);

    expect(doc.quota_attainment).toBe(0);
    consoleSpy.mockRestore();
  });
});

describe('Forecast Hook - ForecastAggregationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should aggregate amounts from forecast items', async () => {
    const forecast = { _id: 'f1', owner_id: 'user_1', forecast_period: 'Q1', period_start: '2025-01-01' };
    const ctx = createMockContext('afterInsert', forecast);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    mockQlFind.mockResolvedValue([
      { _id: 'f1', forecast_category: 'pipeline', amount: 30000, pipeline_amount: 0, closed_amount: 0 },
      { _id: 'f2', forecast_category: 'closed', amount: 50000, pipeline_amount: 0, closed_amount: 0 }
    ]);

    await ForecastAggregationTrigger.handler(ctx);

    expect(mockQlDocUpdate).toHaveBeenCalledWith('forecast', 'f1', { pipeline_amount: 30000, closed_amount: 50000 });
    expect(mockQlDocUpdate).toHaveBeenCalledWith('forecast', 'f2', { pipeline_amount: 30000, closed_amount: 50000 });
    consoleSpy.mockRestore();
  });

  it('should skip aggregation when owner_id is missing', async () => {
    const forecast = { forecast_period: 'Q1' };
    const ctx = createMockContext('afterInsert', forecast);

    await ForecastAggregationTrigger.handler(ctx);

    expect(mockQlFind).not.toHaveBeenCalled();
  });
});
