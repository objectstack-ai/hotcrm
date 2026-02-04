import { optimizePricing, OptimizePricingRequest } from '../../../src/actions/pricing_optimizer.action';

jest.mock('../../../src/db', () => ({
  db: {
    doc: { get: jest.fn() },
    find: jest.fn()
  }
}));

import { db } from '../../../src/db';

describe('Pricing Optimizer - optimizePricing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should optimize pricing for a product', async () => {
    const mockProduct = { name: 'Enterprise Suite', product_code: 'ENT-001', family: 'Software', is_active: true };
    const mockPriceBookEntries = [{ list_price: 100000, price_book_id: 'pb_1' }];

    (db.doc.get as jest.Mock).mockResolvedValue(mockProduct);
    (db.find as jest.Mock).mockResolvedValueOnce(mockPriceBookEntries).mockResolvedValueOnce([]);

    const result = await optimizePricing({ productId: 'prod_123' });

    expect(result).toBeDefined();
    expect(result.currentPricing).toBeDefined();
    expect(result.optimizedPricing).toBeDefined();
    expect(result.optimizedPricing.recommendedPrice).toBeGreaterThan(0);
  });

  it('should analyze pricing factors', async () => {
    const mockProduct = { name: 'Product X' };
    const mockPriceEntries = [{ list_price: 50000 }];
    const mockDeals = [
      { amount: 48000, stage: 'closed_won', close_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
      { amount: 45000, stage: 'closed_won', close_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() }
    ];

    (db.doc.get as jest.Mock).mockResolvedValue(mockProduct);
    (db.find as jest.Mock)
      .mockResolvedValueOnce(mockPriceEntries)
      .mockResolvedValueOnce(mockDeals);

    const result = await optimizePricing({ productId: 'prod_factors' });

    expect(result.factors).toBeDefined();
    expect(Array.isArray(result.factors)).toBe(true);
  });

  it('should provide sensitivity analysis', async () => {
    const mockProduct = { name: 'Product Y' };

    (db.doc.get as jest.Mock).mockResolvedValue(mockProduct);
    (db.find as jest.Mock).mockResolvedValue([{ list_price: 75000 }]);

    const result = await optimizePricing({ productId: 'prod_sens' });

    expect(result.sensitivity).toBeDefined();
    expect(result.sensitivity.pricePoints).toBeDefined();
    expect(Array.isArray(result.sensitivity.pricePoints)).toBe(true);
  });

  it('should include rationale', async () => {
    (db.doc.get as jest.Mock).mockResolvedValue({ name: 'Product Z' });
    (db.find as jest.Mock).mockResolvedValue([{ list_price: 25000 }]);

    const result = await optimizePricing({ productId: 'prod_rationale' });

    expect(result.rationale).toBeDefined();
    expect(typeof result.rationale).toBe('string');
  });
});
