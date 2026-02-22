import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import {
  ContactDecisionChainTrigger,
  ContactDecisionMakerValidationTrigger,
  ContactDuplicateDetectionTrigger,
  ContactRelationshipStrengthTrigger
} from '../../../src/hooks/contact.hook';

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

describe('Contact Hook - ContactDecisionChainTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should auto-set InfluenceLevel to high for c_level contact', async () => {
    const contact = { Level: 'c_level' };
    const ctx = createMockContext('beforeInsert', contact);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await ContactDecisionChainTrigger.handler(ctx);

    expect(contact.InfluenceLevel).toBe('high');
    expect(contact.IsDecisionMaker).toBe(true);
    consoleSpy.mockRestore();
  });

  it('should auto-set InfluenceLevel to medium for Director', async () => {
    const contact = { Level: 'Director' };
    const ctx = createMockContext('beforeInsert', contact);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await ContactDecisionChainTrigger.handler(ctx);

    expect(contact.InfluenceLevel).toBe('medium');
    consoleSpy.mockRestore();
  });

  it('should auto-set InfluenceLevel to low for Individual Contributor', async () => {
    const contact = { Level: 'Individual Contributor' };
    const ctx = createMockContext('beforeUpdate', contact, {});
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await ContactDecisionChainTrigger.handler(ctx);

    expect(contact.InfluenceLevel).toBe('low');
    consoleSpy.mockRestore();
  });

  it('should not override existing InfluenceLevel', async () => {
    const contact = { Level: 'c_level', InfluenceLevel: 'low' };
    const ctx = createMockContext('beforeInsert', contact);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await ContactDecisionChainTrigger.handler(ctx);

    expect(contact.InfluenceLevel).toBe('low');
    // But IsDecisionMaker is still auto-set for c_level
    expect(contact.IsDecisionMaker).toBe(true);
    consoleSpy.mockRestore();
  });
});

describe('Contact Hook - ContactDecisionMakerValidationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should skip when contact has no AccountId', async () => {
    const contact = { FirstName: 'John' };
    const ctx = createMockContext('afterInsert', contact, undefined, contact);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

    await ContactDecisionMakerValidationTrigger.handler(ctx);

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('Contact Hook - ContactDuplicateDetectionTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log new contact email on insert', async () => {
    const contact = { FirstName: 'Jane', LastName: 'Doe', Email: 'jane@test.com' };
    const ctx = createMockContext('beforeInsert', contact);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await ContactDuplicateDetectionTrigger.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('jane@test.com'));
    consoleSpy.mockRestore();
  });
});

describe('Contact Hook - ContactRelationshipStrengthTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should demote strong to medium when no contact for 90+ days', async () => {
    const pastDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
    const contact = { LastContactDate: pastDate, RelationshipStrength: 'strong' };
    const ctx = createMockContext('beforeUpdate', contact, {});
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await ContactRelationshipStrengthTrigger.handler(ctx);

    expect(contact.RelationshipStrength).toBe('medium');
    consoleSpy.mockRestore();
  });

  it('should promote weak to medium with recent contact', async () => {
    const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const contact = { LastContactDate: recentDate, RelationshipStrength: 'weak' };
    const ctx = createMockContext('beforeUpdate', contact, {});
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await ContactRelationshipStrengthTrigger.handler(ctx);

    expect(contact.RelationshipStrength).toBe('medium');
    consoleSpy.mockRestore();
  });
});
