import type { HookContext } from '@objectstack/spec/data';
import { vi } from 'vitest';
import {
  AccountHealthScoreTrigger,
  AccountHierarchyTrigger,
  AccountStatusAutomationTrigger
} from '../../../src/hooks/account.hook';

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

describe('Account Hook - AccountHealthScoreTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate healthy score for active customer with high contract value', async () => {
    const account = { Name: 'BigCorp', CustomerStatus: 'active_customer', ContractValue: 2000000 };
    const ctx = createMockContext('beforeInsert', account);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await AccountHealthScoreTrigger.handler(ctx);

    // active_customer => 20, >1M => 25, activity default => 15, payment default => 10, support default => 12 = 82
    expect(account.HealthScore).toBe(82);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Healthy'));
    consoleSpy.mockRestore();
  });

  it('should calculate at-risk score for prospect with moderate contract value', async () => {
    const account = { Name: 'MidCorp', CustomerStatus: 'prospect', ContractValue: 200000 };
    const ctx = createMockContext('beforeInsert', account);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await AccountHealthScoreTrigger.handler(ctx);

    // prospect => 10, >100K => 15, defaults => 15+10+12 = 62
    expect(account.HealthScore).toBe(62);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('At Risk'));
    consoleSpy.mockRestore();
  });

  it('should calculate critical score for account with no status and no contract', async () => {
    const account = { Name: 'SmallCo', CustomerStatus: undefined, ContractValue: 0 };
    const ctx = createMockContext('beforeUpdate', account, {});
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await AccountHealthScoreTrigger.handler(ctx);

    // no status => 0, 0 value => 0, defaults => 15+10+12 = 37
    expect(account.HealthScore).toBe(37);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Critical'));
    consoleSpy.mockRestore();
  });

  it('should not throw on error and allow account save', async () => {
    const account = { Name: 'ErrorCo', CustomerStatus: 'active_customer', ContractValue: 500 };
    const ctx = createMockContext('beforeInsert', account);
    // Force an error by making ctx.input.doc non-writable
    Object.defineProperty(ctx.input, 'doc', { get() { throw new Error('test error'); } });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

    await expect(AccountHealthScoreTrigger.handler(ctx)).resolves.toBeUndefined();

    consoleSpy.mockRestore();
  });
});

describe('Account Hook - AccountHierarchyTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update parent account metrics when account has ParentId', async () => {
    const account = { Id: 'acc_001', ParentId: 'parent_001', OwnerId: 'user_1' };
    const ctx = createMockContext('afterInsert', account, undefined, account);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await AccountHierarchyTrigger.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Updating parent account metrics: parent_001'));
    consoleSpy.mockRestore();
  });

  it('should update both old and new parent when ParentId changes', async () => {
    const account = { Id: 'acc_001', ParentId: 'parent_002', OwnerId: 'user_1' };
    const oldAccount = { Id: 'acc_001', ParentId: 'parent_001', OwnerId: 'user_1' };
    const ctx = createMockContext('afterUpdate', account, oldAccount, account);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await AccountHierarchyTrigger.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Updating parent account metrics: parent_001'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Updating parent account metrics: parent_002'));
    consoleSpy.mockRestore();
  });

  it('should cascade ownership change to child accounts', async () => {
    const account = { Id: 'acc_001', OwnerId: 'new_owner', ParentId: null };
    const oldAccount = { Id: 'acc_001', OwnerId: 'old_owner', ParentId: null };
    const ctx = createMockContext('afterUpdate', account, oldAccount, account);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await AccountHierarchyTrigger.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cascading ownership change'));
    consoleSpy.mockRestore();
  });
});

describe('Account Hook - AccountStatusAutomationTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should auto-upgrade prospect to active_customer when ContractValue > 0', async () => {
    const account = { Name: 'UpgradeCo', CustomerStatus: 'prospect', ContractValue: 50000 };
    const ctx = createMockContext('beforeUpdate', account, {});
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    await AccountStatusAutomationTrigger.handler(ctx);

    expect(account.CustomerStatus).toBe('active_customer');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Auto-upgraded'));
    consoleSpy.mockRestore();
  });

  it('should warn when active customer has low health score', async () => {
    const account = { Name: 'RiskCo', CustomerStatus: 'active_customer', HealthScore: 30, ContractValue: 0 };
    const ctx = createMockContext('beforeUpdate', account, {});
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();

    await AccountStatusAutomationTrigger.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('at risk'));
    consoleSpy.mockRestore();
  });

  it('should not change status when already active_customer with no risk', async () => {
    const account = { Name: 'StableCo', CustomerStatus: 'active_customer', HealthScore: 80, ContractValue: 100000 };
    const ctx = createMockContext('beforeUpdate', account, {});
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation();

    await AccountStatusAutomationTrigger.handler(ctx);

    expect(account.CustomerStatus).toBe('active_customer');
    expect(warnSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
