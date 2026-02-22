import type { HookContext } from '@objectstack/spec/data';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  IdeaVoteAggregation,
  IdeaStatusTransition,
  IdeaNotification
} from '../../../src/idea.hook';

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

const mockQlFindOne = vi.fn();
const mockQlDocUpdate = vi.fn();

function createMockContext(event: string, doc: any, result?: any): HookContext {
  const base: any = {
    event,
    ql: {
      findOne: mockQlFindOne,
      doc: { update: mockQlDocUpdate }
    },
    session: { userId: 'user_1', tenantId: 'tenant_1' },
    user: { id: 'user_1' }
  };

  if (event.startsWith('before')) {
    base.input = { doc, id: doc._id || 'idea_1' };
  } else {
    base.result = result || doc;
    base.input = { doc };
  }
  return base;
}

// ─── IdeaVoteAggregation ───────────────────────────────────────────────────────

describe('IdeaVoteAggregation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct hook metadata', () => {
    expect(IdeaVoteAggregation.name).toBe('IdeaVoteAggregation');
    expect(IdeaVoteAggregation.object).toBe('idea');
    expect(IdeaVoteAggregation.events).toContain('afterUpdate');
  });

  it('should calculate priority_score based on vote_count', async () => {
    mockQlDocUpdate.mockResolvedValue({});
    const ctx = createMockContext('afterUpdate', {}, {
      _id: 'idea_1',
      vote_count: 100,
      created_at: new Date().toISOString()
    });

    await IdeaVoteAggregation.handler(ctx);

    expect(mockQlDocUpdate).toHaveBeenCalledWith(
      'idea',
      'idea_1',
      expect.objectContaining({ priority_score: expect.any(Number) })
    );
    const score = mockQlDocUpdate.mock.calls[0][2].priority_score;
    expect(score).toBeGreaterThan(0);
  });

  it('should skip when result has no _id', async () => {
    const ctx = createMockContext('afterUpdate', {}, {});
    await IdeaVoteAggregation.handler(ctx);
    expect(mockQlDocUpdate).not.toHaveBeenCalled();
  });

  it('should handle zero vote_count', async () => {
    mockQlDocUpdate.mockResolvedValue({});
    const ctx = createMockContext('afterUpdate', {}, {
      _id: 'idea_2',
      vote_count: 0,
      created_at: new Date().toISOString()
    });

    await IdeaVoteAggregation.handler(ctx);

    const score = mockQlDocUpdate.mock.calls[0][2].priority_score;
    expect(score).toBe(0);
  });

  it('should not throw when update fails', async () => {
    mockQlDocUpdate.mockRejectedValue(new Error('DB error'));
    const ctx = createMockContext('afterUpdate', {}, {
      _id: 'idea_3', vote_count: 10, created_at: new Date().toISOString()
    });
    await expect(IdeaVoteAggregation.handler(ctx)).resolves.toBeUndefined();
  });
});

// ─── IdeaStatusTransition ──────────────────────────────────────────────────────

describe('IdeaStatusTransition', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct hook metadata', () => {
    expect(IdeaStatusTransition.name).toBe('IdeaStatusTransition');
    expect(IdeaStatusTransition.object).toBe('idea');
    expect(IdeaStatusTransition.events).toContain('beforeUpdate');
  });

  it('should allow valid transition submitted → under_review', async () => {
    mockQlFindOne.mockResolvedValue({ _id: 'idea_1', status: 'submitted' });
    const ctx = createMockContext('beforeUpdate', { status: 'under_review', _id: 'idea_1' });

    await expect(IdeaStatusTransition.handler(ctx)).resolves.toBeUndefined();
  });

  it('should allow valid transition under_review → planned', async () => {
    mockQlFindOne.mockResolvedValue({ _id: 'idea_1', status: 'under_review' });
    const ctx = createMockContext('beforeUpdate', { status: 'planned', _id: 'idea_1' });

    await expect(IdeaStatusTransition.handler(ctx)).resolves.toBeUndefined();
  });

  it('should allow valid transition planned → in_progress', async () => {
    mockQlFindOne.mockResolvedValue({ _id: 'idea_1', status: 'planned' });
    const ctx = createMockContext('beforeUpdate', { status: 'in_progress', _id: 'idea_1' });

    await expect(IdeaStatusTransition.handler(ctx)).resolves.toBeUndefined();
  });

  it('should allow valid transition in_progress → released', async () => {
    mockQlFindOne.mockResolvedValue({ _id: 'idea_1', status: 'in_progress' });
    const ctx = createMockContext('beforeUpdate', { status: 'released', _id: 'idea_1' });

    await expect(IdeaStatusTransition.handler(ctx)).resolves.toBeUndefined();
  });

  it('should allow decline from any active status', async () => {
    mockQlFindOne.mockResolvedValue({ _id: 'idea_1', status: 'submitted' });
    const ctx = createMockContext('beforeUpdate', { status: 'declined', _id: 'idea_1' });

    await expect(IdeaStatusTransition.handler(ctx)).resolves.toBeUndefined();
  });

  it('should allow resubmit from declined', async () => {
    mockQlFindOne.mockResolvedValue({ _id: 'idea_1', status: 'declined' });
    const ctx = createMockContext('beforeUpdate', { status: 'submitted', _id: 'idea_1' });

    await expect(IdeaStatusTransition.handler(ctx)).resolves.toBeUndefined();
  });

  it('should reject invalid transition submitted → released', async () => {
    mockQlFindOne.mockResolvedValue({ _id: 'idea_1', status: 'submitted' });
    const ctx = createMockContext('beforeUpdate', { status: 'released', _id: 'idea_1' });

    await expect(IdeaStatusTransition.handler(ctx)).rejects.toThrow(
      'Invalid status transition: submitted → released'
    );
  });

  it('should reject transition from released', async () => {
    mockQlFindOne.mockResolvedValue({ _id: 'idea_1', status: 'released' });
    const ctx = createMockContext('beforeUpdate', { status: 'in_progress', _id: 'idea_1' });

    await expect(IdeaStatusTransition.handler(ctx)).rejects.toThrow(
      'Invalid status transition: released → in_progress'
    );
  });

  it('should skip validation when status is not being changed', async () => {
    const ctx = createMockContext('beforeUpdate', { title: 'Updated title', _id: 'idea_1' });
    await expect(IdeaStatusTransition.handler(ctx)).resolves.toBeUndefined();
    expect(mockQlFindOne).not.toHaveBeenCalled();
  });
});

// ─── IdeaNotification ──────────────────────────────────────────────────────────

describe('IdeaNotification', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct hook metadata', () => {
    expect(IdeaNotification.name).toBe('IdeaNotification');
    expect(IdeaNotification.object).toBe('idea');
    expect(IdeaNotification.events).toContain('afterUpdate');
  });

  it('should log notification when status changes', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = createMockContext('afterUpdate', {}, {
      _id: 'idea_1', title: 'My Feature', status: 'planned', author_id: 'user_1'
    });

    await IdeaNotification.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('planned'));
    consoleSpy.mockRestore();
  });

  it('should skip when result has no _id', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = createMockContext('afterUpdate', {}, {});

    await IdeaNotification.handler(ctx);

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should skip when result has no status', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = createMockContext('afterUpdate', {}, { _id: 'idea_1' });

    await IdeaNotification.handler(ctx);

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
