import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuotePricingHook } from '../../../src/hooks/quote.hook';

describe('QuotePricingHook', () => {
  let mockQl: any;
  let mockUser: any;

  beforeEach(() => {
    vi.resetAllMocks();
    mockQl = {
      find: vi.fn().mockResolvedValue([]),
      insert: vi.fn().mockResolvedValue({ _id: 'contract_1', contract_number: 'CT-Q001' }),
      doc: {
        update: vi.fn().mockResolvedValue({}),
        create: vi.fn().mockResolvedValue({ _id: 'activity_1' }),
        get: vi.fn()
      }
    };
    mockUser = { id: 'user_1' };
  });

  // ── Before Hook: Quote Pricing Calculations ──

  it('should calculate discount amount from discount percent', async () => {
    const doc = {
      Id: 'q_1',
      Name: 'Test Quote',
      Subtotal: 1000,
      DiscountPercent: 0.10,
      TaxPercent: 0.08,
      ShippingHandling: 25
    };

    const ctx = {
      input: { doc },
      ql: mockQl,
      user: mockUser
    };

    await QuotePricingHook.handler(ctx as any);

    expect(doc.DiscountAmount).toBe(100);       // 1000 * 0.10
    expect(doc.TaxAmount).toBe(72);              // (1000 - 100) * 0.08
    expect(doc.TotalPrice).toBe(997);            // 900 + 72 + 25
  });

  it('should calculate discount percent from discount amount', async () => {
    const doc = {
      Id: 'q_2',
      Name: 'Amount Discount Quote',
      Subtotal: 2000,
      DiscountAmount: 400,
      TaxPercent: 0.05,
      ShippingHandling: 0
    };

    const ctx = {
      input: { doc },
      ql: mockQl,
      user: mockUser
    };

    await QuotePricingHook.handler(ctx as any);

    expect(doc.DiscountPercent).toBe(0.2);       // 400 / 2000
    expect(doc.TaxAmount).toBe(80);              // (2000 - 400) * 0.05
    expect(doc.TotalPrice).toBe(1680);           // 1600 + 80 + 0
  });

  it('should recalculate discount amount from percent when both provided', async () => {
    const doc = {
      Id: 'q_3',
      Name: 'Both Discount Quote',
      Subtotal: 500,
      DiscountPercent: 0.20,
      DiscountAmount: 50,                        // will be overridden
      TaxPercent: 0.10,
      ShippingHandling: 10
    };

    const ctx = {
      input: { doc },
      ql: mockQl,
      user: mockUser
    };

    await QuotePricingHook.handler(ctx as any);

    expect(doc.DiscountAmount).toBe(100);        // 500 * 0.20
    expect(doc.TaxAmount).toBe(40);              // (500 - 100) * 0.10
    expect(doc.TotalPrice).toBe(450);            // 400 + 40 + 10
  });

  it('should calculate total with zero discount', async () => {
    const doc = {
      Id: 'q_4',
      Name: 'No Discount Quote',
      Subtotal: 1000,
      TaxPercent: 0.07,
      ShippingHandling: 15
    };

    const ctx = {
      input: { doc },
      ql: mockQl,
      user: mockUser
    };

    await QuotePricingHook.handler(ctx as any);

    expect(doc.TaxAmount).toBe(70);              // 1000 * 0.07
    expect(doc.TotalPrice).toBe(1085);           // 1000 + 70 + 15
  });

  // ── Before Hook: Approval Requirements ──

  it('should set approval level 1 for >5% discount on new quote', async () => {
    const doc = {
      Id: 'q_5',
      Name: 'Low Discount Quote',
      Subtotal: 1000,
      DiscountPercent: 0.08
    };

    const ctx = {
      input: { doc },
      ql: mockQl,
      user: mockUser
    };

    await QuotePricingHook.handler(ctx as any);

    expect(doc).toHaveProperty('ApprovalLevel', 1); // >5% and ≤10% = level 1
  });

  it('should set approval level 5 for >40% discount', async () => {
    const doc = {
      Id: 'q_6',
      Name: 'Huge Discount Quote',
      Subtotal: 10000,
      DiscountPercent: 0.45
    };

    const ctx = {
      input: { doc },
      ql: mockQl,
      user: mockUser
    };

    await QuotePricingHook.handler(ctx as any);

    expect(doc).toHaveProperty('ApprovalLevel', 5);
    expect(doc).toHaveProperty('ApprovalStatus', 'Pending');
  });

  it('should not require approval for ≤5% discount', async () => {
    const doc = {
      Id: 'q_7',
      Name: 'Small Discount Quote',
      Subtotal: 1000,
      DiscountPercent: 0.03
    } as any;

    const ctx = {
      input: { doc },
      ql: mockQl,
      user: mockUser
    };

    await QuotePricingHook.handler(ctx as any);

    expect(doc.ApprovalLevel).toBeUndefined();
    expect(doc.ApprovalStatus).toBeUndefined();
  });

  // ── Before Hook: Margin Protection ──

  it('should warn when discount exceeds 50%', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const doc = {
      Id: 'q_8',
      Name: 'High Risk Quote',
      Subtotal: 5000,
      DiscountPercent: 0.55
    };

    const ctx = {
      input: { doc },
      ql: mockQl,
      user: mockUser
    };

    await QuotePricingHook.handler(ctx as any);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('discount >50%, may impact margins')
    );
    consoleSpy.mockRestore();
  });

  // ── After Insert: Initialize Quote ──

  it('should create activity and set expiration date on new quote', async () => {
    const ctx = {
      result: {
        Id: 'q_9',
        Name: 'New Quote',
        QuoteNumber: 'Q-001',
        QuoteDate: '2025-01-15',
        AccountId: 'acc_1',
        TotalPrice: 5000,
        ValidityPeriodDays: 45
      },
      ql: mockQl,
      user: mockUser
    };

    await QuotePricingHook.handler(ctx as any);

    // Should create activity
    expect(mockQl.doc.create).toHaveBeenCalledWith('activity', expect.objectContaining({
      Subject: 'New Quote Created: New Quote',
      Type: 'quote',
      AccountId: 'acc_1',
      WhatId: 'q_9'
    }));

    // Should set expiration date (45 days from 2025-01-15)
    expect(mockQl.doc.update).toHaveBeenCalledWith('quote', 'q_9', {
      ExpirationDate: '2025-03-01'
    });
  });

  it('should default to 30-day validity when ValidityPeriodDays not set', async () => {
    const ctx = {
      result: {
        Id: 'q_10',
        Name: 'Default Expiry Quote',
        QuoteNumber: 'Q-002',
        QuoteDate: '2025-01-01',
        AccountId: 'acc_2',
        TotalPrice: 3000
      },
      ql: mockQl,
      user: mockUser
    };

    await QuotePricingHook.handler(ctx as any);

    // 30 days from 2025-01-01 = 2025-01-31
    expect(mockQl.doc.update).toHaveBeenCalledWith('quote', 'q_10', {
      ExpirationDate: '2025-01-31'
    });
  });

  // ── After Update: Quote Status Changes ──

  it('should create contract when quote is accepted', async () => {
    const ctx = {
      result: {
        Id: 'q_11',
        Name: 'Accepted Quote',
        QuoteNumber: 'Q-003',
        Status: 'Accepted',
        AccountId: 'acc_3',
        OpportunityId: 'opp_1',
        TotalPrice: 25000,
        Description: 'Original desc'
      },
      previous: {
        Id: 'q_11',
        Name: 'Accepted Quote',
        QuoteNumber: 'Q-003',
        Status: 'Draft',
        AccountId: 'acc_3',
        OpportunityId: 'opp_1',
        TotalPrice: 25000
      },
      ql: mockQl,
      user: mockUser
    };

    await QuotePricingHook.handler(ctx as any);

    // Should update accepted date
    expect(mockQl.doc.update).toHaveBeenCalledWith('quote', 'q_11', {
      AcceptedDate: expect.any(String)
    });

    // Should update opportunity stage to closed_won
    expect(mockQl.doc.update).toHaveBeenCalledWith('opportunity', 'opp_1', {
      Stage: 'closed_won',
      CloseDate: expect.any(String)
    });

    // Should create contract
    expect(mockQl.insert).toHaveBeenCalledWith('contract', expect.objectContaining({
      contract_number: 'CT-Q-003',
      account: 'acc_3',
      opportunity: 'opp_1',
      status: 'Draft',
      contract_value: 25000
    }));

    // Should log status change activity
    expect(mockQl.doc.create).toHaveBeenCalledWith('activity', expect.objectContaining({
      Subject: 'Quote Status Changed: Draft → Accepted',
      Type: 'Quote Status Change',
      AccountId: 'acc_3'
    }));
  });

  it('should not create activity when quote has no AccountId on status change', async () => {
    const ctx = {
      result: {
        Id: 'q_12',
        Name: 'No Account Quote',
        QuoteNumber: 'Q-004',
        Status: 'Sent'
      },
      previous: {
        Id: 'q_12',
        Name: 'No Account Quote',
        QuoteNumber: 'Q-004',
        Status: 'Draft'
      },
      ql: mockQl,
      user: mockUser
    };

    await QuotePricingHook.handler(ctx as any);

    // handleQuoteSent runs but only logs
    // No activity should be created since no AccountId
    expect(mockQl.doc.create).not.toHaveBeenCalledWith('activity', expect.objectContaining({
      Type: 'Quote Status Change'
    }));
  });

  // ── After Update: Approval Status Changes ──

  it('should update quote with approval info when approved', async () => {
    const ctx = {
      result: {
        Id: 'q_13',
        Name: 'Approved Quote',
        QuoteNumber: 'Q-005',
        Status: 'In Review',
        ApprovalStatus: 'Approved',
        AccountId: 'acc_4'
      },
      previous: {
        Id: 'q_13',
        Name: 'Approved Quote',
        QuoteNumber: 'Q-005',
        Status: 'In Review',
        ApprovalStatus: 'Pending',
        AccountId: 'acc_4'
      },
      ql: mockQl,
      user: mockUser
    };

    await QuotePricingHook.handler(ctx as any);

    expect(mockQl.doc.update).toHaveBeenCalledWith('quote', 'q_13', {
      ApprovedDate: expect.any(String),
      ApprovedById: 'user_1',
      Status: 'Approved'
    });
  });

  it('should update quote with rejection info when rejected', async () => {
    const ctx = {
      result: {
        Id: 'q_14',
        Name: 'Rejected Quote',
        QuoteNumber: 'Q-006',
        Status: 'In Review',
        ApprovalStatus: 'Rejected',
        AccountId: 'acc_5'
      },
      previous: {
        Id: 'q_14',
        Name: 'Rejected Quote',
        QuoteNumber: 'Q-006',
        Status: 'In Review',
        ApprovalStatus: 'Pending',
        AccountId: 'acc_5'
      },
      ql: mockQl,
      user: mockUser
    };

    await QuotePricingHook.handler(ctx as any);

    expect(mockQl.doc.update).toHaveBeenCalledWith('quote', 'q_14', {
      RejectedDate: expect.any(String),
      RejectedById: 'user_1',
      Status: 'Rejected'
    });
  });

  it('should not run after-update handlers when nothing changed', async () => {
    const ctx = {
      result: {
        Id: 'q_15',
        Name: 'Unchanged Quote',
        Status: 'Draft',
        ApprovalStatus: 'None',
        AccountId: 'acc_6'
      },
      previous: {
        Id: 'q_15',
        Name: 'Unchanged Quote',
        Status: 'Draft',
        ApprovalStatus: 'None',
        AccountId: 'acc_6'
      },
      ql: mockQl,
      user: mockUser
    };

    await QuotePricingHook.handler(ctx as any);

    expect(mockQl.doc.update).not.toHaveBeenCalled();
    expect(mockQl.doc.create).not.toHaveBeenCalled();
    expect(mockQl.insert).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully and rethrow', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Force an error by making ctx.input.doc getter throw
    const ctx = {
      input: {
        get doc() {
          throw new Error('Unexpected error');
        }
      },
      ql: mockQl,
      user: mockUser
    };

    await expect(QuotePricingHook.handler(ctx as any)).rejects.toThrow('Unexpected error');

    expect(consoleSpy).toHaveBeenCalledWith(
      '❌ Error in QuotePricingHook:',
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });
});
