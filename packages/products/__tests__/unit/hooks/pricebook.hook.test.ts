import { describe, it, expect, vi, beforeEach } from 'vitest';
import PricebookHook from '../../../src/hooks/pricebook.hook';

describe('PricebookHook', () => {
  let mockQl: any;
  let mockUser: any;

  beforeEach(() => {
    vi.resetAllMocks();
    mockQl = {
      find: vi.fn().mockResolvedValue([]),
      doc: {
        update: vi.fn().mockResolvedValue({}),
        create: vi.fn().mockResolvedValue({ _id: 'activity_1' }),
        get: vi.fn()
      }
    };
    mockUser = { id: 'user_1' };
  });

  // ── Before Hook: Date Validation ──

  it('should throw error when expiration date is before effective date', async () => {
    const ctx = {
      input: {
        doc: {
          Id: 'pb_1',
          Name: 'Test Pricebook',
          EffectiveDate: '2025-06-01',
          ExpirationDate: '2025-05-01'
        }
      },
      ql: mockQl,
      user: mockUser
    };

    await expect(PricebookHook.handler(ctx as any)).rejects.toThrow(
      'Expiration date must be after effective date'
    );
  });

  it('should throw error when expiration date equals effective date', async () => {
    const ctx = {
      input: {
        doc: {
          Id: 'pb_2',
          Name: 'Same Date Pricebook',
          EffectiveDate: '2025-06-01',
          ExpirationDate: '2025-06-01'
        }
      },
      ql: mockQl,
      user: mockUser
    };

    await expect(PricebookHook.handler(ctx as any)).rejects.toThrow(
      'Expiration date must be after effective date'
    );
  });

  it('should pass validation when expiration date is after effective date', async () => {
    const ctx = {
      input: {
        doc: {
          Id: 'pb_3',
          Name: 'Valid Pricebook',
          EffectiveDate: '2025-06-01',
          ExpirationDate: '2025-12-31'
        }
      },
      ql: mockQl,
      user: mockUser
    };

    await expect(PricebookHook.handler(ctx as any)).resolves.not.toThrow();
  });

  it('should warn when multiple active standard pricebooks overlap', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockQl.find.mockResolvedValueOnce([{ Id: 'pb_other', IsStandard: true }]);

    const ctx = {
      input: {
        doc: {
          Id: 'pb_4',
          Name: 'Standard PB',
          IsStandard: true,
          EffectiveDate: '2025-06-01',
          ExpirationDate: '2025-12-31'
        }
      },
      ql: mockQl,
      user: mockUser
    };

    await PricebookHook.handler(ctx as any);

    expect(mockQl.find).toHaveBeenCalledWith('pricebook', {
      filters: [
        ['IsStandard', '=', true],
        ['Status', '=', 'Active'],
        ['Id', '!=', 'pb_4']
      ]
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Multiple active standard pricebooks detected')
    );
    consoleSpy.mockRestore();
  });

  // ── Before Hook: Currency Validation ──

  it('should throw error when exchange rate is zero or negative', async () => {
    const ctx = {
      input: {
        doc: {
          Id: 'pb_5',
          Name: 'Bad Rate PB',
          ExchangeRate: -1,
          CurrencyCode: 'EUR'
        }
      },
      ql: mockQl,
      user: mockUser
    };

    await expect(PricebookHook.handler(ctx as any)).rejects.toThrow(
      'Exchange rate must be positive'
    );
  });

  it('should warn when USD exchange rate is not 1.0', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const ctx = {
      input: {
        doc: {
          Id: 'pb_6',
          Name: 'USD PB',
          CurrencyCode: 'USD',
          ExchangeRate: 1.5
        }
      },
      ql: mockQl,
      user: mockUser
    };

    await PricebookHook.handler(ctx as any);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('USD exchange rate should typically be 1.0')
    );
    consoleSpy.mockRestore();
  });

  it('should warn about unusual currency code', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const ctx = {
      input: {
        doc: {
          Id: 'pb_7',
          Name: 'Exotic PB',
          CurrencyCode: 'XYZ',
          ExchangeRate: 5.0
        }
      },
      ql: mockQl,
      user: mockUser
    };

    await PricebookHook.handler(ctx as any);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unusual currency code: XYZ')
    );
    consoleSpy.mockRestore();
  });

  // ── After Hook: Effective Date Changes ──

  it('should activate pricebook when effective date is today or past and status is Draft', async () => {
    const pastDate = '2020-01-01';
    const futureDate = '2030-12-31';

    const ctx = {
      result: {
        Id: 'pb_8',
        Name: 'Ready PB',
        EffectiveDate: pastDate,
        ExpirationDate: futureDate,
        Status: 'Draft'
      },
      previous: {
        Id: 'pb_8',
        Name: 'Ready PB',
        EffectiveDate: '2030-01-01',
        ExpirationDate: futureDate,
        Status: 'Draft'
      },
      old: {
        EffectiveDate: '2030-01-01',
        ExpirationDate: futureDate
      },
      ql: mockQl,
      user: mockUser
    };

    await PricebookHook.handler(ctx as any);

    expect(mockQl.doc.update).toHaveBeenCalledWith('pricebook', 'pb_8', {
      Status: 'Active'
    });
  });

  it('should expire pricebook when expiration date is in the past and status is Active', async () => {
    const pastDate = '2020-01-01';

    const ctx = {
      result: {
        Id: 'pb_9',
        Name: 'Expired PB',
        EffectiveDate: '2019-01-01',
        ExpirationDate: pastDate,
        Status: 'Active'
      },
      previous: {
        Id: 'pb_9',
        Name: 'Expired PB',
        EffectiveDate: '2019-01-01',
        ExpirationDate: '2030-12-31',
        Status: 'Active'
      },
      old: {
        EffectiveDate: '2019-01-01',
        ExpirationDate: '2030-12-31'
      },
      ql: mockQl,
      user: mockUser
    };

    await PricebookHook.handler(ctx as any);

    expect(mockQl.doc.update).toHaveBeenCalledWith('pricebook', 'pb_9', {
      Status: 'Expired'
    });
  });

  // ── After Hook: Status Changes ──

  it('should set effective date when pricebook is activated without one', async () => {
    const ctx = {
      result: {
        Id: 'pb_10',
        Name: 'Activated PB',
        Status: 'Active',
        IsStandard: false
      },
      previous: {
        Id: 'pb_10',
        Name: 'Activated PB',
        Status: 'Draft',
        IsStandard: false
      },
      old: {},
      ql: mockQl,
      user: mockUser
    };

    await PricebookHook.handler(ctx as any);

    expect(mockQl.doc.update).toHaveBeenCalledWith('pricebook', 'pb_10', {
      EffectiveDate: expect.any(String)
    });
  });

  it('should deactivate other standard pricebooks when a standard pricebook is activated', async () => {
    mockQl.find.mockResolvedValueOnce([
      { Id: 'pb_old_std1' },
      { Id: 'pb_old_std2' }
    ]);

    const ctx = {
      result: {
        Id: 'pb_11',
        Name: 'New Standard PB',
        Status: 'Active',
        IsStandard: true,
        EffectiveDate: '2025-01-01'
      },
      previous: {
        Id: 'pb_11',
        Name: 'New Standard PB',
        Status: 'Draft',
        IsStandard: true
      },
      old: {},
      ql: mockQl,
      user: mockUser
    };

    await PricebookHook.handler(ctx as any);

    expect(mockQl.find).toHaveBeenCalledWith('pricebook', {
      filters: [
        ['IsStandard', '=', true],
        ['Status', '=', 'Active'],
        ['Id', '!=', 'pb_11']
      ]
    });
    expect(mockQl.doc.update).toHaveBeenCalledWith('pricebook', 'pb_old_std1', expect.objectContaining({
      Status: 'Inactive'
    }));
    expect(mockQl.doc.update).toHaveBeenCalledWith('pricebook', 'pb_old_std2', expect.objectContaining({
      Status: 'Inactive'
    }));
  });

  it('should set expiration date when pricebook is expired without one', async () => {
    const ctx = {
      result: {
        Id: 'pb_12',
        Name: 'Expired PB',
        Status: 'Expired',
        IsStandard: false
      },
      previous: {
        Id: 'pb_12',
        Name: 'Expired PB',
        Status: 'Active',
        IsStandard: false
      },
      old: {},
      ql: mockQl,
      user: mockUser
    };

    await PricebookHook.handler(ctx as any);

    expect(mockQl.doc.update).toHaveBeenCalledWith('pricebook', 'pb_12', {
      ExpirationDate: expect.any(String)
    });
  });

  it('should log status change activity', async () => {
    const ctx = {
      result: {
        Id: 'pb_13',
        Name: 'Status PB',
        Status: 'Active',
        IsStandard: false,
        EffectiveDate: '2025-01-01'
      },
      previous: {
        Id: 'pb_13',
        Name: 'Status PB',
        Status: 'Draft',
        IsStandard: false
      },
      old: {},
      ql: mockQl,
      user: mockUser
    };

    await PricebookHook.handler(ctx as any);

    expect(mockQl.doc.create).toHaveBeenCalledWith('Activity', expect.objectContaining({
      Subject: 'Pricebook Status Changed: Draft → Active',
      Type: 'Status Change',
      WhatId: 'pb_13'
    }));
  });

  // ── After Hook: Currency/Exchange Rate Changes ──

  it('should log activity when currency code changes', async () => {
    const ctx = {
      result: {
        Id: 'pb_14',
        Name: 'Currency PB',
        CurrencyCode: 'EUR',
        ExchangeRate: 0.85,
        Status: 'Active'
      },
      previous: {
        Id: 'pb_14',
        Name: 'Currency PB',
        CurrencyCode: 'USD',
        ExchangeRate: 1.0,
        Status: 'Active'
      },
      old: {},
      ql: mockQl,
      user: mockUser
    };

    await PricebookHook.handler(ctx as any);

    expect(mockQl.doc.create).toHaveBeenCalledWith('Activity', expect.objectContaining({
      Subject: 'Pricebook Currency Updated: Currency PB',
      Type: 'Currency Update',
      Priority: 'high'
    }));
  });

  it('should not run after-update handlers when nothing changed', async () => {
    const ctx = {
      result: {
        Id: 'pb_15',
        Name: 'Unchanged PB',
        Status: 'Active',
        CurrencyCode: 'USD',
        ExchangeRate: 1.0,
        EffectiveDate: '2025-01-01',
        ExpirationDate: '2025-12-31'
      },
      previous: {
        Id: 'pb_15',
        Name: 'Unchanged PB',
        Status: 'Active',
        CurrencyCode: 'USD',
        ExchangeRate: 1.0,
        EffectiveDate: '2025-01-01',
        ExpirationDate: '2025-12-31'
      },
      old: {},
      ql: mockQl,
      user: mockUser
    };

    await PricebookHook.handler(ctx as any);

    expect(mockQl.doc.update).not.toHaveBeenCalled();
    expect(mockQl.doc.create).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully and rethrow', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const ctx = {
      input: {
        doc: {
          Id: 'pb_err',
          Name: 'Error PB',
          EffectiveDate: '2025-12-01',
          ExpirationDate: '2025-01-01'
        }
      },
      ql: mockQl,
      user: mockUser
    };

    await expect(PricebookHook.handler(ctx as any)).rejects.toThrow(
      'Expiration date must be after effective date'
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      '[pricebook.hook] handler execution failed:',
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });
});
