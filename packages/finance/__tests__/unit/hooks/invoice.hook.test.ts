import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import {
  InvoiceStatusLifecycleTrigger,
  InvoiceLineCalculationTrigger
} from '../../../src/hooks/invoice.hook';

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

describe('Invoice Hook - InvoiceStatusLifecycleTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow valid transition from draft to sent', async () => {
    const doc = { status: 'sent', invoice_number: 'INV-001' };
    const previous = { status: 'draft', invoice_number: 'INV-001' };
    const ctx = createMockContext('beforeUpdate', doc, previous);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await InvoiceStatusLifecycleTrigger.handler(ctx);

    expect(ctx.input.doc.sent_date).toBeDefined();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('draft → sent'));
    consoleSpy.mockRestore();
  });

  it('should allow valid transition from sent to paid', async () => {
    const doc = { status: 'paid' };
    const previous = { status: 'sent', invoice_number: 'INV-002' };
    const ctx = createMockContext('beforeUpdate', doc, previous);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await InvoiceStatusLifecycleTrigger.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('sent → paid'));
    consoleSpy.mockRestore();
  });

  it('should log error for invalid transition from draft to paid', async () => {
    const doc = { status: 'paid' };
    const previous = { status: 'draft', invoice_number: 'INV-003' };
    const ctx = createMockContext('beforeUpdate', doc, previous);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation();

    await InvoiceStatusLifecycleTrigger.handler(ctx);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invoice Status Lifecycle Error'),
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });

  it('should skip when status has not changed', async () => {
    const doc = { status: 'draft' };
    const previous = { status: 'draft' };
    const ctx = createMockContext('beforeUpdate', doc, previous);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await InvoiceStatusLifecycleTrigger.handler(ctx);

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should skip when no previous state', async () => {
    const doc = { status: 'sent' };
    const ctx = createMockContext('beforeUpdate', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await InvoiceStatusLifecycleTrigger.handler(ctx);

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should warn for overdue transition', async () => {
    const doc = { status: 'overdue' };
    const previous = { status: 'sent', invoice_number: 'INV-004' };
    const ctx = createMockContext('beforeUpdate', doc, previous);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await InvoiceStatusLifecycleTrigger.handler(ctx);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('overdue'));
    warnSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});

describe('Invoice Hook - InvoiceLineCalculationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate line amount correctly', async () => {
    const doc = { quantity: 10, unit_price: 100, tax_rate: 0 };
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await InvoiceLineCalculationTrigger.handler(ctx);

    expect(ctx.input.doc.amount).toBe(1000);
    expect(ctx.input.doc.tax_amount).toBe(0);
    expect(ctx.input.doc.total).toBe(1000);
    consoleSpy.mockRestore();
  });

  it('should calculate with tax rate', async () => {
    const doc = { quantity: 5, unit_price: 200, tax_rate: 10 };
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await InvoiceLineCalculationTrigger.handler(ctx);

    expect(ctx.input.doc.amount).toBe(1000);
    expect(ctx.input.doc.tax_amount).toBe(100);
    expect(ctx.input.doc.total).toBe(1100);
    consoleSpy.mockRestore();
  });

  it('should handle zero quantity', async () => {
    const doc = { quantity: 0, unit_price: 100, tax_rate: 5 };
    const ctx = createMockContext('beforeUpdate', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await InvoiceLineCalculationTrigger.handler(ctx);

    expect(ctx.input.doc.amount).toBe(0);
    expect(ctx.input.doc.total).toBe(0);
    consoleSpy.mockRestore();
  });

  it('should default missing fields to zero', async () => {
    const doc = {};
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await InvoiceLineCalculationTrigger.handler(ctx);

    expect(ctx.input.doc.amount).toBe(0);
    expect(ctx.input.doc.tax_amount).toBe(0);
    expect(ctx.input.doc.total).toBe(0);
    consoleSpy.mockRestore();
  });
});
