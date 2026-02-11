import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductBundleValidationTrigger, ProductBundleComponentCompletenessTrigger } from '../../../src/hooks/product_bundle.hook';

describe('ProductBundleValidationTrigger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should have correct hook metadata', () => {
    expect(ProductBundleValidationTrigger.name).toBe('ProductBundleValidationTrigger');
    expect(ProductBundleValidationTrigger.object).toBe('product_bundle');
    expect(ProductBundleValidationTrigger.events).toEqual(['beforeInsert', 'beforeUpdate']);
  });

  it('should validate a valid bundle successfully', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const ctx = {
      input: { doc: { name: 'Premium Bundle', status: 'active' } },
      ql: { find: vi.fn() }
    };

    await ProductBundleValidationTrigger.handler(ctx as any);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Product bundle validated: Premium Bundle'));
  });

  it('should throw error when bundle name is missing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const ctx = {
      input: { doc: { name: '', status: 'active' } },
      ql: { find: vi.fn() }
    };

    await expect(ProductBundleValidationTrigger.handler(ctx as any)).rejects.toThrow('Bundle name is required');
  });

  it('should throw error for invalid bundle status', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const ctx = {
      input: { doc: { name: 'Test Bundle', status: 'invalid_status' } },
      ql: { find: vi.fn() }
    };

    await expect(ProductBundleValidationTrigger.handler(ctx as any)).rejects.toThrow(
      'Invalid bundle status "invalid_status". Must be one of: draft, active, inactive, archived'
    );
  });

  it('should throw error when customizable bundle missing min/max components', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const ctx = {
      input: { doc: { name: 'Custom Bundle', bundle_type: 'customizable' } },
      ql: { find: vi.fn() }
    };

    await expect(ProductBundleValidationTrigger.handler(ctx as any)).rejects.toThrow(
      'Customizable bundles require min_components and max_components to be set'
    );
  });

  it('should pass validation for customizable bundle with min/max components', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const ctx = {
      input: {
        doc: {
          name: 'Custom Bundle',
          bundle_type: 'customizable',
          min_components: 1,
          max_components: 5
        }
      },
      ql: { find: vi.fn() }
    };

    await ProductBundleValidationTrigger.handler(ctx as any);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Product bundle validated: Custom Bundle'));
  });
});

describe('ProductBundleComponentCompletenessTrigger', () => {
  let mockQl: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockQl = {
      find: vi.fn(),
      doc: { get: vi.fn(), create: vi.fn(), update: vi.fn() }
    };
  });

  it('should have correct hook metadata', () => {
    expect(ProductBundleComponentCompletenessTrigger.name).toBe('ProductBundleComponentCompletenessTrigger');
    expect(ProductBundleComponentCompletenessTrigger.object).toBe('product_bundle');
    expect(ProductBundleComponentCompletenessTrigger.events).toEqual(['afterUpdate']);
  });

  it('should return early when previous is not provided', async () => {
    const ctx = {
      result: { _id: 'b1', name: 'Bundle', status: 'active' },
      previous: undefined,
      ql: mockQl
    };

    await ProductBundleComponentCompletenessTrigger.handler(ctx as any);

    expect(mockQl.find).not.toHaveBeenCalled();
  });

  it('should return early when status has not changed', async () => {
    const ctx = {
      result: { _id: 'b1', name: 'Bundle', status: 'active' },
      previous: { _id: 'b1', name: 'Bundle', status: 'active' },
      ql: mockQl
    };

    await ProductBundleComponentCompletenessTrigger.handler(ctx as any);

    expect(mockQl.find).not.toHaveBeenCalled();
  });

  it('should return early when new status is not active', async () => {
    const ctx = {
      result: { _id: 'b1', name: 'Bundle', status: 'inactive' },
      previous: { _id: 'b1', name: 'Bundle', status: 'active' },
      ql: mockQl
    };

    await ProductBundleComponentCompletenessTrigger.handler(ctx as any);

    expect(mockQl.find).not.toHaveBeenCalled();
  });

  it('should warn when bundle is activated with no components', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    mockQl.find.mockResolvedValueOnce([]);

    const ctx = {
      result: { _id: 'b1', name: 'Empty Bundle', status: 'active' },
      previous: { _id: 'b1', name: 'Empty Bundle', status: 'draft' },
      ql: mockQl
    };

    await ProductBundleComponentCompletenessTrigger.handler(ctx as any);

    expect(mockQl.find).toHaveBeenCalledWith('product_bundle_component', {
      filters: [['product_bundle', '=', 'b1']]
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Bundle "Empty Bundle" activated with no components')
    );
  });

  it('should log success when bundle is activated with components', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    mockQl.find.mockResolvedValueOnce([{ _id: 'comp1' }, { _id: 'comp2' }]);

    const ctx = {
      result: { _id: 'b1', name: 'Full Bundle', status: 'active' },
      previous: { _id: 'b1', name: 'Full Bundle', status: 'draft' },
      ql: mockQl
    };

    await ProductBundleComponentCompletenessTrigger.handler(ctx as any);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Bundle "Full Bundle" activated with 2 component(s)')
    );
  });

  it('should handle errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockQl.find.mockRejectedValueOnce(new Error('DB error'));

    const ctx = {
      result: { _id: 'b1', name: 'Error Bundle', status: 'active' },
      previous: { _id: 'b1', name: 'Error Bundle', status: 'draft' },
      ql: mockQl
    };

    await ProductBundleComponentCompletenessTrigger.handler(ctx as any);

    expect(consoleSpy).toHaveBeenCalledWith(
      '❌ ProductBundleComponentCompletenessTrigger Error:',
      expect.any(Error)
    );
  });
});
