import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import { LeadScoringTrigger, LeadStatusChangeTrigger } from '../../../src/hooks/lead.hook';

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
    baseContext.input = doc;
    baseContext.previous = previous;
  } else {
    baseContext.result = result || doc;
    baseContext.previous = previous;
    baseContext.input = doc;
  }
  return baseContext;
};

describe('Lead Hook - LeadScoringTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate data completeness based on filled fields', async () => {
    const lead: any = {
      FirstName: 'John',
      LastName: 'Doe',
      Company: 'Acme',
      Title: 'CTO',
      email: 'john@acme.com',
      phone: '555-1234',
      OwnerId: 'owner_1'
    };
    mockQlFind.mockResolvedValue([]);
    const ctx = createMockContext('beforeInsert', lead);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await LeadScoringTrigger.handler(ctx);

    // 6 out of 17 required fields filled => Math.round((6/17)*100) = 35
    expect(lead.DataCompleteness).toBe(35);
    consoleSpy.mockRestore();
  });

  it('should calculate high score for hot lead with large company', async () => {
    const lead: any = {
      FirstName: 'Jane',
      LastName: 'Smith',
      Company: 'TechCorp',
      Title: 'VP Sales',
      email: 'jane@tech.com',
      phone: '555-5678',
      MobilePhone: '555-9999',
      Street: '123 Main',
      City: 'SF',
      State: 'CA',
      Country: 'US',
      Industry: 'technology',
      LeadSource: 'Web',
      Rating: 'Hot',
      NumberOfEmployees: 5000,
      AnnualRevenue: 200000000,
      Description: 'Big enterprise lead',
      NumberOfActivities: 15,
      LastActivityDate: new Date().toISOString(),
      OwnerId: 'owner_1'
    };
    mockQlFind.mockResolvedValue([]);
    const ctx = createMockContext('beforeInsert', lead);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await LeadScoringTrigger.handler(ctx);

    // 100% completeness => 20pts, Hot => 20, technology => 10, >1000 => 15, >100M => 15, >10 activities => 20, recent bonus => 5 = 100 (capped)
    expect(lead.LeadScore).toBe(100);
    consoleSpy.mockRestore();
  });

  it('should calculate low score for cold lead with minimal data', async () => {
    const lead: any = {
      FirstName: 'Bob',
      Rating: 'Cold',
      OwnerId: 'owner_1'
    };
    mockQlFind.mockResolvedValue([]);
    const ctx = createMockContext('beforeInsert', lead);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await LeadScoringTrigger.handler(ctx);

    // 2/17 fields (FirstName, Rating) => 12% completeness => 2pts, Cold => 5 = 7
    expect(lead.LeadScore).toBe(7);
    consoleSpy.mockRestore();
  });

  it('should assign lead via assignment rules when no owner', async () => {
    const lead: any = {
      FirstName: 'Alice',
      Industry: 'finance'
    };
    mockQlFind.mockResolvedValue([
      {
        name: 'Finance Rule',
        criteria_field: 'Industry',
        criteria_operator: '=',
        criteria_value: 'finance',
        assign_to: 'user_456'
      }
    ]);
    const ctx = createMockContext('beforeInsert', lead);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await LeadScoringTrigger.handler(ctx);

    expect(lead.owner).toBe('user_456');
    expect(lead.OwnerId).toBe('user_456');
    consoleSpy.mockRestore();
  });

  it('should not run assignment rules when lead has owner', async () => {
    const lead: any = {
      FirstName: 'Charlie',
      OwnerId: 'existing_owner',
      owner: 'existing_owner'
    };
    const ctx = createMockContext('beforeInsert', lead);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await LeadScoringTrigger.handler(ctx);

    expect(mockQlFind).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should give medium engagement score for 3-5 activities', async () => {
    const lead: any = {
      FirstName: 'Dave',
      NumberOfActivities: 4,
      OwnerId: 'owner_1'
    };
    mockQlFind.mockResolvedValue([]);
    const ctx = createMockContext('beforeUpdate', lead, {});
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await LeadScoringTrigger.handler(ctx);

    // 1/17 => ~6% => ~1pt data completeness, Cold default => 5, activities 4 > 2 => 10 (MEDIUM)
    expect(lead.LeadScore).toBe(16);
    consoleSpy.mockRestore();
  });
});

describe('Lead Hook - LeadStatusChangeTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should skip if status did not change', async () => {
    const lead = { Status: 'open', FirstName: 'John', LastName: 'Doe' };
    const ctx = createMockContext('afterUpdate', lead, { Status: 'open' });

    await LeadStatusChangeTrigger.handler(ctx);

    expect(mockQlDocCreate).not.toHaveBeenCalled();
  });

  it('should handle lead conversion and create account, contact, opportunity, activity', async () => {
    const lead = {
      Id: 'lead_001',
      Status: 'converted',
      FirstName: 'Jane',
      LastName: 'Smith',
      Company: 'TechCorp',
      Phone: '555-1234',
      Email: 'jane@tech.com',
      Industry: 'technology',
      LeadSource: 'Web',
      AnnualRevenue: 1000000
    };
    mockQlDocCreate
      .mockResolvedValueOnce({ _id: 'acc_001' })   // account
      .mockResolvedValueOnce({ _id: 'con_001' })   // contact
      .mockResolvedValueOnce({ _id: 'opp_001' })   // opportunity
      .mockResolvedValueOnce({});                     // activity for conversion
    // logStatusChange also creates an activity
    mockQlDocCreate.mockResolvedValueOnce({});

    const ctx = createMockContext('afterUpdate', lead, { Status: 'open' });
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await LeadStatusChangeTrigger.handler(ctx);

    expect(mockQlDocCreate).toHaveBeenCalledWith('account', expect.objectContaining({
      Name: 'TechCorp',
      Industry: 'technology'
    }));
    expect(mockQlDocCreate).toHaveBeenCalledWith('contact', expect.objectContaining({
      FirstName: 'Jane',
      LastName: 'Smith',
      AccountId: 'acc_001'
    }));
    expect(mockQlDocCreate).toHaveBeenCalledWith('opportunity', expect.objectContaining({
      AccountId: 'acc_001',
      StageName: 'prospecting'
    }));
    consoleSpy.mockRestore();
  });

  it('should handle lead unqualification and log activity', async () => {
    const lead = {
      Id: 'lead_002',
      Status: 'unqualified',
      FirstName: 'Bob',
      LastName: 'Jones'
    };
    mockQlDocCreate.mockResolvedValue({});
    const ctx = createMockContext('afterUpdate', lead, { Status: 'open' });
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await LeadStatusChangeTrigger.handler(ctx);

    expect(mockQlDocCreate).toHaveBeenCalledWith('activity', expect.objectContaining({
      Type: 'Disqualification',
      Status: 'completed'
    }));
    consoleSpy.mockRestore();
  });

  it('should log status change activity for any status transition', async () => {
    const lead = {
      Id: 'lead_003',
      Status: 'qualified',
      FirstName: 'Eve',
      LastName: 'Wilson'
    };
    mockQlDocCreate.mockResolvedValue({});
    const ctx = createMockContext('afterUpdate', lead, { Status: 'open' });
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await LeadStatusChangeTrigger.handler(ctx);

    expect(mockQlDocCreate).toHaveBeenCalledWith('activity', expect.objectContaining({
      Type: 'Status Change',
      Status: 'completed'
    }));
    consoleSpy.mockRestore();
  });
});
