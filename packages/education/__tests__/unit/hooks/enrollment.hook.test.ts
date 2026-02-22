import type { HookContext } from '@objectstack/spec/data';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  EnrollmentPrerequisiteCheck,
  EnrollmentCapacityEnforcement,
  EnrollmentWaitlistManagement,
  EnrollmentGradePosting
} from '../../../src/enrollment.hook';

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
const mockQlFindOne = vi.fn();
const mockQlDocUpdate = vi.fn();
const mockQlCount = vi.fn();

function createMockContext(event: string, doc: any, result?: any): HookContext {
  const base: any = {
    event,
    ql: {
      find: mockQlFind,
      findOne: mockQlFindOne,
      doc: { update: mockQlDocUpdate },
      count: mockQlCount
    },
    session: { userId: 'user_1', tenantId: 'tenant_1' },
    user: { id: 'user_1' }
  };

  if (event.startsWith('before')) {
    base.input = { doc };
  } else {
    base.result = result || doc;
    base.input = { doc };
  }
  return base;
}

// ─── EnrollmentPrerequisiteCheck ───────────────────────────────────────────────

describe('EnrollmentPrerequisiteCheck', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct hook metadata', () => {
    expect(EnrollmentPrerequisiteCheck.name).toBe('EnrollmentPrerequisiteCheck');
    expect(EnrollmentPrerequisiteCheck.object).toBe('enrollment');
    expect(EnrollmentPrerequisiteCheck.events).toContain('beforeInsert');
  });

  it('should pass when no prerequisites exist', async () => {
    mockQlFindOne.mockResolvedValue({ _id: 'course_1', name: 'Math 101' });
    const doc = { course_id: 'course_1', student_id: 'student_1' };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(EnrollmentPrerequisiteCheck.handler(ctx)).resolves.toBeUndefined();
  });

  it('should pass when all prerequisites are met', async () => {
    mockQlFindOne.mockResolvedValue({
      _id: 'course_2',
      prerequisites: JSON.stringify(['course_1'])
    });
    mockQlFind.mockResolvedValue([{ course_id: 'course_1', status: 'completed' }]);

    const doc = { course_id: 'course_2', student_id: 'student_1' };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(EnrollmentPrerequisiteCheck.handler(ctx)).resolves.toBeUndefined();
  });

  it('should throw when prerequisites are not met', async () => {
    mockQlFindOne.mockResolvedValue({
      _id: 'course_2',
      prerequisites: JSON.stringify(['course_1'])
    });
    mockQlFind.mockResolvedValue([]);

    const doc = { course_id: 'course_2', student_id: 'student_1' };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(EnrollmentPrerequisiteCheck.handler(ctx)).rejects.toThrow('Missing prerequisites');
  });

  it('should skip when course_id is missing', async () => {
    const doc = { student_id: 'student_1' };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(EnrollmentPrerequisiteCheck.handler(ctx)).resolves.toBeUndefined();
    expect(mockQlFindOne).not.toHaveBeenCalled();
  });
});

// ─── EnrollmentCapacityEnforcement ─────────────────────────────────────────────

describe('EnrollmentCapacityEnforcement', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct hook metadata', () => {
    expect(EnrollmentCapacityEnforcement.name).toBe('EnrollmentCapacityEnforcement');
    expect(EnrollmentCapacityEnforcement.object).toBe('enrollment');
    expect(EnrollmentCapacityEnforcement.events).toContain('beforeInsert');
  });

  it('should pass when course has available capacity', async () => {
    mockQlFindOne.mockResolvedValue({ _id: 'course_1', capacity: 30 });
    mockQlCount.mockResolvedValue(20);

    const doc = { course_id: 'course_1' };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(EnrollmentCapacityEnforcement.handler(ctx)).resolves.toBeUndefined();
  });

  it('should throw when course is at full capacity', async () => {
    mockQlFindOne.mockResolvedValue({ _id: 'course_1', capacity: 30 });
    mockQlCount.mockResolvedValue(30);

    const doc = { course_id: 'course_1' };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(EnrollmentCapacityEnforcement.handler(ctx)).rejects.toThrow('full capacity');
  });

  it('should pass when course has no capacity limit', async () => {
    mockQlFindOne.mockResolvedValue({ _id: 'course_1' });

    const doc = { course_id: 'course_1' };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(EnrollmentCapacityEnforcement.handler(ctx)).resolves.toBeUndefined();
  });

  it('should skip when course_id is missing', async () => {
    const doc = {};
    const ctx = createMockContext('beforeInsert', doc);

    await expect(EnrollmentCapacityEnforcement.handler(ctx)).resolves.toBeUndefined();
    expect(mockQlFindOne).not.toHaveBeenCalled();
  });
});

