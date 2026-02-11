import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import {
  TimeOffBalanceValidationTrigger,
  TimeOffApprovalTrigger
} from '../../../src/hooks/time_off.hook';

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

describe('TimeOff Hook - TimeOffBalanceValidationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should warn when start_date is after end_date', async () => {
    const timeOff = {
      employee_id: 'emp_001',
      start_date: '2025-06-15',
      end_date: '2025-06-10',
      leave_type: 'Annual Leave'
    };
    const ctx = createMockContext('beforeInsert', timeOff);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await TimeOffBalanceValidationTrigger.handler(ctx);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('after end date'));
    warnSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('should calculate business days correctly', async () => {
    // Mon Jun 9 to Fri Jun 13 = 5 business days
    const timeOff = {
      employee_id: 'emp_002',
      start_date: '2025-06-09',
      end_date: '2025-06-13',
      leave_type: 'Annual Leave'
    };
    mockQlFind.mockResolvedValue([]);
    const ctx = createMockContext('beforeInsert', timeOff);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await TimeOffBalanceValidationTrigger.handler(ctx);

    expect(ctx.input.doc.total_days).toBe(5);
    consoleSpy.mockRestore();
  });

  it('should warn when balance is insufficient', async () => {
    const timeOff = {
      employee_id: 'emp_003',
      start_date: '2025-06-09',
      end_date: '2025-06-13',
      leave_type: 'Personal Leave',
      total_days: 5
    };
    // Already used 4 of 5 Personal Leave days
    mockQlFind.mockResolvedValue([
      { total_days: 4, status: 'approved' }
    ]);
    const ctx = createMockContext('beforeInsert', timeOff);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await TimeOffBalanceValidationTrigger.handler(ctx);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('insufficient'));
    warnSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('should pass validation for valid time-off request', async () => {
    const timeOff = {
      employee_id: 'emp_004',
      start_date: '2099-06-09',
      end_date: '2099-06-10',
      leave_type: 'Annual Leave'
    };
    mockQlFind.mockResolvedValue([]);
    const ctx = createMockContext('beforeInsert', timeOff);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await TimeOffBalanceValidationTrigger.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Time-off validation passed'));
    consoleSpy.mockRestore();
  });

  it('should warn for past start date on insert', async () => {
    const timeOff = {
      employee_id: 'emp_005',
      start_date: '2020-01-01',
      leave_type: 'Annual Leave'
    };
    const ctx = createMockContext('beforeInsert', timeOff);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await TimeOffBalanceValidationTrigger.handler(ctx);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('in the past'));
    warnSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});

describe('TimeOff Hook - TimeOffApprovalTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set approval date when approved', async () => {
    const timeOff = {
      id: 'to_001',
      request_number: 'TO-001',
      employee_id: 'emp_001',
      leave_type: 'Annual Leave',
      total_days: 3,
      status: 'approved'
    };
    const previous = { status: 'pending' };
    const ctx = createMockContext('afterUpdate', timeOff, previous, timeOff);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
    vi.spyOn(console, 'debug').mockImplementation();

    await TimeOffApprovalTrigger.handler(ctx);

    expect(mockQlDocUpdate).toHaveBeenCalledWith('time_off', 'to_001', expect.objectContaining({
      approval_date: expect.any(String)
    }));
    consoleSpy.mockRestore();
  });

  it('should log balance restoration on cancellation after approval', async () => {
    const timeOff = {
      id: 'to_002',
      request_number: 'TO-002',
      employee_id: 'emp_002',
      leave_type: 'Sick Leave',
      total_days: 2,
      status: 'cancelled'
    };
    const previous = { status: 'approved' };
    const ctx = createMockContext('afterUpdate', timeOff, previous, timeOff);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
    vi.spyOn(console, 'debug').mockImplementation();

    await TimeOffApprovalTrigger.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('cancelled after approval'));
    consoleSpy.mockRestore();
  });

  it('should not trigger when status has not changed', async () => {
    const timeOff = {
      id: 'to_003',
      request_number: 'TO-003',
      status: 'pending'
    };
    const previous = { status: 'pending' };
    const ctx = createMockContext('afterUpdate', timeOff, previous, timeOff);

    await TimeOffApprovalTrigger.handler(ctx);

    expect(mockQlDocUpdate).not.toHaveBeenCalled();
  });

  it('should not trigger without previous state', async () => {
    const timeOff = { id: 'to_004', status: 'approved' };
    const ctx = createMockContext('afterUpdate', timeOff, undefined, timeOff);

    await TimeOffApprovalTrigger.handler(ctx);

    expect(mockQlDocUpdate).not.toHaveBeenCalled();
  });
});
