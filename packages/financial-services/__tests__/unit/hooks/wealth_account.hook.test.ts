import type { HookContext } from '@objectstack/spec/data';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  WealthAccountRiskAssessment,
  WealthAccountSuitabilityCheck,
  WealthAccountBalanceAlert
} from '../../../src/wealth_account.hook';

const mockQlFind = vi.fn();
const mockQlFindOne = vi.fn();
const mockQlDocUpdate = vi.fn();

function createMockContext(event: string, doc: any, result?: any): HookContext {
  const base: any = {
    event,
    ql: {
      find: mockQlFind,
      findOne: mockQlFindOne,
      doc: { update: mockQlDocUpdate }
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

// ─── WealthAccountRiskAssessment ────────────────────────────────────────────────

describe('WealthAccountRiskAssessment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct hook metadata', () => {
    expect(WealthAccountRiskAssessment.name).toBe('WealthAccountRiskAssessment');
    expect(WealthAccountRiskAssessment.object).toBe('wealth_account');
    expect(WealthAccountRiskAssessment.events).toContain('beforeInsert');
    expect(WealthAccountRiskAssessment.events).toContain('beforeUpdate');
  });

  it('should warn when risk profile does not match investment strategy', async () => {
    const consoleSpy = vi.spyOn(console, 'warn');
    const doc = { risk_profile: 'conservative', investment_strategy: 'growth' };
    const ctx = createMockContext('beforeInsert', doc);

    await WealthAccountRiskAssessment.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('may not align')
    );
    consoleSpy.mockRestore();
  });

  it('should not warn when risk profile matches investment strategy', async () => {
    const consoleSpy = vi.spyOn(console, 'warn');
    const doc = { risk_profile: 'aggressive', investment_strategy: 'growth' };
    const ctx = createMockContext('beforeInsert', doc);

    await WealthAccountRiskAssessment.handler(ctx);

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should skip validation when fields are missing', async () => {
    const consoleSpy = vi.spyOn(console, 'warn');
    const doc = { risk_profile: 'moderate' };
    const ctx = createMockContext('beforeInsert', doc);

    await WealthAccountRiskAssessment.handler(ctx);

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// ─── WealthAccountSuitabilityCheck ──────────────────────────────────────────────

describe('WealthAccountSuitabilityCheck', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct hook metadata', () => {
    expect(WealthAccountSuitabilityCheck.name).toBe('WealthAccountSuitabilityCheck');
    expect(WealthAccountSuitabilityCheck.object).toBe('wealth_account');
    expect(WealthAccountSuitabilityCheck.events).toContain('beforeUpdate');
  });

  it('should warn when changing conservative account to growth strategy', async () => {
    const consoleSpy = vi.spyOn(console, 'warn');
    mockQlFindOne.mockResolvedValueOnce({ risk_profile: 'conservative' });
    const doc = { _id: 'acc_1', investment_strategy: 'growth' };
    const ctx = createMockContext('beforeUpdate', doc);

    await WealthAccountSuitabilityCheck.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Suitability concern')
    );
    consoleSpy.mockRestore();
  });

  it('should not warn when risk_profile is provided in update', async () => {
    const consoleSpy = vi.spyOn(console, 'warn');
    const doc = { _id: 'acc_1', investment_strategy: 'growth', risk_profile: 'aggressive' };
    const ctx = createMockContext('beforeUpdate', doc);

    await WealthAccountSuitabilityCheck.handler(ctx);

    expect(mockQlFindOne).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// ─── WealthAccountBalanceAlert ──────────────────────────────────────────────────

describe('WealthAccountBalanceAlert', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct hook metadata', () => {
    expect(WealthAccountBalanceAlert.name).toBe('WealthAccountBalanceAlert');
    expect(WealthAccountBalanceAlert.object).toBe('wealth_account');
    expect(WealthAccountBalanceAlert.events).toContain('afterUpdate');
  });

  it('should alert when balance drops below threshold', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    const doc = { balance: 5000 };
    const result = { _id: 'acc_1', balance: 5000 };
    const ctx = createMockContext('afterUpdate', doc, result);

    await WealthAccountBalanceAlert.handler(ctx);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Balance alert')
    );
    consoleSpy.mockRestore();
  });

  it('should not alert when balance is above threshold', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    const doc = { balance: 50000 };
    const result = { _id: 'acc_1', balance: 50000 };
    const ctx = createMockContext('afterUpdate', doc, result);

    await WealthAccountBalanceAlert.handler(ctx);

    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Balance alert')
    );
    consoleSpy.mockRestore();
  });

  it('should not alert when balance is not provided', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    const doc = { status: 'active' };
    const result = { _id: 'acc_1', status: 'active' };
    const ctx = createMockContext('afterUpdate', doc, result);

    await WealthAccountBalanceAlert.handler(ctx);

    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Balance alert')
    );
    consoleSpy.mockRestore();
  });
});
