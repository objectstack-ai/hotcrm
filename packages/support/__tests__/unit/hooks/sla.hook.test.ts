import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import {
  SLAPolicyValidationTrigger,
  SLAMilestoneCreationTrigger,
  SLABreachDetectionTrigger
} from '../../../src/hooks/sla.hook';

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

describe('SLA Hook - SLAPolicyValidationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should pass validation for valid SLA policy data', async () => {
    const policy = {
      policy_name: 'Standard SLA',
      first_response_minutes: 60,
      next_response_minutes: 120,
      resolution_minutes: 480,
      priority: 1,
      is_active: false
    };
    const ctx = createMockContext('beforeInsert', policy);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await SLAPolicyValidationTrigger.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('SLA Policy validation passed'));
    consoleSpy.mockRestore();
  });

  it('should throw error for negative first_response_minutes', async () => {
    const policy = { policy_name: 'Bad SLA', first_response_minutes: -10 };
    const ctx = createMockContext('beforeInsert', policy);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

    await expect(SLAPolicyValidationTrigger.handler(ctx)).rejects.toThrow('First response time must be a positive number.');
    consoleSpy.mockRestore();
  });

  it('should throw error for negative resolution_minutes', async () => {
    const policy = { policy_name: 'Bad SLA', resolution_minutes: -5 };
    const ctx = createMockContext('beforeInsert', policy);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

    await expect(SLAPolicyValidationTrigger.handler(ctx)).rejects.toThrow('Resolution time must be a positive number.');
    consoleSpy.mockRestore();
  });

  it('should throw error for zero next_response_minutes', async () => {
    const policy = { policy_name: 'Bad SLA', next_response_minutes: 0 };
    const ctx = createMockContext('beforeInsert', policy);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

    await expect(SLAPolicyValidationTrigger.handler(ctx)).rejects.toThrow('Next response time must be a positive number.');
    consoleSpy.mockRestore();
  });

  it('should throw error for zero closure_minutes', async () => {
    const policy = { policy_name: 'Bad SLA', closure_minutes: 0 };
    const ctx = createMockContext('beforeInsert', policy);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

    await expect(SLAPolicyValidationTrigger.handler(ctx)).rejects.toThrow('Closure time must be a positive number.');
    consoleSpy.mockRestore();
  });

  it('should detect overlapping active policies', async () => {
    const policy = {
      policy_name: 'Duplicate SLA',
      is_active: true,
      applies_to: 'case',
      tier: 'gold',
      applicable_priorities: 'high'
    };
    mockQlFind.mockResolvedValue([
      { _id: 'existing_1', tier: 'gold', applicable_priorities: 'high' }
    ]);
    const ctx = createMockContext('beforeInsert', policy);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

    await expect(SLAPolicyValidationTrigger.handler(ctx)).rejects.toThrow('An active SLA policy already exists');
    consoleSpy.mockRestore();
  });

  it('should allow non-overlapping active policies', async () => {
    const policy = {
      policy_name: 'New SLA',
      is_active: true,
      applies_to: 'case',
      tier: 'silver',
      applicable_priorities: 'low'
    };
    mockQlFind.mockResolvedValue([
      { _id: 'existing_1', tier: 'gold', applicable_priorities: 'high' }
    ]);
    const ctx = createMockContext('beforeInsert', policy);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await SLAPolicyValidationTrigger.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('SLA Policy validation passed'));
    consoleSpy.mockRestore();
  });
});

describe('SLA Hook - SLAMilestoneCreationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create milestones on case insert with matching policy', async () => {
    const caseRec = { _id: 'case_001', case_number: 'CS-001', priority: 'high', type: 'bug' };
    const policy = {
      policy_name: 'Standard',
      enable_first_response: true,
      first_response_minutes: 60,
      enable_resolution: true,
      resolution_minutes: 480,
      enable_next_response: true,
      next_response_minutes: 120,
      applicable_priorities: 'high',
      applicable_case_types: 'bug',
      business_hours_id: 'bh_001'
    };
    mockQlFind.mockResolvedValue([policy]);
    const ctx = createMockContext('afterInsert', caseRec, undefined, caseRec);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await SLAMilestoneCreationTrigger.handler(ctx);

    expect(mockQlDocCreate).toHaveBeenCalledTimes(3);
    expect(mockQlDocCreate).toHaveBeenCalledWith('sla_milestone', expect.objectContaining({
      case_id: 'case_001',
      milestone_type: 'first_response',
      status: 'in_progress'
    }));
    expect(mockQlDocCreate).toHaveBeenCalledWith('sla_milestone', expect.objectContaining({
      case_id: 'case_001',
      milestone_type: 'resolution'
    }));
    consoleSpy.mockRestore();
  });

  it('should skip milestone creation when no active policies found', async () => {
    const caseRec = { _id: 'case_002', case_number: 'CS-002', priority: 'low' };
    mockQlFind.mockResolvedValue([]);
    const ctx = createMockContext('afterInsert', caseRec, undefined, caseRec);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await SLAMilestoneCreationTrigger.handler(ctx);

    expect(mockQlDocCreate).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No active SLA policies found'));
    consoleSpy.mockRestore();
  });
});

describe('SLA Hook - SLABreachDetectionTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect breach and escalate case priority', async () => {
    const pastDate = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago
    const milestone = {
      name: 'First Response',
      milestone_type: 'first_response',
      target_date_time: pastDate,
      status: 'in_progress',
      case_id: 'case_001'
    };
    const oldMilestone = { status: 'in_progress' };
    mockQlFind.mockResolvedValue([{ _id: 'case_001', case_number: 'CS-001', priority: 'medium' }]);

    const ctx = createMockContext('beforeUpdate', milestone, oldMilestone);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await SLABreachDetectionTrigger.handler(ctx);

    expect(ctx.input.doc.status).toBe('breached');
    expect(ctx.input.doc.is_violated).toBe(true);
    expect(mockQlDocUpdate).toHaveBeenCalledWith('case', 'case_001', expect.objectContaining({
      priority: 'high',
      is_sla_violated: true
    }));
    consoleSpy.mockRestore();
  });

  it('should skip if milestone is already breached', async () => {
    const milestone = { status: 'in_progress', target_date_time: new Date().toISOString() };
    const oldMilestone = { status: 'breached' };
    const ctx = createMockContext('beforeUpdate', milestone, oldMilestone);

    await SLABreachDetectionTrigger.handler(ctx);

    expect(mockQlFind).not.toHaveBeenCalled();
    expect(mockQlDocUpdate).not.toHaveBeenCalled();
  });

  it('should skip if milestone status is completed', async () => {
    const milestone = { status: 'completed', target_date_time: new Date().toISOString() };
    const oldMilestone = { status: 'in_progress' };
    const ctx = createMockContext('beforeUpdate', milestone, oldMilestone);

    await SLABreachDetectionTrigger.handler(ctx);

    expect(mockQlFind).not.toHaveBeenCalled();
  });

  it('should not escalate if case is already critical', async () => {
    const pastDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const milestone = {
      name: 'Resolution',
      milestone_type: 'resolution',
      target_date_time: pastDate,
      status: 'in_progress',
      case_id: 'case_002'
    };
    const oldMilestone = { status: 'in_progress' };
    mockQlFind.mockResolvedValue([{ _id: 'case_002', case_number: 'CS-002', priority: 'critical' }]);

    const ctx = createMockContext('beforeUpdate', milestone, oldMilestone);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await SLABreachDetectionTrigger.handler(ctx);

    expect(ctx.input.doc.status).toBe('breached');
    expect(mockQlDocUpdate).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
