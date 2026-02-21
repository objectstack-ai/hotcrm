import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import {
  InterviewSchedulingTrigger,
  InterviewFeedbackTrigger
} from '../../../src/hooks/interview.hook';

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

describe('Interview Hook - InterviewSchedulingTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set default duration to 60 if not provided', async () => {
    const interview = { title: 'Phone Screen', scheduled_date: '2099-12-01' };
    const ctx = createMockContext('beforeInsert', interview);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await InterviewSchedulingTrigger.handler(ctx);

    expect(ctx.input.doc.duration).toBe(60);
    consoleSpy.mockRestore();
  });

  it('should warn for past interview dates', async () => {
    const interview = { title: 'Past Interview', scheduled_date: '2020-01-01', duration: 45 };
    const ctx = createMockContext('beforeInsert', interview);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await InterviewSchedulingTrigger.handler(ctx);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('in the past'));
    warnSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('should detect double-booking for interviewer', async () => {
    const futureDate = '2099-06-15';
    const interview = {
      title: 'Technical Interview',
      scheduled_date: futureDate,
      interviewer_id: 'int_001',
      duration: 60
    };
    mockQlFind.mockResolvedValue([{ _id: 'existing_interview', scheduled_date: futureDate }]);

    const ctx = createMockContext('beforeInsert', interview);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await InterviewSchedulingTrigger.handler(ctx);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('scheduling conflict'));
    warnSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('should not detect conflict when interviewer has no existing interviews', async () => {
    const interview = {
      title: 'Interview',
      scheduled_date: '2099-06-15',
      interviewer_id: 'int_002',
      duration: 60
    };
    mockQlFind.mockResolvedValue([]);

    const ctx = createMockContext('beforeInsert', interview);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await InterviewSchedulingTrigger.handler(ctx);

    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('scheduling conflict'));
    warnSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('should set default status to scheduled', async () => {
    const interview = { title: 'New Interview' };
    const ctx = createMockContext('beforeInsert', interview);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await InterviewSchedulingTrigger.handler(ctx);

    expect(ctx.input.doc.status).toBe('scheduled');
    consoleSpy.mockRestore();
  });
});

describe('Interview Hook - InterviewFeedbackTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update application status to offer on pass result', async () => {
    const interview = {
      _id: 'iv_001',
      title: 'Final Interview',
      application_id: 'app_001',
      result: 'pass'
    };
    const previous = { result: null };

    mockQlFind.mockResolvedValue([{ _id: 'iv_001', result: 'pass', application_id: 'app_001' }]);

    const ctx = createMockContext('afterUpdate', interview, previous, interview);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await InterviewFeedbackTrigger.handler(ctx);

    expect(mockQlDocUpdate).toHaveBeenCalledWith('application', 'app_001', { status: 'offer' });
    consoleSpy.mockRestore();
  });

  it('should update application status to rejected on fail result', async () => {
    const interview = {
      _id: 'iv_002',
      title: 'Technical Interview',
      application_id: 'app_002',
      result: 'fail'
    };
    const previous = { result: null };

    mockQlFind.mockResolvedValue([{ _id: 'iv_002', result: 'fail', application_id: 'app_002' }]);

    const ctx = createMockContext('afterUpdate', interview, previous, interview);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await InterviewFeedbackTrigger.handler(ctx);

    expect(mockQlDocUpdate).toHaveBeenCalledWith('application', 'app_002', { status: 'rejected' });
    consoleSpy.mockRestore();
  });

  it('should not update application on hold result', async () => {
    const interview = {
      _id: 'iv_003',
      title: 'Interview',
      application_id: 'app_003',
      result: 'hold'
    };
    const previous = { result: null };

    mockQlFind.mockResolvedValue([{ _id: 'iv_003', result: 'hold', application_id: 'app_003' }]);

    const ctx = createMockContext('afterUpdate', interview, previous, interview);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await InterviewFeedbackTrigger.handler(ctx);

    // hold result should NOT update application status (only pass/fail do)
    // But it should still calculate average score
    expect(mockQlDocUpdate).not.toHaveBeenCalledWith('application', 'app_003', { status: expect.any(String) });
    consoleSpy.mockRestore();
  });

  it('should not trigger if result did not change from null', async () => {
    const interview = { _id: 'iv_004', result: 'pass', application_id: 'app_004' };
    const previous = { result: 'pass' };
    const ctx = createMockContext('afterUpdate', interview, previous, interview);

    await InterviewFeedbackTrigger.handler(ctx);

    expect(mockQlDocUpdate).not.toHaveBeenCalled();
  });

  it('should not trigger if result is null', async () => {
    const interview = { _id: 'iv_005', result: null, application_id: 'app_005' };
    const previous = { result: null };
    const ctx = createMockContext('afterUpdate', interview, previous, interview);

    await InterviewFeedbackTrigger.handler(ctx);

    expect(mockQlDocUpdate).not.toHaveBeenCalled();
  });
});
