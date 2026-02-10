import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProductHook from '../../../src/hooks/product.hook';

describe('ProductHook', () => {
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

  // ── Before Hook: Product Validation ──

  it('should validate product with unique product code (no duplicates)', async () => {
    mockQl.find.mockResolvedValueOnce([]);

    const ctx = {
      input: {
        doc: {
          Id: 'prod_1',
          Name: 'Widget A',
          ProductCode: 'WGT-001',
          ListPrice: 100,
          CostPrice: 50
        }
      },
      ql: mockQl,
      user: mockUser
    };

    await ProductHook.handler(ctx as any);

    expect(mockQl.find).toHaveBeenCalledWith('Product', {
      filters: [
        ['ProductCode', '=', 'WGT-001'],
        ['Id', '!=', 'prod_1']
      ]
    });
  });

  it('should throw error when product code already exists', async () => {
    mockQl.find.mockResolvedValueOnce([{ Id: 'prod_existing' }]);

    const ctx = {
      input: {
        doc: {
          Id: 'prod_2',
          Name: 'Widget B',
          ProductCode: 'WGT-001',
          ListPrice: 100,
          CostPrice: 50
        }
      },
      ql: mockQl,
      user: mockUser
    };

    await expect(ProductHook.handler(ctx as any)).rejects.toThrow(
      'Product code WGT-001 already exists'
    );
  });

  it('should warn when cost price exceeds list price', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockQl.find.mockResolvedValueOnce([]);

    const ctx = {
      input: {
        doc: {
          Id: 'prod_3',
          Name: 'Overpriced Widget',
          ProductCode: 'OVR-001',
          ListPrice: 50,
          CostPrice: 100
        }
      },
      ql: mockQl,
      user: mockUser
    };

    await ProductHook.handler(ctx as any);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Cost price (100) exceeds list price (50)')
    );
    consoleSpy.mockRestore();
  });

  it('should validate bundle configuration for bundle products', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockQl.find.mockResolvedValueOnce([]);

    const ctx = {
      input: {
        doc: {
          Id: 'prod_4',
          Name: 'Bundle Product',
          ProductCode: 'BND-001',
          IsBundle: true,
          ListPrice: 200
        }
      },
      ql: mockQl,
      user: mockUser
    };

    await ProductHook.handler(ctx as any);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Validating bundle configuration for: Bundle Product')
    );
    consoleSpy.mockRestore();
  });

  it('should log dependency info for products with required products', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockQl.find.mockResolvedValueOnce([]);

    const ctx = {
      input: {
        doc: {
          Id: 'prod_5',
          Name: 'Dependent Widget',
          ProductCode: 'DEP-001',
          RequiredProducts: 'prod_base',
          ListPrice: 100
        }
      },
      ql: mockQl,
      user: mockUser
    };

    await ProductHook.handler(ctx as any);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Product has dependencies: prod_base')
    );
    consoleSpy.mockRestore();
  });

  // ── After Hook: Stock Level Changes ──

  it('should update status to Out of Stock when stock reaches zero', async () => {
    const ctx = {
      result: {
        Id: 'prod_6',
        Name: 'Empty Widget',
        StockLevel: 0,
        LowStockThreshold: 10,
        Status: 'Active',
        ListPrice: 100,
        CostPrice: 50
      },
      previous: {
        Id: 'prod_6',
        Name: 'Empty Widget',
        StockLevel: 5,
        LowStockThreshold: 10,
        Status: 'Active',
        ListPrice: 100,
        CostPrice: 50
      },
      ql: mockQl,
      user: mockUser
    };

    await ProductHook.handler(ctx as any);

    expect(mockQl.doc.update).toHaveBeenCalledWith('Product', 'prod_6', {
      Status: 'Out of Stock'
    });
  });

  it('should warn on low stock when level drops below threshold', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const ctx = {
      result: {
        Id: 'prod_7',
        Name: 'Low Stock Widget',
        StockLevel: 3,
        LowStockThreshold: 10,
        Status: 'Active',
        ListPrice: 100,
        CostPrice: 50
      },
      previous: {
        Id: 'prod_7',
        Name: 'Low Stock Widget',
        StockLevel: 15,
        LowStockThreshold: 10,
        Status: 'Active',
        ListPrice: 100,
        CostPrice: 50
      },
      ql: mockQl,
      user: mockUser
    };

    await ProductHook.handler(ctx as any);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Low stock alert: Low Stock Widget (3 units)')
    );
    consoleSpy.mockRestore();
  });

  it('should reactivate product when stock is replenished from zero', async () => {
    const ctx = {
      result: {
        Id: 'prod_8',
        Name: 'Restocked Widget',
        StockLevel: 50,
        Status: 'Out of Stock',
        ListPrice: 100,
        CostPrice: 50
      },
      previous: {
        Id: 'prod_8',
        Name: 'Restocked Widget',
        StockLevel: 0,
        Status: 'Out of Stock',
        ListPrice: 100,
        CostPrice: 50
      },
      ql: mockQl,
      user: mockUser
    };

    await ProductHook.handler(ctx as any);

    expect(mockQl.doc.update).toHaveBeenCalledWith('Product', 'prod_8', {
      Status: 'Active'
    });
  });

  // ── After Hook: Price Changes ──

  it('should log activity when list price changes', async () => {
    const ctx = {
      result: {
        Id: 'prod_9',
        Name: 'Price Change Widget',
        ListPrice: 150,
        CostPrice: 50,
        StockLevel: 100,
        Status: 'Active'
      },
      previous: {
        Id: 'prod_9',
        Name: 'Price Change Widget',
        ListPrice: 100,
        CostPrice: 50,
        StockLevel: 100,
        Status: 'Active'
      },
      ql: mockQl,
      user: mockUser
    };

    await ProductHook.handler(ctx as any);

    expect(mockQl.doc.create).toHaveBeenCalledWith('Activity', expect.objectContaining({
      Subject: 'Price Change: Price Change Widget',
      Type: 'Price Update',
      Status: 'Completed',
      WhatId: 'prod_9',
      OwnerId: 'user_1'
    }));
  });

  // ── After Hook: Status Changes ──

  it('should log activity when product status changes', async () => {
    const ctx = {
      result: {
        Id: 'prod_10',
        Name: 'Deactivated Widget',
        Status: 'Inactive',
        ListPrice: 100,
        CostPrice: 50,
        StockLevel: 100
      },
      previous: {
        Id: 'prod_10',
        Name: 'Deactivated Widget',
        Status: 'Active',
        ListPrice: 100,
        CostPrice: 50,
        StockLevel: 100
      },
      ql: mockQl,
      user: mockUser
    };

    await ProductHook.handler(ctx as any);

    expect(mockQl.doc.create).toHaveBeenCalledWith('Activity', expect.objectContaining({
      Subject: 'Product Status Changed: Active → Inactive',
      Type: 'Status Change',
      WhatId: 'prod_10'
    }));
  });

  it('should log reactivation when product changes from Inactive to Active', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const ctx = {
      result: {
        Id: 'prod_11',
        Name: 'Reactivated Widget',
        Status: 'Active',
        ListPrice: 100,
        CostPrice: 50,
        StockLevel: 100
      },
      previous: {
        Id: 'prod_11',
        Name: 'Reactivated Widget',
        Status: 'Inactive',
        ListPrice: 100,
        CostPrice: 50,
        StockLevel: 100
      },
      ql: mockQl,
      user: mockUser
    };

    await ProductHook.handler(ctx as any);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Product reactivated: Reactivated Widget')
    );
    consoleSpy.mockRestore();
  });

  it('should not run stock/price/status handlers when nothing changed', async () => {
    const ctx = {
      result: {
        Id: 'prod_12',
        Name: 'Unchanged Widget',
        Status: 'Active',
        ListPrice: 100,
        CostPrice: 50,
        StockLevel: 100
      },
      previous: {
        Id: 'prod_12',
        Name: 'Unchanged Widget',
        Status: 'Active',
        ListPrice: 100,
        CostPrice: 50,
        StockLevel: 100
      },
      ql: mockQl,
      user: mockUser
    };

    await ProductHook.handler(ctx as any);

    expect(mockQl.doc.update).not.toHaveBeenCalled();
    expect(mockQl.doc.create).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully and rethrow', async () => {
    mockQl.find.mockRejectedValueOnce(new Error('DB failure'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const ctx = {
      input: {
        doc: {
          Id: 'prod_err',
          Name: 'Error Widget',
          ProductCode: 'ERR-001',
          ListPrice: 100
        }
      },
      ql: mockQl,
      user: mockUser
    };

    await expect(ProductHook.handler(ctx as any)).rejects.toThrow('DB failure');

    expect(consoleSpy).toHaveBeenCalledWith(
      '[product.hook] handler execution failed:',
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });
});
