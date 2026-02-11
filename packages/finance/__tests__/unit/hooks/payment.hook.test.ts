import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import {
  PaymentMatchingTrigger,
  PaymentValidationTrigger
} from '../../../src/hooks/payment.hook';

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

describe('Payment Hook - PaymentMatchingTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should mark invoice as paid when payment covers full amount', async () => {
    const payment = { _id: 'pay_001', invoice: 'inv_001', amount: 1000 };
    mockQlFind.mockResolvedValue([{ _id: 'inv_001', invoice_number: 'INV-001', total_amount: 1000 }]);

    const ctx = createMockContext('afterInsert', payment, undefined, payment);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await PaymentMatchingTrigger.handler(ctx);

    expect(mockQlDocUpdate).toHaveBeenCalledWith('invoice', 'inv_001', {
      status: 'paid',
      paid_amount: 1000
    });
    consoleSpy.mockRestore();
  });

  it('should update paid_amount for partial payment', async () => {
    const payment = { _id: 'pay_002', invoice: 'inv_002', amount: 500 };
    mockQlFind.mockResolvedValue([{ _id: 'inv_002', invoice_number: 'INV-002', total_amount: 1000, paid_amount: 200 }]);

    const ctx = createMockContext('afterInsert', payment, undefined, payment);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await PaymentMatchingTrigger.handler(ctx);

    expect(mockQlDocUpdate).toHaveBeenCalledWith('invoice', 'inv_002', {
      paid_amount: 700
    });
    consoleSpy.mockRestore();
  });

  it('should skip when payment has no linked invoice', async () => {
    const payment = { _id: 'pay_003', amount: 500 };
    const ctx = createMockContext('afterInsert', payment, undefined, payment);

    await PaymentMatchingTrigger.handler(ctx);

    expect(mockQlFind).not.toHaveBeenCalled();
  });

  it('should warn when linked invoice not found', async () => {
    const payment = { _id: 'pay_004', invoice: 'inv_missing', amount: 500 };
    mockQlFind.mockResolvedValue([]);

    const ctx = createMockContext('afterInsert', payment, undefined, payment);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation();

    await PaymentMatchingTrigger.handler(ctx);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    expect(mockQlDocUpdate).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('Payment Hook - PaymentValidationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log error for zero amount', async () => {
    const doc = { amount: 0, payment_method: 'Credit Card' };
    const ctx = createMockContext('beforeInsert', doc);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation();

    await PaymentValidationTrigger.handler(ctx);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Payment Validation Error'),
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });

  it('should log error for negative amount', async () => {
    const doc = { amount: -100, payment_method: 'Wire' };
    const ctx = createMockContext('beforeInsert', doc);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation();

    await PaymentValidationTrigger.handler(ctx);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Payment Validation Error'),
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });

  it('should log error for future payment date', async () => {
    const futureDate = new Date(Date.now() + 86400000 * 30).toISOString();
    const doc = { amount: 100, payment_date: futureDate, payment_method: 'Credit Card' };
    const ctx = createMockContext('beforeInsert', doc);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation();

    await PaymentValidationTrigger.handler(ctx);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Payment Validation Error'),
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });

  it('should log error for missing payment method', async () => {
    const doc = { amount: 100 };
    const ctx = createMockContext('beforeInsert', doc);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation();

    await PaymentValidationTrigger.handler(ctx);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Payment Validation Error'),
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });

  it('should pass validation for valid payment', async () => {
    const doc = { amount: 500, payment_method: 'Credit Card', payment_date: '2024-01-01' };
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await PaymentValidationTrigger.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Payment validation passed'));
    consoleSpy.mockRestore();
  });

  it('should log error for already-paid invoice', async () => {
    const doc = { amount: 100, payment_method: 'Wire', invoice: 'inv_paid' };
    mockQlFind.mockResolvedValue([{ _id: 'inv_paid', invoice_number: 'INV-PAID', status: 'paid' }]);
    const ctx = createMockContext('beforeInsert', doc);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation();

    await PaymentValidationTrigger.handler(ctx);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Payment Validation Error'),
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });
});
