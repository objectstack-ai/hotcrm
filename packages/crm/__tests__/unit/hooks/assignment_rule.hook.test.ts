import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import {
  AssignmentRuleValidationTrigger,
  AssignmentRuleSortOrderTrigger
} from '../../../src/hooks/assignment_rule.hook';

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

describe('Assignment Rule Hook - AssignmentRuleValidationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw error when name is empty', async () => {
    const doc = { name: '', assign_to: 'user_1' };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(AssignmentRuleValidationTrigger.handler(ctx)).rejects.toThrow('Assignment rule name cannot be empty');
  });

  it('should throw error for invalid criteria_operator', async () => {
    const doc = { name: 'Test Rule', criteria_operator: 'like', assign_to: 'user_1' };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(AssignmentRuleValidationTrigger.handler(ctx)).rejects.toThrow('Invalid criteria_operator');
  });

  it('should throw error when neither assign_to nor assign_to_queue is provided', async () => {
    const doc = { name: 'Test Rule', criteria_operator: '=' };
    const ctx = createMockContext('beforeInsert', doc);

    await expect(AssignmentRuleValidationTrigger.handler(ctx)).rejects.toThrow('Either assign_to or assign_to_queue must be provided');
  });

  it('should pass validation for valid assignment rule', async () => {
    const doc = { name: 'Lead Rule', criteria_operator: 'contains', assign_to: 'user_1' };
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await expect(AssignmentRuleValidationTrigger.handler(ctx)).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Assignment rule validated'));
    consoleSpy.mockRestore();
  });
});

describe('Assignment Rule Hook - AssignmentRuleSortOrderTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should auto-assign sort_order based on existing rules', async () => {
    const doc = { name: 'New Rule', object_name: 'lead' };
    mockQlFind.mockResolvedValue([{ sort_order: 20 }]);
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await AssignmentRuleSortOrderTrigger.handler(ctx);

    expect(doc.sort_order).toBe(30);
    consoleSpy.mockRestore();
  });

  it('should set sort_order to 10 when no existing rules', async () => {
    const doc = { name: 'First Rule', object_name: 'contact' };
    mockQlFind.mockResolvedValue([]);
    const ctx = createMockContext('beforeInsert', doc);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await AssignmentRuleSortOrderTrigger.handler(ctx);

    expect(doc.sort_order).toBe(10);
    consoleSpy.mockRestore();
  });

  it('should skip if sort_order is already provided', async () => {
    const doc = { name: 'Manual Rule', object_name: 'lead', sort_order: 5 };
    const ctx = createMockContext('beforeInsert', doc);

    await AssignmentRuleSortOrderTrigger.handler(ctx);

    expect(doc.sort_order).toBe(5);
    expect(mockQlFind).not.toHaveBeenCalled();
  });
});
