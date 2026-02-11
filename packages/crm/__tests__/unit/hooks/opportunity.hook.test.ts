import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import { OpportunityValidation, OpportunityStageChange } from '../../../src/hooks/opportunity.hook';

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
    session: { userId: 'user_123', tenantId: 'tenant_123' },
    user: { id: 'user_123', email: 'user@test.com' }
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

describe('Opportunity Hook - OpportunityValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw error when closing won with zero amount', async () => {
    const opp = { _id: 'opp_001', stage: 'closed_won', amount: 0 };
    const ctx = createMockContext('beforeInsert', opp);

    await expect(OpportunityValidation.handler(ctx)).rejects.toThrow('Cannot close a deal with zero amount');
  });

  it('should throw error when closing won with no amount', async () => {
    const opp = { _id: 'opp_002', stage: 'closed_won' };
    const ctx = createMockContext('beforeUpdate', opp, { stage: 'negotiation' });

    await expect(OpportunityValidation.handler(ctx)).rejects.toThrow('Cannot close a deal with zero amount');
  });

  it('should allow closed_won with positive amount', async () => {
    const opp = { _id: 'opp_003', stage: 'closed_won', amount: 50000 };
    const ctx = createMockContext('beforeInsert', opp);

    await expect(OpportunityValidation.handler(ctx)).resolves.toBeUndefined();
  });

  it('should throw error moving to proposal without quotes', async () => {
    const opp = { _id: 'opp_004', stage: 'proposal' };
    const previous = { stage: 'qualification' };
    mockQlFind.mockResolvedValue([]);
    const ctx = createMockContext('beforeUpdate', opp, previous);

    await expect(OpportunityValidation.handler(ctx)).rejects.toThrow('Cannot move to Proposal stage without an active Quote');
  });

  it('should allow proposal stage when quotes exist', async () => {
    const opp = { _id: 'opp_005', stage: 'proposal' };
    const previous = { stage: 'qualification' };
    mockQlFind.mockResolvedValue([{ _id: 'quote_001' }]);
    const ctx = createMockContext('beforeUpdate', opp, previous);

    await expect(OpportunityValidation.handler(ctx)).resolves.toBeUndefined();
  });
});

describe('Opportunity Hook - OpportunityStageChange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should skip if stage did not change', async () => {
    const opp = { Id: 'opp_001', Name: 'Deal', Stage: 'proposal', AccountId: 'acc_001' };
    const ctx = createMockContext('afterUpdate', opp, { Stage: 'proposal' }, opp);

    await OpportunityStageChange.handler(ctx);

    expect(mockQlDocCreate).not.toHaveBeenCalled();
  });

  it('should handle closed_won by creating contract and updating account', async () => {
    const opp = { Id: 'opp_002', Name: 'Big Deal', Stage: 'closed_won', AccountId: 'acc_001', Amount: 100000, OwnerId: 'user_123' };
    const previous = { Stage: 'negotiation' };
    mockQlDocCreate.mockResolvedValue({ Id: 'contract_001' });
    mockQlDocUpdate.mockResolvedValue({});
    const ctx = createMockContext('afterUpdate', opp, previous, opp);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation();
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation();

    await OpportunityStageChange.handler(ctx);

    expect(mockQlDocCreate).toHaveBeenCalledWith('contract', expect.objectContaining({
      AccountId: 'acc_001',
      Status: 'draft'
    }));
    expect(mockQlDocUpdate).toHaveBeenCalledWith('account', 'acc_001', expect.objectContaining({
      CustomerStatus: 'active_customer'
    }));
    consoleSpy.mockRestore();
    warnSpy.mockRestore();
    debugSpy.mockRestore();
  });

  it('should handle closed_lost by logging activity', async () => {
    const opp = { Id: 'opp_003', Name: 'Lost Deal', Stage: 'closed_lost', AccountId: 'acc_002', Amount: 50000 };
    const previous = { Stage: 'proposal' };
    mockQlDocCreate.mockResolvedValue({});
    const ctx = createMockContext('afterUpdate', opp, previous, opp);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation();
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation();

    await OpportunityStageChange.handler(ctx);

    expect(mockQlDocCreate).toHaveBeenCalledWith('activity', expect.objectContaining({
      Subject: expect.stringContaining('Deal Lost')
    }));
    consoleSpy.mockRestore();
    warnSpy.mockRestore();
    debugSpy.mockRestore();
  });
});
