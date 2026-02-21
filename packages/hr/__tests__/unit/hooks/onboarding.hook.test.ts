import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import {
  OnboardingChecklistTrigger,
  OnboardingProgressTrigger
} from '../../../src/hooks/onboarding.hook';

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

describe('Onboarding Hook - OnboardingChecklistTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create onboarding record when offer is accepted', async () => {
    const offer = {
      id: 'offer_001',
      offer_number: 'OFF-001',
      status: 'accepted',
      start_date: '2025-03-01',
      hiring_manager_id: 'mgr_001'
    };
    const previous = { status: 'pending' };
    const ctx = createMockContext('afterUpdate', offer, previous, offer);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await OnboardingChecklistTrigger.handler(ctx);

    expect(mockQlDocCreate).toHaveBeenCalledWith('onboarding', expect.objectContaining({
      offer_id: 'offer_001',
      start_date: '2025-03-01',
      status: 'in_progress',
      completion_percentage: 0,
      manager_id: 'mgr_001',
      it_setup_completed: false,
      workspace_setup_completed: false
    }));
    consoleSpy.mockRestore();
  });

  it('should not create onboarding when status changes to something other than accepted', async () => {
    const offer = { id: 'offer_002', offer_number: 'OFF-002', status: 'rejected' };
    const previous = { status: 'pending' };
    const ctx = createMockContext('afterUpdate', offer, previous, offer);

    await OnboardingChecklistTrigger.handler(ctx);

    expect(mockQlDocCreate).not.toHaveBeenCalled();
  });

  it('should not trigger when status has not changed', async () => {
    const offer = { id: 'offer_003', offer_number: 'OFF-003', status: 'accepted' };
    const previous = { status: 'accepted' };
    const ctx = createMockContext('afterUpdate', offer, previous, offer);

    await OnboardingChecklistTrigger.handler(ctx);

    expect(mockQlDocCreate).not.toHaveBeenCalled();
  });

  it('should use current date if offer has no start_date', async () => {
    const offer = {
      id: 'offer_004',
      offer_number: 'OFF-004',
      status: 'accepted'
    };
    const previous = { status: 'pending' };
    const ctx = createMockContext('afterUpdate', offer, previous, offer);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await OnboardingChecklistTrigger.handler(ctx);

    expect(mockQlDocCreate).toHaveBeenCalledWith('onboarding', expect.objectContaining({
      status: 'in_progress',
      completion_percentage: 0
    }));
    consoleSpy.mockRestore();
  });
});

describe('Onboarding Hook - OnboardingProgressTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate completion percentage correctly', async () => {
    const onboarding = {
      it_setup_completed: true,
      workspace_setup_completed: true,
      training_completed: false,
      system_access_granted: false,
      paperwork_completed: false,
      status: 'in_progress',
      start_date: '2025-01-01'
    };
    const previous = {
      it_setup_completed: false,
      workspace_setup_completed: false
    };
    const ctx = createMockContext('beforeUpdate', onboarding, previous);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await OnboardingProgressTrigger.handler(ctx);

    expect(ctx.input.doc.completion_percentage).toBe(40); // 2/5 = 40%
    consoleSpy.mockRestore();
  });

  it('should set status to completed when all items are done', async () => {
    const onboarding = {
      it_setup_completed: true,
      workspace_setup_completed: true,
      training_completed: true,
      system_access_granted: true,
      paperwork_completed: true,
      status: 'in_progress',
      start_date: '2025-01-01'
    };
    const ctx = createMockContext('beforeUpdate', onboarding);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await OnboardingProgressTrigger.handler(ctx);

    expect(ctx.input.doc.completion_percentage).toBe(100);
    expect(ctx.input.doc.status).toBe('completed');
    consoleSpy.mockRestore();
  });

  it('should calculate 0% when no items are completed', async () => {
    const onboarding = {
      it_setup_completed: false,
      workspace_setup_completed: false,
      training_completed: false,
      system_access_granted: false,
      paperwork_completed: false,
      status: 'in_progress'
    };
    const ctx = createMockContext('beforeUpdate', onboarding);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await OnboardingProgressTrigger.handler(ctx);

    expect(ctx.input.doc.completion_percentage).toBe(0);
    consoleSpy.mockRestore();
  });

  it('should use previous values for unchecked items', async () => {
    const onboarding = {
      it_setup_completed: true,
      status: 'in_progress'
    };
    const previous = {
      it_setup_completed: false,
      workspace_setup_completed: true,
      training_completed: false,
      system_access_granted: false,
      paperwork_completed: false,
      start_date: '2025-01-01'
    };
    const ctx = createMockContext('beforeUpdate', onboarding, previous);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await OnboardingProgressTrigger.handler(ctx);

    expect(ctx.input.doc.completion_percentage).toBe(40); // it_setup + workspace from previous
    consoleSpy.mockRestore();
  });
});
