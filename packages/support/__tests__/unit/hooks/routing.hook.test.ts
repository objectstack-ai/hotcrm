import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import {
  CaseRoutingTrigger,
  CaseEscalationTrigger
} from '../../../src/hooks/routing.hook';

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
  previous?: any
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
    baseContext.result = doc;
    baseContext.previous = previous;
    baseContext.input = { doc };
  }
  return baseContext;
};

describe('Routing Hook - CaseRoutingTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should auto-assign case to agent with lowest workload', async () => {
    const caseRec = { type: 'bug', priority: 'high' };
    const routingRule = {
      _id: 'rule_1',
      name: 'Bug Route',
      is_active: true,
      priority: 1,
      match_case_types: 'bug',
      queue_id: 'q_001',
      cases_routed: 0
    };
    const queueMembers = [
      { _id: 'qm_1', user_id: 'agent_1', queue_id: 'q_001', is_active: true, accept_new_cases: true, current_cases: 5, max_cases: 20 },
      { _id: 'qm_2', user_id: 'agent_2', queue_id: 'q_001', is_active: true, accept_new_cases: true, current_cases: 2, max_cases: 20 }
    ];

    mockQlFind
      .mockResolvedValueOnce([routingRule])
      .mockResolvedValueOnce(queueMembers);

    const ctx = createMockContext('beforeInsert', caseRec);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await CaseRoutingTrigger.handler(ctx);

    expect(ctx.input.doc.owner_id).toBe('agent_2');
    expect(mockQlDocUpdate).toHaveBeenCalledWith('queue_member', 'qm_2', expect.objectContaining({
      current_cases: 3
    }));
    consoleSpy.mockRestore();
  });

  it('should skip routing when case already has an owner', async () => {
    const caseRec = { owner_id: 'existing_owner', type: 'bug' };
    const ctx = createMockContext('beforeInsert', caseRec);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await CaseRoutingTrigger.handler(ctx);

    expect(mockQlFind).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already has an owner'));
    consoleSpy.mockRestore();
  });

  it('should skip when no active routing rules found', async () => {
    const caseRec = { type: 'feature_request' };
    mockQlFind.mockResolvedValue([]);
    const ctx = createMockContext('beforeInsert', caseRec);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await CaseRoutingTrigger.handler(ctx);

    expect(ctx.input.doc.owner_id).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No active routing rules'));
    consoleSpy.mockRestore();
  });

  it('should skip when no matching routing rule for case criteria', async () => {
    const caseRec = { type: 'feature_request', priority: 'low' };
    mockQlFind.mockResolvedValue([
      { _id: 'rule_1', is_active: true, match_case_types: 'bug', match_priorities: 'critical' }
    ]);
    const ctx = createMockContext('beforeInsert', caseRec);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await CaseRoutingTrigger.handler(ctx);

    expect(ctx.input.doc.owner_id).toBeUndefined();
    consoleSpy.mockRestore();
  });

  it('should handle all agents at capacity', async () => {
    const caseRec = { type: 'bug', priority: 'high' };
    const routingRule = { _id: 'rule_1', is_active: true, priority: 1, queue_id: 'q_001', cases_routed: 0 };
    const queueMembers = [
      { _id: 'qm_1', user_id: 'agent_1', queue_id: 'q_001', is_active: true, accept_new_cases: true, current_cases: 20, max_cases: 20 }
    ];

    mockQlFind
      .mockResolvedValueOnce([routingRule])
      .mockResolvedValueOnce(queueMembers);

    const ctx = createMockContext('beforeInsert', caseRec);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await CaseRoutingTrigger.handler(ctx);

    expect(ctx.input.doc.owner_id).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('at capacity'));
    consoleSpy.mockRestore();
  });
});

describe('Routing Hook - CaseEscalationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should escalate when priority changes to critical', async () => {
    const caseRec = { _id: 'case_1', case_number: 'CS-001', priority: 'critical', type: 'bug' };
    const oldCase = { _id: 'case_1', priority: 'high', created_at: new Date().toISOString() };
    const escalationRule = {
      _id: 'esc_1',
      is_active: true,
      escalation_level: 1,
      escalate_to_type: 'user',
      escalate_to_user_id: 'manager_1',
      times_triggered: 0
    };
    mockQlFind.mockResolvedValue([escalationRule]);

    const ctx = createMockContext('beforeUpdate', caseRec, oldCase);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await CaseEscalationTrigger.handler(ctx);

    expect(ctx.input.doc.is_escalated).toBe(true);
    expect(ctx.input.doc.owner_id).toBe('manager_1');
    expect(mockQlDocUpdate).toHaveBeenCalledWith('escalation_rule', 'esc_1', expect.objectContaining({
      times_triggered: 1
    }));
    consoleSpy.mockRestore();
  });

  it('should not escalate when priority is not critical', async () => {
    const caseRec = { _id: 'case_2', priority: 'medium', type: 'bug', status: 'open' };
    const oldCase = { _id: 'case_2', priority: 'low', created_at: new Date().toISOString() };
    const ctx = createMockContext('beforeUpdate', caseRec, oldCase);

    await CaseEscalationTrigger.handler(ctx);

    expect(ctx.input.doc.is_escalated).toBeUndefined();
    expect(mockQlFind).not.toHaveBeenCalled();
  });

  it('should skip if already escalated and priority not changed to critical', async () => {
    const caseRec = { _id: 'case_3', priority: 'high', is_escalated: true };
    const oldCase = { _id: 'case_3', priority: 'high' };
    const ctx = createMockContext('beforeUpdate', caseRec, oldCase);

    await CaseEscalationTrigger.handler(ctx);

    expect(mockQlFind).not.toHaveBeenCalled();
  });
});
