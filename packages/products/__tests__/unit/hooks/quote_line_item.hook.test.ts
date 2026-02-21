import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import {
  QuoteLineCalculationTrigger,
  QuoteLineTotalUpdateTrigger
} from '../../../src/hooks/quote_line_item.hook';

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

describe('QuoteLineItem Hook - QuoteLineCalculationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate line total with discount and tax', async () => {
    const doc = { quantity: 10, unit_price: 100, discount_percent: 10, tax_rate: 8 };
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await QuoteLineCalculationTrigger.handler(ctx);

    expect(ctx.input.doc.line_total).toBe(1000);
    expect(ctx.input.doc.discount_amount).toBe(100);
    expect(ctx.input.doc.net_amount).toBe(900);
    expect(ctx.input.doc.tax_amount).toBe(72);
    expect(ctx.input.doc.final_amount).toBe(972);
    consoleSpy.mockRestore();
  });

  it('should handle zero discount', async () => {
    const doc = { quantity: 5, unit_price: 200, discount_percent: 0, tax_rate: 10 };
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await QuoteLineCalculationTrigger.handler(ctx);

    expect(ctx.input.doc.line_total).toBe(1000);
    expect(ctx.input.doc.discount_amount).toBe(0);
    expect(ctx.input.doc.net_amount).toBe(1000);
    expect(ctx.input.doc.tax_amount).toBe(100);
    expect(ctx.input.doc.final_amount).toBe(1100);
    consoleSpy.mockRestore();
  });

  it('should handle zero tax rate', async () => {
    const doc = { quantity: 3, unit_price: 50, discount_percent: 20, tax_rate: 0 };
    const ctx = createMockContext('beforeUpdate', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await QuoteLineCalculationTrigger.handler(ctx);

    expect(ctx.input.doc.line_total).toBe(150);
    expect(ctx.input.doc.discount_amount).toBe(30);
    expect(ctx.input.doc.net_amount).toBe(120);
    expect(ctx.input.doc.tax_amount).toBe(0);
    expect(ctx.input.doc.final_amount).toBe(120);
    consoleSpy.mockRestore();
  });

  it('should default missing fields to zero', async () => {
    const doc = {};
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await QuoteLineCalculationTrigger.handler(ctx);

    expect(ctx.input.doc.line_total).toBe(0);
    expect(ctx.input.doc.final_amount).toBe(0);
    consoleSpy.mockRestore();
  });

  it('should calculate correctly on beforeUpdate', async () => {
    const doc = { quantity: 1, unit_price: 999, discount_percent: 50, tax_rate: 5 };
    const ctx = createMockContext('beforeUpdate', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await QuoteLineCalculationTrigger.handler(ctx);

    expect(ctx.input.doc.line_total).toBe(999);
    expect(ctx.input.doc.discount_amount).toBe(499.5);
    expect(ctx.input.doc.net_amount).toBe(499.5);
    expect(ctx.input.doc.tax_amount).toBeCloseTo(24.975);
    expect(ctx.input.doc.final_amount).toBeCloseTo(524.475);
    consoleSpy.mockRestore();
  });
});

describe('QuoteLineItem Hook - QuoteLineTotalUpdateTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should recalculate quote totals after line item insert', async () => {
    const lineItem = { _id: 'li_001', quote: 'q_001', line_total: 500, discount_amount: 50, tax_amount: 45, final_amount: 495 };
    const allLineItems = [
      { line_total: 500, discount_amount: 50, tax_amount: 45, final_amount: 495 },
      { line_total: 300, discount_amount: 30, tax_amount: 27, final_amount: 297 }
    ];
    mockQlFind.mockResolvedValue(allLineItems);

    const ctx = createMockContext('afterInsert', lineItem, undefined, lineItem);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await QuoteLineTotalUpdateTrigger.handler(ctx);

    expect(mockQlDocUpdate).toHaveBeenCalledWith('quote', 'q_001', {
      subtotal: 800,
      discount_total: 80,
      tax_total: 72,
      grand_total: 792
    });
    consoleSpy.mockRestore();
  });

  it('should skip when line item has no quote reference', async () => {
    const lineItem = { _id: 'li_orphan', line_total: 100 };
    const ctx = createMockContext('afterInsert', lineItem, undefined, lineItem);

    await QuoteLineTotalUpdateTrigger.handler(ctx);

    expect(mockQlFind).not.toHaveBeenCalled();
    expect(mockQlDocUpdate).not.toHaveBeenCalled();
  });

  it('should skip when no line items found for quote', async () => {
    const lineItem = { _id: 'li_002', quote: 'q_empty' };
    mockQlFind.mockResolvedValue([]);

    const ctx = createMockContext('afterUpdate', lineItem, undefined, lineItem);

    await QuoteLineTotalUpdateTrigger.handler(ctx);

    expect(mockQlDocUpdate).not.toHaveBeenCalled();
  });

  it('should handle single line item', async () => {
    const lineItem = { _id: 'li_003', quote: 'q_002' };
    mockQlFind.mockResolvedValue([
      { line_total: 1000, discount_amount: 100, tax_amount: 90, final_amount: 990 }
    ]);

    const ctx = createMockContext('afterUpdate', lineItem, undefined, lineItem);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await QuoteLineTotalUpdateTrigger.handler(ctx);

    expect(mockQlDocUpdate).toHaveBeenCalledWith('quote', 'q_002', {
      subtotal: 1000,
      discount_total: 100,
      tax_total: 90,
      grand_total: 990
    });
    consoleSpy.mockRestore();
  });
});
