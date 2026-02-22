import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import {
  BillingScheduleValidationTrigger,
  BillingScheduleInvoiceGenerationTrigger
} from '../../../src/hooks/billing_schedule.hook';

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

describe('BillingSchedule Hook - BillingScheduleValidationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate start_date < end_date', async () => {
    const doc = { start_date: '2025-12-01', end_date: '2025-01-01', billing_day: 15 };
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

    await BillingScheduleValidationTrigger.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Billing Schedule Validation Error:',
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it('should calculate next_billing_date', async () => {
    const doc = { start_date: '2020-01-01', end_date: '2030-12-31', billing_day: 15 };
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await BillingScheduleValidationTrigger.handler(ctx);

    expect(doc.next_billing_date).toBeDefined();
    consoleSpy.mockRestore();
  });

  it('should pass when start_date is before end_date', async () => {
    const doc = { start_date: '2025-01-01', end_date: '2025-12-31', billing_day: 10 };
    const ctx = createMockContext('beforeUpdate', doc, {});
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await BillingScheduleValidationTrigger.handler(ctx);

    expect(doc.next_billing_date).toBeDefined();
    consoleSpy.mockRestore();
  });

  it('should reject billing_day outside 1-28 range', async () => {
    const doc = { start_date: '2025-01-01', end_date: '2025-12-31', billing_day: 31 };
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

    await BillingScheduleValidationTrigger.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Billing Schedule Validation Error:',
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });
});

describe('BillingSchedule Hook - BillingScheduleInvoiceGenerationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log when status becomes active', async () => {
    const schedule = { name: 'Monthly Plan', status: 'active', auto_generate_invoice: true, billing_day: 15, frequency: 'monthly', next_billing_date: '2025-02-15', amount: 999 };
    const previous = { status: 'draft' };
    const ctx = createMockContext('afterUpdate', schedule, previous);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await BillingScheduleInvoiceGenerationTrigger.handler(ctx);

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should skip when status has not changed', async () => {
    const schedule = { name: 'Monthly Plan', status: 'active' };
    const previous = { status: 'active' };
    const ctx = createMockContext('afterUpdate', schedule, previous);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await BillingScheduleInvoiceGenerationTrigger.handler(ctx);

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
