import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

import { CaseEntitlementCheck } from '../../../src/hooks/case.hook';

describe('CaseEntitlementCheck', () => {
  let mockQl: any;

  beforeEach(() => {
    mockQl = {
      find: vi.fn(),
      doc: {
        create: vi.fn(),
        update: vi.fn(),
        get: vi.fn()
      }
    };
  });

  it('should assign Platinum SLA with 4-hour resolution and critical priority', async () => {
    const caseDoc = {
      account: 'acc_1',
      subject: 'Urgent Issue',
      priority: 'high'
    };
    const ctx = { 
      input: { doc: caseDoc },
      ql: mockQl
    };

    mockQl.find.mockResolvedValueOnce([{ _id: 'acc_1', sla: 'Platinum' }]);

    await CaseEntitlementCheck.handler(ctx as any);

    expect(mockQl.find).toHaveBeenCalledWith('account', {
      filters: [['_id', '=', 'acc_1']]
    });
    expect(caseDoc.entitlement_name).toBe('Platinum Support');
    expect(caseDoc.priority).toBe('critical');
    expect(caseDoc.target_resolution_date).toBeDefined();

    // Verify ~4 hours target
    const target = new Date(caseDoc.target_resolution_date).getTime();
    const now = Date.now();
    const diffHours = (target - now) / (1000 * 60 * 60);
    expect(diffHours).toBeGreaterThan(3.9);
    expect(diffHours).toBeLessThan(4.1);
  });

  it('should assign Gold SLA with 12-hour resolution and high priority', async () => {
    const caseDoc = {
      account: 'acc_2',
      subject: 'Gold Issue',
      priority: 'medium'
    } as Record<string, any>;
    const ctx = { 
      input: { doc: caseDoc },
      ql: mockQl
    };

    mockQl.find.mockResolvedValueOnce([{ _id: 'acc_2', sla: 'Gold' }]);

    await CaseEntitlementCheck.handler(ctx as any);

    expect(caseDoc.entitlement_name).toBe('Gold Support');
    expect(caseDoc.priority).toBe('high');

    const target = new Date(caseDoc.target_resolution_date).getTime();
    const diffHours = (target - Date.now()) / (1000 * 60 * 60);
    expect(diffHours).toBeGreaterThan(11.9);
    expect(diffHours).toBeLessThan(12.1);
  });

  it('should not override critical priority for Gold SLA', async () => {
    const caseDoc = {
      account: 'acc_gold',
      subject: 'Critical Gold',
      priority: 'critical'
    } as Record<string, any>;
    const ctx = { 
      input: { doc: caseDoc },
      ql: mockQl
    };

    mockQl.find.mockResolvedValueOnce([{ _id: 'acc_gold', sla: 'Gold' }]);

    await CaseEntitlementCheck.handler(ctx as any);

    expect(caseDoc.priority).toBe('critical');
    expect(caseDoc.entitlement_name).toBe('Gold Support');
  });

  it('should assign Silver SLA with 24-hour resolution and not change priority', async () => {
    const caseDoc = {
      account: 'acc_3',
      subject: 'Silver Issue',
      priority: 'medium'
    } as Record<string, any>;
    const ctx = { 
      input: { doc: caseDoc },
      ql: mockQl
    };

    mockQl.find.mockResolvedValueOnce([{ _id: 'acc_3', sla: 'Silver' }]);

    await CaseEntitlementCheck.handler(ctx as any);

    expect(caseDoc.entitlement_name).toBe('Silver Support');
    expect(caseDoc.priority).toBe('medium');

    const target = new Date(caseDoc.target_resolution_date).getTime();
    const diffHours = (target - Date.now()) / (1000 * 60 * 60);
    expect(diffHours).toBeGreaterThan(23.9);
    expect(diffHours).toBeLessThan(24.1);
  });

  it('should assign Standard SLA with 48-hour resolution when sla is not set', async () => {
    const caseDoc = {
      account: 'acc_4',
      subject: 'Standard Issue',
      priority: 'low'
    } as Record<string, any>;
    const ctx = { 
      input: { doc: caseDoc },
      ql: mockQl
    };

    // Account without sla field
    mockQl.find.mockResolvedValueOnce([{ _id: 'acc_4' }]);

    await CaseEntitlementCheck.handler(ctx as any);

    expect(caseDoc.entitlement_name).toBe('Standard Support');
    expect(caseDoc.priority).toBe('low');

    const target = new Date(caseDoc.target_resolution_date).getTime();
    const diffHours = (target - Date.now()) / (1000 * 60 * 60);
    expect(diffHours).toBeGreaterThan(47.9);
    expect(diffHours).toBeLessThan(48.1);
  });

  it('should skip entitlement check when no account is linked', async () => {
    const caseDoc = { subject: 'No account case' } as Record<string, any>;
    const ctx = { 
      input: { doc: caseDoc },
      ql: mockQl
    };

    await CaseEntitlementCheck.handler(ctx as any);

    expect(mockQl.find).not.toHaveBeenCalled();
    expect(caseDoc.entitlement_name).toBeUndefined();
    expect(caseDoc.target_resolution_date).toBeUndefined();
  });

  it('should return early when account is not found in database', async () => {
    const caseDoc = {
      account: 'acc_missing',
      subject: 'Orphan case'
    } as Record<string, any>;
    const ctx = { 
      input: { doc: caseDoc },
      ql: mockQl
    };

    mockQl.find.mockResolvedValueOnce([]);

    await CaseEntitlementCheck.handler(ctx as any);

    expect(mockQl.find).toHaveBeenCalled();
    expect(caseDoc.entitlement_name).toBeUndefined();
    expect(caseDoc.target_resolution_date).toBeUndefined();
  });

  it('should return early when db.find returns null', async () => {
    const caseDoc = {
      account: 'acc_null',
      subject: 'Null result case'
    } as Record<string, any>;
    const ctx = { 
      input: { doc: caseDoc },
      ql: mockQl
    };

    mockQl.find.mockResolvedValueOnce(null);

    await CaseEntitlementCheck.handler(ctx as any);

    expect(caseDoc.entitlement_name).toBeUndefined();
  });

  it('should handle errors gracefully', async () => {
    const caseDoc = {
      account: 'acc_err',
      subject: 'Error case'
    } as Record<string, any>;
    const ctx = { 
      input: { doc: caseDoc },
      ql: mockQl
    };

    mockQl.find.mockRejectedValueOnce(new Error('DB connection failed'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await CaseEntitlementCheck.handler(ctx as any);

    expect(consoleSpy).toHaveBeenCalledWith(
      '❌ Error executing CaseEntitlementCheck:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('should set target_resolution_date as a valid ISO string', async () => {
    const caseDoc = {
      account: 'acc_iso',
      subject: 'ISO date test'
    } as Record<string, any>;
    const ctx = { 
      input: { doc: caseDoc },
      ql: mockQl
    };

    mockQl.find.mockResolvedValueOnce([{ _id: 'acc_iso', sla: 'Silver' }]);

    await CaseEntitlementCheck.handler(ctx as any);

    expect(caseDoc.target_resolution_date).toBeDefined();
    const parsed = new Date(caseDoc.target_resolution_date);
    expect(parsed.toISOString()).toBe(caseDoc.target_resolution_date);
  });

  it('should have correct hook metadata', () => {
    expect(CaseEntitlementCheck.name).toBe('CaseEntitlementCheck');
    expect(CaseEntitlementCheck.object).toBe('case');
    expect(CaseEntitlementCheck.events).toEqual(['beforeInsert']);
  });

  it('should assign Standard SLA with explicit Standard sla value', async () => {
    const caseDoc = {
      account: 'acc_std',
      subject: 'Explicit Standard',
      priority: 'medium'
    } as Record<string, any>;
    const ctx = { 
      input: { doc: caseDoc },
      ql: mockQl
    };

    mockQl.find.mockResolvedValueOnce([{ _id: 'acc_std', sla: 'Standard' }]);

    await CaseEntitlementCheck.handler(ctx as any);

    expect(caseDoc.entitlement_name).toBe('Standard Support');
    const target = new Date(caseDoc.target_resolution_date).getTime();
    const diffHours = (target - Date.now()) / (1000 * 60 * 60);
    expect(diffHours).toBeGreaterThan(47.9);
    expect(diffHours).toBeLessThan(48.1);
  });
});