// ─── EnrollmentWaitlistManagement ──────────────────────────────────────────────

describe('EnrollmentWaitlistManagement', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct hook metadata', () => {
    expect(EnrollmentWaitlistManagement.name).toBe('EnrollmentWaitlistManagement');
    expect(EnrollmentWaitlistManagement.object).toBe('enrollment');
    expect(EnrollmentWaitlistManagement.events).toContain('afterInsert');
  });

  it('should log when course is over capacity', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockQlFindOne.mockResolvedValue({ _id: 'course_1', capacity: 30 });
    mockQlCount.mockResolvedValue(31);

    const ctx = createMockContext('afterInsert', {},
      { _id: 'enr_1', course_id: 'course_1' }
    );

    await EnrollmentWaitlistManagement.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('over capacity')
    );
    consoleSpy.mockRestore();
  });

  it('should not log when course is within capacity', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockQlFindOne.mockResolvedValue({ _id: 'course_1', capacity: 30 });
    mockQlCount.mockResolvedValue(25);

    const ctx = createMockContext('afterInsert', {},
      { _id: 'enr_1', course_id: 'course_1' }
    );

    await EnrollmentWaitlistManagement.handler(ctx);

    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('over capacity')
    );
    consoleSpy.mockRestore();
  });

  it('should skip when result has no _id', async () => {
    const ctx = createMockContext('afterInsert', {}, {});
    await EnrollmentWaitlistManagement.handler(ctx);
    expect(mockQlFindOne).not.toHaveBeenCalled();
  });
});

// ─── EnrollmentGradePosting ────────────────────────────────────────────────────

describe('EnrollmentGradePosting', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct hook metadata', () => {
    expect(EnrollmentGradePosting.name).toBe('EnrollmentGradePosting');
    expect(EnrollmentGradePosting.object).toBe('enrollment');
    expect(EnrollmentGradePosting.events).toContain('afterUpdate');
  });

  it('should update student GPA when grade is posted', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockQlFind.mockResolvedValue([
      { course_id: 'c1', grade: 'A', credits: 3, status: 'completed' },
      { course_id: 'c2', grade: 'B', credits: 3, status: 'completed' }
    ]);

    const ctx = createMockContext('afterUpdate',
      { grade: 'A' },
      { _id: 'enr_1', student_id: 'student_1' }
    );

    await EnrollmentGradePosting.handler(ctx);

    expect(mockQlDocUpdate).toHaveBeenCalledWith('student', 'student_1', { gpa: 3.5 });
    consoleSpy.mockRestore();
  });

  it('should skip when grade is not in update', async () => {
    const ctx = createMockContext('afterUpdate',
      { status: 'completed' },
      { _id: 'enr_1', student_id: 'student_1' }
    );

    await EnrollmentGradePosting.handler(ctx);

    expect(mockQlFind).not.toHaveBeenCalled();
  });

  it('should skip when result has no student_id', async () => {
    const ctx = createMockContext('afterUpdate',
      { grade: 'A' },
      { _id: 'enr_1' }
    );

    await EnrollmentGradePosting.handler(ctx);

    expect(mockQlFind).not.toHaveBeenCalled();
  });

  it('should not throw when GPA calculation fails', async () => {
    mockQlFind.mockRejectedValue(new Error('DB error'));

    const ctx = createMockContext('afterUpdate',
      { grade: 'A' },
      { _id: 'enr_1', student_id: 'student_1' }
    );

    await expect(EnrollmentGradePosting.handler(ctx)).resolves.toBeUndefined();
  });
});
