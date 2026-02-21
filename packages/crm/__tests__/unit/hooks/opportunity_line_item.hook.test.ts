import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import {
  OpportunityLineItemCalculationTrigger,
  OpportunityLineItemRollupTrigger
} from '../../../src/hooks/opportunity_line_item.hook';

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

describe('OpportunityLineItem Hook - OpportunityLineItemCalculationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate total_price from quantity * unit_price', async () => {
    const doc = { quantity: 5, unit_price: 100 };
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await OpportunityLineItemCalculationTrigger.handler(ctx);

    expect(doc.total_price).toBe(500);
    consoleSpy.mockRestore();
  });

  it('should apply discount_percent correctly', async () => {
    const doc = { quantity: 10, unit_price: 200, discount_percent: 25 };
    const ctx = createMockContext('beforeUpdate', doc, {});
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await OpportunityLineItemCalculationTrigger.handler(ctx);

    expect(doc.total_price).toBe(1500);
    consoleSpy.mockRestore();
  });

  it('should calculate discount_amount', async () => {
    const doc = { quantity: 4, unit_price: 50, discount_percent: 10 };
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await OpportunityLineItemCalculationTrigger.handler(ctx);

    expect(doc.discount_amount).toBe(20);
    expect(doc.total_price).toBe(180);
    consoleSpy.mockRestore();
  });

  it('should handle zero discount_percent', async () => {
    const doc = { quantity: 3, unit_price: 100, discount_percent: 0 };
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await OpportunityLineItemCalculationTrigger.handler(ctx);

    expect(doc.discount_amount).toBe(0);
    expect(doc.total_price).toBe(300);
    consoleSpy.mockRestore();
  });
});

describe('OpportunityLineItem Hook - OpportunityLineItemRollupTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update opportunity amount after insert', async () => {
    const lineItem = { opportunity_id: 'opp_1', total_price: 500 };
    const ctx = createMockContext('afterInsert', lineItem);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    mockQlFind.mockResolvedValue([
      { total_price: 500 },
      { total_price: 300 }
    ]);

    await OpportunityLineItemRollupTrigger.handler(ctx);

    expect(mockQlDocUpdate).toHaveBeenCalledWith('opportunity', 'opp_1', { amount: 800 });
    consoleSpy.mockRestore();
  });

  it('should skip rollup when opportunity_id is missing', async () => {
    const lineItem = { total_price: 100 };
    const ctx = createMockContext('afterInsert', lineItem);

    await OpportunityLineItemRollupTrigger.handler(ctx);

    expect(mockQlFind).not.toHaveBeenCalled();
  });
});
