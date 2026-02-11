import { recommendProducts, RecommendProductsRequest } from '../../../src/actions/product_recommendation.action';

import { vi, Mock } from 'vitest';

vi.mock('../../../src/db', () => ({
  broker: {
    findOne: vi.fn(),
    find: vi.fn()
  }
}));

import { broker } from '../../../src/db';

describe('Product Recommendation - recommendProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should recommend products for an account', async () => {
    const mockAccount = { name: 'Tech Corp', industry: 'technology', number_of_employees: 500, annual_revenue: 5000000, type: 'customer' };
    const mockProducts = [
      { product_id: 'prod_1', name: 'Enterprise CRM', product_code: 'ECRM-001', family: 'software', is_active: true },
      { product_id: 'prod_2', name: 'Analytics Platform', product_code: 'ANLY-001', family: 'software', is_active: true }
    ];

    (broker.findOne as Mock).mockResolvedValue(mockAccount);
    (broker.find as Mock)
      .mockResolvedValueOnce([]) // existing opps
      .mockResolvedValueOnce(mockProducts) // all products
      .mockResolvedValueOnce([]); // similar accounts

    const result = await recommendProducts({ accountId: 'acc_123' });

    expect(result).toBeDefined();
    expect(result.recommendations).toBeDefined();
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('should include relevance scores', async () => {
    const mockAccount = { industry: 'finance', number_of_employees: 100, annual_revenue: 1000000 };
    const mockProducts = [{ product_id: 'p1', name: 'Product 1', product_code: 'P1', family: 'software', is_active: true }];

    (broker.findOne as Mock).mockResolvedValue(mockAccount);
    (broker.find as Mock).mockResolvedValue(mockProducts);

    const result = await recommendProducts({ accountId: 'acc_456', maxRecommendations: 5 });

    result.recommendations.forEach(rec => {
      expect(rec.relevanceScore).toBeGreaterThanOrEqual(0);
      expect(rec.relevanceScore).toBeLessThanOrEqual(100);
      expect(rec.confidence).toBeGreaterThanOrEqual(0);
      expect(rec.priority).toBeDefined();
    });
  });

  it('should provide customer context', async () => {
    const mockAccount = { industry: 'healthcare', number_of_employees: 1000, annual_revenue: 10000000 };

    (broker.findOne as Mock).mockResolvedValue(mockAccount);
    (broker.find as Mock).mockResolvedValue([]);

    const result = await recommendProducts({ accountId: 'acc_context' });

    expect(result.customerContext).toBeDefined();
    expect(result.customerContext.industry).toBeDefined();
    expect(result.customerContext.size).toBeDefined();
  });

  it('should respect maxRecommendations limit', async () => {
    const mockProducts = Array(20).fill(0).map((_, i) => ({
      product_id: `prod_${i}`,
      name: `Product ${i}`,
      product_code: `P${i}`,
      family: 'software',
      is_active: true
    }));

    (broker.findOne as Mock).mockResolvedValue({ industry: 'technology' });
    (broker.find as Mock).mockResolvedValue(mockProducts);

    const result = await recommendProducts({ accountId: 'acc_limit', maxRecommendations: 3 });

    expect(result.recommendations.length).toBeLessThanOrEqual(3);
  });

  it('should include strategy information', async () => {
    (broker.findOne as Mock).mockResolvedValue({ industry: 'Retail' });
    (broker.find as Mock).mockResolvedValue([]);

    const result = await recommendProducts({ accountId: 'acc_strategy' });

    expect(result.strategy).toBeDefined();
    expect(result.strategy.approach).toBeDefined();
    expect(result.strategy.confidence).toBeGreaterThanOrEqual(0);
  });
});
