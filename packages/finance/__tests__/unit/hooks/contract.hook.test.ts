import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import { ContractBillingHook } from '../../../src/hooks/contract.hook';

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

describe('Contract Hook - ContractBillingHook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create invoice and invoice line when contract is activated', async () => {
    const contract = {
      _id: 'contract_001',
      contract_number: 'CON-001',
      status: 'activated',
      account: 'acc_001',
      start_date: '2024-06-01',
      contract_value: 50000
    };
    const previous = { status: 'draft' };

    mockQlDocCreate.mockResolvedValueOnce({
      _id: 'inv_001',
      invoice_number: 'INV-001'
    });
    mockQlDocCreate.mockResolvedValueOnce({ _id: 'line_001' });

    const ctx = createMockContext('afterUpdate', contract, previous);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await ContractBillingHook.handler(ctx);

    expect(mockQlDocCreate).toHaveBeenCalledTimes(2);
    expect(mockQlDocCreate).toHaveBeenCalledWith('invoice', expect.objectContaining({
      account: 'acc_001',
      contract: 'contract_001',
      status: 'draft',
      total_amount: 50000,
      payment_terms: 'net_30'
    }));
    expect(mockQlDocCreate).toHaveBeenCalledWith('invoice_line', expect.objectContaining({
      invoice: 'inv_001',
      description: 'Contract CON-001 Billing',
      quantity: 1,
      unit_price: 50000,
      amount: 50000
    }));
    consoleSpy.mockRestore();
  });

  it('should set due date to 30 days after start date', async () => {
    const contract = {
      _id: 'contract_002',
      contract_number: 'CON-002',
      status: 'activated',
      account: 'acc_002',
      start_date: '2024-01-01',
      contract_value: 10000
    };
    const previous = { status: 'draft' };

    mockQlDocCreate.mockResolvedValueOnce({ _id: 'inv_002', invoice_number: 'INV-002' });
    mockQlDocCreate.mockResolvedValueOnce({ _id: 'line_002' });

    const ctx = createMockContext('afterUpdate', contract, previous);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await ContractBillingHook.handler(ctx);

    const expectedDueDate = new Date('2024-01-31');
    const invoiceCall = mockQlDocCreate.mock.calls[0];
    const actualDueDate = new Date(invoiceCall[1].due_date);
    expect(actualDueDate.toISOString().split('T')[0]).toBe(expectedDueDate.toISOString().split('T')[0]);
    consoleSpy.mockRestore();
  });

  it('should not trigger when status does not change to activated', async () => {
    const contract = {
      _id: 'contract_003',
      contract_number: 'CON-003',
      status: 'draft',
      account: 'acc_003',
      start_date: '2024-06-01',
      contract_value: 20000
    };
    const previous = { status: 'draft' };

    const ctx = createMockContext('afterUpdate', contract, previous);

    await ContractBillingHook.handler(ctx);

    expect(mockQlDocCreate).not.toHaveBeenCalled();
  });

  it('should not trigger when status was already activated', async () => {
    const contract = {
      _id: 'contract_004',
      contract_number: 'CON-004',
      status: 'activated',
      account: 'acc_004',
      start_date: '2024-06-01',
      contract_value: 30000
    };
    const previous = { status: 'activated' };

    const ctx = createMockContext('afterUpdate', contract, previous);

    await ContractBillingHook.handler(ctx);

    expect(mockQlDocCreate).not.toHaveBeenCalled();
  });

  it('should still trigger when there is no previous state and status is activated', async () => {
    const contract = {
      _id: 'contract_005',
      contract_number: 'CON-005',
      status: 'activated',
      account: 'acc_005',
      start_date: '2024-06-01',
      contract_value: 15000
    };

    mockQlDocCreate.mockResolvedValueOnce({ _id: 'inv_005', invoice_number: 'INV-005' });
    mockQlDocCreate.mockResolvedValueOnce({ _id: 'line_005' });

    const ctx = createMockContext('afterUpdate', contract);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await ContractBillingHook.handler(ctx);

    // Hook uses optional chaining: oldDoc?.status !== 'activated' is true when no previous
    expect(mockQlDocCreate).toHaveBeenCalledTimes(2);
    consoleSpy.mockRestore();
  });

  it('should log success message with invoice number after billing', async () => {
    const contract = {
      _id: 'contract_006',
      contract_number: 'CON-006',
      status: 'activated',
      account: 'acc_006',
      start_date: '2024-03-01',
      contract_value: 75000
    };
    const previous = { status: 'pending' };

    mockQlDocCreate.mockResolvedValueOnce({ _id: 'inv_006', invoice_number: 'INV-006' });
    mockQlDocCreate.mockResolvedValueOnce({ _id: 'line_006' });

    const ctx = createMockContext('afterUpdate', contract, previous);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await ContractBillingHook.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('INV-006'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('CON-006'));
    consoleSpy.mockRestore();
  });

  it('should log error when invoice creation fails', async () => {
    const contract = {
      _id: 'contract_007',
      contract_number: 'CON-007',
      status: 'activated',
      account: 'acc_007',
      start_date: '2024-06-01',
      contract_value: 25000
    };
    const previous = { status: 'draft' };

    mockQlDocCreate.mockRejectedValueOnce(new Error('Database error'));

    const ctx = createMockContext('afterUpdate', contract, previous);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation();

    await ContractBillingHook.handler(ctx);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Billing Error'),
      expect.any(Error)
    );
    consoleSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should trigger when transitioning from any non-activated status', async () => {
    const contract = {
      _id: 'contract_008',
      contract_number: 'CON-008',
      status: 'activated',
      account: 'acc_008',
      start_date: '2024-09-15',
      contract_value: 100000
    };
    const previous = { status: 'pending_approval' };

    mockQlDocCreate.mockResolvedValueOnce({ _id: 'inv_008', invoice_number: 'INV-008' });
    mockQlDocCreate.mockResolvedValueOnce({ _id: 'line_008' });

    const ctx = createMockContext('afterUpdate', contract, previous);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await ContractBillingHook.handler(ctx);

    expect(mockQlDocCreate).toHaveBeenCalledTimes(2);
    consoleSpy.mockRestore();
  });
});
