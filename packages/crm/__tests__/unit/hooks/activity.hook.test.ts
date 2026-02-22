import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import {
  ActivityRelatedObjectUpdatesTrigger,
  ActivityCompletionTrigger,
  ActivityTypeValidationTrigger
} from '../../../src/hooks/activity.hook';

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

describe('Activity Hook - ActivityRelatedObjectUpdatesTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update contact last activity date when activity is completed', async () => {
    const activity = { Status: 'completed', ActivityDate: '2024-01-15', WhoId: 'con_001' };
    const ctx = createMockContext('afterInsert', activity, undefined, activity);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await ActivityRelatedObjectUpdatesTrigger.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Updating LastContactDate for contact: con_001'));
    consoleSpy.mockRestore();
  });

  it('should skip when activity is not completed and date unchanged', async () => {
    const activity = { Status: 'planned', ActivityDate: '2024-01-15', WhoId: 'con_001' };
    const oldActivity = { Status: 'planned', ActivityDate: '2024-01-15' };
    const ctx = createMockContext('afterUpdate', activity, oldActivity, activity);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await ActivityRelatedObjectUpdatesTrigger.handler(ctx);

    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Updating LastContactDate'));
    consoleSpy.mockRestore();
  });

  it('should update related object when WhatId is present and activity is completed', async () => {
    const activity = { Status: 'completed', ActivityDate: '2024-01-15', WhatId: 'opp_001' };
    const ctx = createMockContext('afterInsert', activity, undefined, activity);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await ActivityRelatedObjectUpdatesTrigger.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Updating LastActivityDate for related object: opp_001'));
    consoleSpy.mockRestore();
  });
});

describe('Activity Hook - ActivityCompletionTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set CompletedDate when status changes to completed', async () => {
    const activity = { Subject: 'Call client', Status: 'completed' };
    const oldActivity = { Status: 'in_progress' };
    const ctx = createMockContext('beforeUpdate', activity, oldActivity);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await ActivityCompletionTrigger.handler(ctx);

    expect(activity.CompletedDate).toBeDefined();
    consoleSpy.mockRestore();
  });

  it('should not set CompletedDate when status was already completed', async () => {
    const activity = { Subject: 'Call client', Status: 'completed' };
    const oldActivity = { Status: 'completed' };
    const ctx = createMockContext('beforeUpdate', activity, oldActivity);

    await ActivityCompletionTrigger.handler(ctx);

    expect(activity.CompletedDate).toBeUndefined();
  });
});

describe('Activity Hook - ActivityTypeValidationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should warn for connected call without duration', async () => {
    const activity = { Type: 'call', Subject: 'Client call', CallResult: 'connected' };
    const ctx = createMockContext('beforeInsert', activity);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation();

    await ActivityTypeValidationTrigger.handler(ctx);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Connected call should have duration'));
    consoleSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
