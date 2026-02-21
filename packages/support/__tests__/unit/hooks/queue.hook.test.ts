import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import {
  QueueLoadBalancingTrigger,
  QueueCapacityValidationTrigger
} from '../../../src/hooks/queue.hook';

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

describe('Queue Hook - QueueLoadBalancingTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update queue stats when members change', async () => {
    const member = { _id: 'qm_1', queue_id: 'q_001', is_active: true };
    const allMembers = [
      { _id: 'qm_1', queue_id: 'q_001', is_active: true, accept_new_cases: true, current_cases: 5, avg_resolution_time: 30 },
      { _id: 'qm_2', queue_id: 'q_001', is_active: true, accept_new_cases: true, current_cases: 3, avg_resolution_time: 20 }
    ];

    mockQlFind
      .mockResolvedValueOnce(allMembers)
      .mockResolvedValueOnce([{ _id: 'q_001', name: 'Support Queue' }]);

    const ctx = createMockContext('afterInsert', member, undefined, member);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await QueueLoadBalancingTrigger.handler(ctx);

    expect(mockQlDocUpdate).toHaveBeenCalledWith('queue', 'q_001', expect.objectContaining({
      total_members: 2,
      active_cases: 8
    }));
    consoleSpy.mockRestore();
  });

  it('should detect workload imbalance', async () => {
    const member = { _id: 'qm_1', queue_id: 'q_001', is_active: true };
    const allMembers = [
      { _id: 'qm_1', queue_id: 'q_001', is_active: true, accept_new_cases: true, current_cases: 15, max_cases: 20, avg_resolution_time: 30 },
      { _id: 'qm_2', queue_id: 'q_001', is_active: true, accept_new_cases: true, current_cases: 2, max_cases: 20, avg_resolution_time: 20 }
    ];

    mockQlFind
      .mockResolvedValueOnce(allMembers)
      .mockResolvedValueOnce([{ _id: 'q_001' }]);

    const ctx = createMockContext('afterUpdate', member, undefined, member);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await QueueLoadBalancingTrigger.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('workload imbalance detected'));
    consoleSpy.mockRestore();
  });

  it('should skip when member has no queue_id', async () => {
    const member = { _id: 'qm_orphan' };
    const ctx = createMockContext('afterInsert', member, undefined, member);

    await QueueLoadBalancingTrigger.handler(ctx);

    expect(mockQlFind).not.toHaveBeenCalled();
  });

  it('should skip when no active members found', async () => {
    const member = { _id: 'qm_1', queue_id: 'q_001' };
    mockQlFind.mockResolvedValue([]);
    const ctx = createMockContext('afterInsert', member, undefined, member);

    await QueueLoadBalancingTrigger.handler(ctx);

    expect(mockQlDocUpdate).not.toHaveBeenCalled();
  });
});

describe('Queue Hook - QueueCapacityValidationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should pass validation for valid queue settings', async () => {
    const queue = { _id: 'q_001', name: 'Support Queue', max_cases_per_agent: 20 };
    const oldQueue = { _id: 'q_001', is_active: true };
    const ctx = createMockContext('beforeUpdate', queue, oldQueue);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await QueueCapacityValidationTrigger.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Queue validation passed'));
    consoleSpy.mockRestore();
  });

  it('should throw error for non-positive max_cases_per_agent', async () => {
    const queue = { _id: 'q_001', max_cases_per_agent: 0 };
    const oldQueue = { _id: 'q_001' };
    const ctx = createMockContext('beforeUpdate', queue, oldQueue);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

    await expect(QueueCapacityValidationTrigger.handler(ctx)).rejects.toThrow('max_cases_per_agent must be a positive number.');
    consoleSpy.mockRestore();
  });

  it('should throw error when activating queue with no active members', async () => {
    const queue = { _id: 'q_001', is_active: true };
    const oldQueue = { _id: 'q_001', is_active: false };
    mockQlFind.mockResolvedValue([]);
    const ctx = createMockContext('beforeUpdate', queue, oldQueue);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

    await expect(QueueCapacityValidationTrigger.handler(ctx)).rejects.toThrow('Queue must have at least one active member before activation.');
    consoleSpy.mockRestore();
  });

  it('should allow activating queue with active members', async () => {
    const queue = { _id: 'q_001', name: 'Support', is_active: true };
    const oldQueue = { _id: 'q_001', is_active: false };
    mockQlFind.mockResolvedValue([{ _id: 'qm_1', is_active: true }]);
    const ctx = createMockContext('beforeUpdate', queue, oldQueue);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await QueueCapacityValidationTrigger.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Queue validation passed'));
    consoleSpy.mockRestore();
  });

  it('should throw error for non-positive overflow_threshold when overflow enabled', async () => {
    const queue = { _id: 'q_001', enable_overflow: true, overflow_threshold: -1 };
    const oldQueue = { _id: 'q_001' };
    const ctx = createMockContext('beforeUpdate', queue, oldQueue);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

    await expect(QueueCapacityValidationTrigger.handler(ctx)).rejects.toThrow('overflow_threshold must be a positive number');
    consoleSpy.mockRestore();
  });
});
