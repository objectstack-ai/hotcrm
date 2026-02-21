import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import {
  ApplicationStatusWorkflowTrigger,
  ApplicationScreeningTrigger
} from '../../../src/hooks/application.hook';

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

describe('Application Hook - ApplicationStatusWorkflowTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create interview record when status changes to interview', async () => {
    const application = {
      id: 'app_001',
      application_number: 'APP-001',
      candidate_id: 'cand_001',
      recruitment_id: 'rec_001',
      status: 'interview'
    };
    const previous = { status: 'screening' };
    const ctx = createMockContext('afterUpdate', application, previous, application);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
    vi.spyOn(console, 'debug').mockImplementation();

    await ApplicationStatusWorkflowTrigger.handler(ctx);

    expect(mockQlDocCreate).toHaveBeenCalledWith('interview', expect.objectContaining({
      candidate_id: 'cand_001',
      application_id: 'app_001',
      interview_type: 'Phone Screen',
      status: 'scheduled'
    }));
    consoleSpy.mockRestore();
  });

  it('should update candidate status when application is hired', async () => {
    const application = {
      id: 'app_002',
      application_number: 'APP-002',
      candidate_id: 'cand_002',
      status: 'hired'
    };
    const previous = { status: 'offer' };
    const ctx = createMockContext('afterUpdate', application, previous, application);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
    vi.spyOn(console, 'debug').mockImplementation();

    await ApplicationStatusWorkflowTrigger.handler(ctx);

    expect(mockQlDocUpdate).toHaveBeenCalledWith('candidate', 'cand_002', { status: 'hired' });
    consoleSpy.mockRestore();
  });

  it('should warn on invalid status transition', async () => {
    const application = {
      id: 'app_003',
      application_number: 'APP-003',
      status: 'hired'
    };
    const previous = { status: 'new' };
    const ctx = createMockContext('afterUpdate', application, previous, application);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation();

    await ApplicationStatusWorkflowTrigger.handler(ctx);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid status transition'));
    expect(mockQlDocCreate).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('should not trigger when status has not changed', async () => {
    const application = { id: 'app_004', application_number: 'APP-004', status: 'screening' };
    const previous = { status: 'screening' };
    const ctx = createMockContext('afterUpdate', application, previous, application);

    await ApplicationStatusWorkflowTrigger.handler(ctx);

    expect(mockQlDocCreate).not.toHaveBeenCalled();
    expect(mockQlDocUpdate).not.toHaveBeenCalled();
  });

  it('should allow valid transition from screening to rejected', async () => {
    const application = {
      id: 'app_005',
      application_number: 'APP-005',
      status: 'rejected'
    };
    const previous = { status: 'screening' };
    const ctx = createMockContext('afterUpdate', application, previous, application);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
    vi.spyOn(console, 'debug').mockImplementation();

    await ApplicationStatusWorkflowTrigger.handler(ctx);

    // Should not create interview or update candidate
    expect(mockQlDocCreate).not.toHaveBeenCalled();
    expect(mockQlDocUpdate).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('Application Hook - ApplicationScreeningTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate screening score and auto-progress high scorers', async () => {
    const application = {
      id: 'app_010',
      application_number: 'APP-010',
      candidate_id: 'cand_010',
      recruitment_id: 'rec_010'
    };
    const candidate = {
      years_of_experience: 10,
      highest_education: 'Master',
      resume_url: 'https://example.com/resume.pdf',
      email: 'test@example.com',
      mobile_phone: '+123',
      current_company: 'Tech Corp',
      notice_period: 'Immediate',
      source: 'Employee Referral'
    };

    // First find call: candidate lookup, second: recruitment lookup
    mockQlFind
      .mockResolvedValueOnce([candidate])
      .mockResolvedValueOnce([{ id: 'rec_010' }]);

    const ctx = createMockContext('afterInsert', application, undefined, application);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await ApplicationScreeningTrigger.handler(ctx);

    expect(mockQlDocUpdate).toHaveBeenCalledWith('application', 'app_010', expect.objectContaining({
      status: 'screening'
    }));
    consoleSpy.mockRestore();
  });

  it('should not auto-progress low scorers', async () => {
    const application = {
      id: 'app_011',
      application_number: 'APP-011',
      candidate_id: 'cand_011'
    };
    const candidate = {
      years_of_experience: 0,
      highest_education: 'High School'
    };

    mockQlFind
      .mockResolvedValueOnce([candidate])
      .mockResolvedValueOnce([]);

    const ctx = createMockContext('afterInsert', application, undefined, application);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await ApplicationScreeningTrigger.handler(ctx);

    expect(mockQlDocUpdate).toHaveBeenCalledWith('application', 'app_011', expect.objectContaining({
      notes: expect.stringContaining('Auto-screening score')
    }));
    // Should NOT have screening status
    const updateCall = mockQlDocUpdate.mock.calls[0][2];
    expect(updateCall.status).toBeUndefined();
    consoleSpy.mockRestore();
  });

  it('should warn when candidate not found', async () => {
    const application = {
      id: 'app_012',
      application_number: 'APP-012',
      candidate_id: 'cand_missing'
    };
    mockQlFind.mockResolvedValueOnce([]);

    const ctx = createMockContext('afterInsert', application, undefined, application);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation();

    await ApplicationScreeningTrigger.handler(ctx);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    expect(mockQlDocUpdate).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
