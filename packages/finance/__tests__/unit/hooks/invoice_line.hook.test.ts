import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import {
  InvoiceLineCalculationTrigger,
  InvoiceLineTotalUpdateTrigger
} from '../../../src/hooks/invoice_line.hook';

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

describe('Invoice Line Hook - InvoiceLineCalculationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate amount as quantity * unit_price', async () => {
    const doc = { quantity: 5, unit_price: 200 };
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await InvoiceLineCalculationTrigger.handler(ctx);

    expect(ctx.input.doc.amount).toBe(1000);
    consoleSpy.mockRestore();
  });

  it('should log error when quantity is zero or negative', async () => {
    const doc = { quantity: 0, unit_price: 100 };
    const ctx = createMockContext('beforeInsert', doc);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation();

    await InvoiceLineCalculationTrigger.handler(ctx);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invoice Line Calculation Error'),
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });

  it('should log error when unit_price is negative', async () => {
    const doc = { quantity: 3, unit_price: -50 };
    const ctx = createMockContext('beforeUpdate', doc);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation();

    await InvoiceLineCalculationTrigger.handler(ctx);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invoice Line Calculation Error'),
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });

  it('should default missing fields to zero and throw for quantity', async () => {
    const doc = {};
    const ctx = createMockContext('beforeInsert', doc);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation();

    await InvoiceLineCalculationTrigger.handler(ctx);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invoice Line Calculation Error'),
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });
});

describe('Invoice Line Hook - InvoiceLineTotalUpdateTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update invoice total_amount from line items', async () => {
    const lineItem = { _id: 'line_001', invoice: 'inv_001', amount: 500 };
    mockQlFind.mockResolvedValue([
      { _id: 'line_001', amount: 500 },
      { _id: 'line_002', amount: 300 }
    ]);

    const ctx = createMockContext('afterInsert', lineItem, undefined, lineItem);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await InvoiceLineTotalUpdateTrigger.handler(ctx);

    expect(mockQlFind).toHaveBeenCalledWith('invoice_line', {
      filters: [['invoice', '=', 'inv_001']]
    });
    expect(mockQlDocUpdate).toHaveBeenCalledWith('invoice', 'inv_001', {
      total_amount: 800
    });
    consoleSpy.mockRestore();
  });

  it('should skip when line item has no linked invoice', async () => {
    const lineItem = { _id: 'line_002', amount: 200 };
    const ctx = createMockContext('afterInsert', lineItem, undefined, lineItem);

    await InvoiceLineTotalUpdateTrigger.handler(ctx);

    expect(mockQlFind).not.toHaveBeenCalled();
    expect(mockQlDocUpdate).not.toHaveBeenCalled();
  });

  it('should set total_amount to 0 when no line items found', async () => {
    const lineItem = { _id: 'line_003', invoice: 'inv_003', amount: 0 };
    mockQlFind.mockResolvedValue([]);

    const ctx = createMockContext('afterUpdate', lineItem, undefined, lineItem);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await InvoiceLineTotalUpdateTrigger.handler(ctx);

    expect(mockQlDocUpdate).toHaveBeenCalledWith('invoice', 'inv_003', {
      total_amount: 0
    });
    consoleSpy.mockRestore();
  });

  it('should log error when ql.find fails', async () => {
    const lineItem = { _id: 'line_004', invoice: 'inv_004', amount: 100 };
    mockQlFind.mockRejectedValue(new Error('Query failed'));

    const ctx = createMockContext('afterInsert', lineItem, undefined, lineItem);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation();

    await InvoiceLineTotalUpdateTrigger.handler(ctx);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invoice Line Total Update Error'),
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });
});
