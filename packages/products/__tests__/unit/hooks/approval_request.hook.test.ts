import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import {
  ApprovalRequestCreationTrigger,
  ApprovalDecisionTrigger
} from '../../../src/hooks/approval_request.hook';

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

describe('ApprovalRequest Hook - ApprovalRequestCreationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should auto-approve discount within 0-10% threshold', async () => {
    const doc = { discount_percent: 8 };
    const previous = { _id: 'q_001', discount_percent: 0, owner: 'user_1' };
    const ctx = createMockContext('beforeUpdate', doc, previous);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await ApprovalRequestCreationTrigger.handler(ctx);

    expect(mockQlDocCreate).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('auto-approved'));
    consoleSpy.mockRestore();
  });

  it('should create approval request for discount requiring sales_manager', async () => {
    const doc = { discount_percent: 15 };
    const previous = { _id: 'q_002', discount_percent: 5, owner: 'user_2' };
    const ctx = createMockContext('beforeUpdate', doc, previous);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await ApprovalRequestCreationTrigger.handler(ctx);

    expect(ctx.input.doc.status).toBe('pending_approval');
    expect(mockQlDocCreate).toHaveBeenCalledWith('approval_request', expect.objectContaining({
      quote: 'q_002',
      approver_role: 'sales_manager',
      discount_percent: 15,
      status: 'pending'
    }));
    consoleSpy.mockRestore();
  });

  it('should route to sales_director for 20-30% discount', async () => {
    const doc = { discount_percent: 25 };
    const previous = { _id: 'q_003', discount_percent: 0, owner: 'user_3' };
    const ctx = createMockContext('beforeUpdate', doc, previous);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await ApprovalRequestCreationTrigger.handler(ctx);

    expect(mockQlDocCreate).toHaveBeenCalledWith('approval_request', expect.objectContaining({
      approver_role: 'sales_director'
    }));
    consoleSpy.mockRestore();
  });

  it('should not create approval when discount decreases', async () => {
    const doc = { discount_percent: 5 };
    const previous = { _id: 'q_004', discount_percent: 15 };
    const ctx = createMockContext('beforeUpdate', doc, previous);

    await ApprovalRequestCreationTrigger.handler(ctx);

    expect(mockQlDocCreate).not.toHaveBeenCalled();
  });

  it('should skip when no previous state', async () => {
    const doc = { discount_percent: 20 };
    const ctx = createMockContext('beforeUpdate', doc);

    await ApprovalRequestCreationTrigger.handler(ctx);

    expect(mockQlDocCreate).not.toHaveBeenCalled();
  });
});

describe('ApprovalRequest Hook - ApprovalDecisionTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set quote status to draft on approval', async () => {
    const approval = { _id: 'ar_001', quote: 'q_001', status: 'approved' };
    const previous = { status: 'pending' };
    const ctx = createMockContext('afterUpdate', approval, previous, approval);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await ApprovalDecisionTrigger.handler(ctx);

    expect(mockQlDocUpdate).toHaveBeenCalledWith('quote', 'q_001', { status: 'draft' });
    consoleSpy.mockRestore();
  });

  it('should set quote status to rejected on rejection', async () => {
    const approval = { _id: 'ar_002', quote: 'q_002', status: 'rejected', rejection_reason: 'Too high' };
    const previous = { status: 'pending' };
    const ctx = createMockContext('afterUpdate', approval, previous, approval);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await ApprovalDecisionTrigger.handler(ctx);

    expect(mockQlDocUpdate).toHaveBeenCalledWith('quote', 'q_002', { status: 'rejected' });
    consoleSpy.mockRestore();
  });

  it('should not trigger when status has not changed', async () => {
    const approval = { _id: 'ar_003', quote: 'q_003', status: 'pending' };
    const previous = { status: 'pending' };
    const ctx = createMockContext('afterUpdate', approval, previous, approval);

    await ApprovalDecisionTrigger.handler(ctx);

    expect(mockQlDocUpdate).not.toHaveBeenCalled();
  });

  it('should skip when no quote reference', async () => {
    const approval = { _id: 'ar_004', status: 'approved' };
    const previous = { status: 'pending' };
    const ctx = createMockContext('afterUpdate', approval, previous, approval);

    await ApprovalDecisionTrigger.handler(ctx);

    expect(mockQlDocUpdate).not.toHaveBeenCalled();
  });

  it('should skip when no previous state', async () => {
    const approval = { _id: 'ar_005', quote: 'q_005', status: 'approved' };
    const ctx = createMockContext('afterUpdate', approval, undefined, approval);

    await ApprovalDecisionTrigger.handler(ctx);

    expect(mockQlDocUpdate).not.toHaveBeenCalled();
  });
});
