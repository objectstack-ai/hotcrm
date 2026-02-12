import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import {
  CreditNoteValidationTrigger,
  CreditNoteBalanceAdjustmentTrigger
} from '../../../src/hooks/credit_note.hook';

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

describe('CreditNote Hook - CreditNoteValidationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate total_amount from amount + tax_amount', async () => {
    const doc = { amount: 1000, tax_amount: 150 };
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await CreditNoteValidationTrigger.handler(ctx);

    expect(doc.total_amount).toBe(1150);
    consoleSpy.mockRestore();
  });

  it('should throw error for amount <= 0', async () => {
    const doc = { amount: 0 };
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

    await CreditNoteValidationTrigger.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(
      '❌ Credit Note Validation Error:',
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it('should initialize remaining_balance on insert', async () => {
    const doc = { amount: 500, tax_amount: 50 };
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await CreditNoteValidationTrigger.handler(ctx);

    expect(doc.remaining_balance).toBe(550);
    consoleSpy.mockRestore();
  });

  it('should not overwrite existing remaining_balance', async () => {
    const doc = { amount: 500, tax_amount: 50, remaining_balance: 200 };
    const ctx = createMockContext('beforeUpdate', doc, {});
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await CreditNoteValidationTrigger.handler(ctx);

    expect(doc.remaining_balance).toBe(200);
    consoleSpy.mockRestore();
  });
});

describe('CreditNote Hook - CreditNoteBalanceAdjustmentTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update balance when status changes to applied', async () => {
    const creditNote = { _id: 'cn_1', credit_note_number: 'CN-001', status: 'applied', remaining_balance: 1000, total_amount: 1000 };
    const previous = { status: 'draft' };
    const ctx = createMockContext('afterUpdate', creditNote, previous);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await CreditNoteBalanceAdjustmentTrigger.handler(ctx);

    expect(mockQlDocUpdate).toHaveBeenCalledWith('credit_note', 'cn_1', { remaining_balance: 0 });
    consoleSpy.mockRestore();
  });

  it('should skip when status has not changed', async () => {
    const creditNote = { _id: 'cn_1', status: 'draft', remaining_balance: 500 };
    const previous = { status: 'draft' };
    const ctx = createMockContext('afterUpdate', creditNote, previous);

    await CreditNoteBalanceAdjustmentTrigger.handler(ctx);

    expect(mockQlDocUpdate).not.toHaveBeenCalled();
  });
});
