import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import {
  TouchpointRecordingTrigger,
  RevenueAttributionTrigger
} from '../../../src/hooks/attribution.hook';

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
      doc: { get: mockQlDocGet, create: mockQlDocCreate, update: mockQlDocUpdate }
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

describe('Attribution Hook - TouchpointRecordingTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set default attribution_weight to 100 for first_touch model', async () => {
    const doc = { touchpoint_type: 'web_visit', channel: 'organic', attribution_model: 'first_touch' };
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await TouchpointRecordingTrigger.handler(ctx);

    expect(ctx.input.doc.attribution_weight).toBe(100);
    consoleSpy.mockRestore();
  });

  it('should set attribution_weight to 0 for linear model', async () => {
    const doc = { touchpoint_type: 'email_click', channel: 'email', attribution_model: 'linear' };
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await TouchpointRecordingTrigger.handler(ctx);

    expect(ctx.input.doc.attribution_weight).toBe(0);
    consoleSpy.mockRestore();
  });

  it('should set attribution_weight to 20 for u_shaped model', async () => {
    const doc = { touchpoint_type: 'ad_click', channel: 'paid', attribution_model: 'u_shaped' };
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await TouchpointRecordingTrigger.handler(ctx);

    expect(ctx.input.doc.attribution_weight).toBe(20);
    consoleSpy.mockRestore();
  });

  it('should set touchpoint_date when not provided', async () => {
    const doc = { touchpoint_type: 'web_visit', channel: 'organic' };
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await TouchpointRecordingTrigger.handler(ctx);

    expect(ctx.input.doc.touchpoint_date).toBeDefined();
    consoleSpy.mockRestore();
  });

  it('should return early when touchpoint_type is missing', async () => {
    const doc = { channel: 'organic' };
    const ctx = createMockContext('beforeInsert', doc);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation();

    await TouchpointRecordingTrigger.handler(ctx);

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('requires touchpoint_type'));
    expect(ctx.input.doc.attribution_weight).toBeUndefined();
    errorSpy.mockRestore();
  });

  it('should return early when channel is missing', async () => {
    const doc = { touchpoint_type: 'web_visit' };
    const ctx = createMockContext('beforeInsert', doc);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation();

    await TouchpointRecordingTrigger.handler(ctx);

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('requires channel'));
    errorSpy.mockRestore();
  });

  it('should not overwrite existing attribution_weight', async () => {
    const doc = { touchpoint_type: 'web_visit', channel: 'organic', attribution_weight: 75 };
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await TouchpointRecordingTrigger.handler(ctx);

    expect(ctx.input.doc.attribution_weight).toBe(75);
    consoleSpy.mockRestore();
  });
});

describe('Attribution Hook - RevenueAttributionTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update campaign revenue on conversion touchpoint', async () => {
    const touchpoint = {
      _id: 'tp_001',
      campaign: 'camp_001',
      is_conversion: true,
      revenue_attributed: 5000
    };
    mockQlFind
      .mockResolvedValueOnce([{ _id: 'camp_001', actual_revenue: 10000 }])
      .mockResolvedValueOnce([touchpoint]);

    const ctx = createMockContext('afterInsert', touchpoint, undefined, touchpoint);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await RevenueAttributionTrigger.handler(ctx);

    expect(mockQlDocUpdate).toHaveBeenCalledWith('campaign', 'camp_001', {
      actual_revenue: 15000
    });
    consoleSpy.mockRestore();
  });

  it('should skip non-conversion touchpoints', async () => {
    const touchpoint = { _id: 'tp_002', campaign: 'camp_002', is_conversion: false };
    const ctx = createMockContext('afterInsert', touchpoint, undefined, touchpoint);

    await RevenueAttributionTrigger.handler(ctx);

    expect(mockQlFind).not.toHaveBeenCalled();
  });

  it('should skip when no campaign linked', async () => {
    const touchpoint = { _id: 'tp_003', is_conversion: true };
    const ctx = createMockContext('afterInsert', touchpoint, undefined, touchpoint);

    await RevenueAttributionTrigger.handler(ctx);

    expect(mockQlFind).not.toHaveBeenCalled();
  });

  it('should recalculate linear attribution weights', async () => {
    const touchpoint = {
      _id: 'tp_004',
      campaign: 'camp_004',
      is_conversion: true,
      revenue_attributed: 1000
    };
    const allTouchpoints = [
      { _id: 'tp_a', campaign: 'camp_004', attribution_model: 'linear' },
      { _id: 'tp_b', campaign: 'camp_004', attribution_model: 'linear' },
      { _id: 'tp_c', campaign: 'camp_004', attribution_model: 'first_touch' }
    ];
    mockQlFind
      .mockResolvedValueOnce([{ _id: 'camp_004', actual_revenue: 0 }])
      .mockResolvedValueOnce(allTouchpoints);

    const ctx = createMockContext('afterInsert', touchpoint, undefined, touchpoint);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await RevenueAttributionTrigger.handler(ctx);

    // Only linear touchpoints should get updated weights
    const updateCalls = mockQlDocUpdate.mock.calls.filter((c: any) => c[0] === 'touchpoint');
    expect(updateCalls.length).toBe(2); // 2 linear touchpoints
    consoleSpy.mockRestore();
  });
});
