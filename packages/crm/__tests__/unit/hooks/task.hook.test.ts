import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import {
  TaskValidationTrigger,
  TaskCompletionTrigger,
  TaskOverdueTrigger
} from '../../../src/hooks/task.hook';

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

describe('Task Hook - TaskValidationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw error when subject is empty', async () => {
    const doc = { subject: '' };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(TaskValidationTrigger.handler(ctx)).rejects.toThrow('Task subject cannot be empty');
  });

  it('should throw error when due_date is before start_date', async () => {
    const doc = { subject: 'My Task', due_date: '2024-01-01', start_date: '2024-01-15' };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(TaskValidationTrigger.handler(ctx)).rejects.toThrow('Due date cannot be earlier than start date');
  });

  it('should auto-set status to not_started on insert if not provided', async () => {
    const doc = { subject: 'New Task' };
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await TaskValidationTrigger.handler(ctx);

    expect(doc.status).toBe('not_started');
    consoleSpy.mockRestore();
  });

  it('should pass validation for valid task', async () => {
    const doc = { subject: 'Valid Task', due_date: '2024-01-15', start_date: '2024-01-01' };
    const ctx = createMockContext('beforeUpdate', doc, {});
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await expect(TaskValidationTrigger.handler(ctx)).resolves.toBeUndefined();
    consoleSpy.mockRestore();
  });
});

describe('Task Hook - TaskCompletionTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set completed_date and percent_complete when completing task', async () => {
    const doc = { subject: 'Done Task', status: 'completed' };
    const oldDoc = { status: 'in_progress' };
    const ctx = createMockContext('beforeUpdate', doc, oldDoc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await TaskCompletionTrigger.handler(ctx);

    expect(doc.completed_date).toBeDefined();
    expect(doc.percent_complete).toBe(100);
    consoleSpy.mockRestore();
  });

  it('should clear completed_date when reopening task', async () => {
    const doc = { subject: 'Reopened Task', status: 'in_progress', completed_date: '2024-01-01' };
    const oldDoc = { status: 'completed' };
    const ctx = createMockContext('beforeUpdate', doc, oldDoc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await TaskCompletionTrigger.handler(ctx);

    expect(doc.completed_date).toBeNull();
    consoleSpy.mockRestore();
  });
});

describe('Task Hook - TaskOverdueTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should warn for overdue task', async () => {
    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const task = { subject: 'Overdue Task', due_date: pastDate, status: 'in_progress' };
    const ctx = createMockContext('afterUpdate', task, {}, task);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation();

    await TaskOverdueTrigger.handler(ctx);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Task overdue'));
    warnSpy.mockRestore();
  });

  it('should not warn for completed task even if past due', async () => {
    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const task = { subject: 'Done Task', due_date: pastDate, status: 'completed' };
    const ctx = createMockContext('afterUpdate', task, {}, task);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation();

    await TaskOverdueTrigger.handler(ctx);

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
