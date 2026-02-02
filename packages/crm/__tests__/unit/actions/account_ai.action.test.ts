import {
  calculateAccountHealth,
  predictChurn,
  generateRecommendations,
  AccountHealthRequest,
  ChurnPredictionRequest,
  RecommendationRequest
} from '../../../src/actions/account_ai.action';

// Mock the db module
jest.mock('../../../src/db', () => ({
  db: {
    doc: {
      get: jest.fn()
    },
    find: jest.fn()
  }
}));

import { db } from '../../../src/db';

describe('Account AI Actions - calculateAccountHealth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate health score for a healthy account', async () => {
    // Arrange
    const mockAccount = {
      name: 'Tech Corp',
      annual_revenue: 5000000,
      number_of_employees: 500,
      industry: 'Technology',
      type: 'Customer'
    };

    const mockOpportunities = [
      { amount: 100000, stage: 'Closed Won', close_date: '2024-01-15' }
    ];

    const mockCases: any[] = [];

    const mockActivities = [
      { activity_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
      { activity_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
      { activity_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() }
    ];

    (db.doc.get as jest.Mock).mockResolvedValue(mockAccount);
    (db.find as jest.Mock)
      .mockResolvedValueOnce(mockOpportunities)
      .mockResolvedValueOnce(mockCases)
      .mockResolvedValueOnce(mockActivities);

    const request: AccountHealthRequest = { accountId: 'acc_123' };

    // Act
    const result = await calculateAccountHealth(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.healthScore).toBeGreaterThan(0);
    expect(result.healthScore).toBeLessThanOrEqual(100);
    expect(result.healthStatus).toBeDefined();
    expect(['excellent', 'good', 'at-risk', 'critical']).toContain(result.healthStatus);
  });

  it('should return component scores', async () => {
    // Arrange
    const mockAccount = { name: 'Test Account' };
    (db.doc.get as jest.Mock).mockResolvedValue(mockAccount);
    (db.find as jest.Mock).mockResolvedValue([]);

    const request: AccountHealthRequest = { accountId: 'acc_123' };

    // Act
    const result = await calculateAccountHealth(request);

    // Assert
    expect(result.components).toBeDefined();
    expect(result.components.engagement).toBeDefined();
    expect(result.components.financial).toBeDefined();
    expect(result.components.support).toBeDefined();
    expect(result.components.product_adoption).toBeDefined();
  });

  it('should identify low engagement accounts', async () => {
    // Arrange
    const mockAccount = { name: 'Low Engagement Account' };
    const mockActivities: any[] = []; // No recent activities

    (db.doc.get as jest.Mock).mockResolvedValue(mockAccount);
    (db.find as jest.Mock)
      .mockResolvedValueOnce([]) // opportunities
      .mockResolvedValueOnce([]) // cases
      .mockResolvedValueOnce(mockActivities);

    const request: AccountHealthRequest = { accountId: 'acc_123' };

    // Act
    const result = await calculateAccountHealth(request);

    // Assert
    expect(result.components.engagement).toBeLessThan(50);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('should flag accounts with high-priority cases', async () => {
    // Arrange
    const mockAccount = { name: 'Account with Issues' };
    const mockCases = [
      { status: 'Open', priority: 'High' },
      { status: 'Open', priority: 'Critical' }
    ];

    (db.doc.get as jest.Mock).mockResolvedValue(mockAccount);
    (db.find as jest.Mock)
      .mockResolvedValueOnce([]) // opportunities
      .mockResolvedValueOnce(mockCases)
      .mockResolvedValueOnce([]); // activities

    const request: AccountHealthRequest = { accountId: 'acc_123' };

    // Act
    const result = await calculateAccountHealth(request);

    // Assert
    expect(result.components.support).toBeLessThanOrEqual(70);
    expect(result.factors.some(f => f.factor === 'Support Health')).toBe(true);
  });

  it('should provide actionable recommendations', async () => {
    // Arrange
    const mockAccount = { name: 'Test Account' };
    (db.doc.get as jest.Mock).mockResolvedValue(mockAccount);
    (db.find as jest.Mock).mockResolvedValue([]);

    const request: AccountHealthRequest = { accountId: 'acc_123' };

    // Act
    const result = await calculateAccountHealth(request);

    // Assert
    expect(result.recommendations).toBeDefined();
    expect(Array.isArray(result.recommendations)).toBe(true);
    result.recommendations.forEach(rec => {
      expect(rec.priority).toBeDefined();
      expect(rec.action).toBeDefined();
      expect(rec.expectedImpact).toBeDefined();
    });
  });
});

describe('Account AI Actions - predictChurn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should predict churn probability based on health score', async () => {
    // Arrange
    const mockAccount = { name: 'At Risk Account' };
    const mockOpportunities: any[] = [];
    const mockCases = [
      { status: 'Open', priority: 'High' },
      { status: 'Open', priority: 'High' }
    ];
    const mockActivities: any[] = [];

    (db.doc.get as jest.Mock).mockResolvedValue(mockAccount);
    (db.find as jest.Mock)
      .mockResolvedValueOnce(mockOpportunities)
      .mockResolvedValueOnce(mockCases)
      .mockResolvedValueOnce(mockActivities);

    const request: ChurnPredictionRequest = { accountId: 'acc_123' };

    // Act
    const result = await predictChurn(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.churnProbability).toBeGreaterThanOrEqual(0);
    expect(result.churnProbability).toBeLessThanOrEqual(100);
    expect(result.riskLevel).toBeDefined();
  });

  it('should return low risk for healthy accounts', async () => {
    // Arrange
    const mockAccount = { name: 'Healthy Account' };
    const mockOpportunities = [
      { amount: 500000, stage: 'Closed Won', close_date: '2024-01-15' },
      { amount: 300000, stage: 'Closed Won', close_date: '2024-02-20' }
    ];
    const mockCases: any[] = [];
    const mockActivities = Array(15).fill({
      activity_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    });

    (db.doc.get as jest.Mock).mockResolvedValue(mockAccount);
    (db.find as jest.Mock)
      .mockResolvedValueOnce(mockOpportunities)
      .mockResolvedValueOnce(mockCases)
      .mockResolvedValueOnce(mockActivities);

    const request: ChurnPredictionRequest = { accountId: 'acc_123' };

    // Act
    const result = await predictChurn(request);

    // Assert
    expect(result.riskLevel).toBe('low');
    expect(result.churnProbability).toBeLessThan(30);
  });

  it('should identify churn indicators', async () => {
    // Arrange
    const mockAccount = { name: 'Test Account' };
    (db.doc.get as jest.Mock).mockResolvedValue(mockAccount);
    (db.find as jest.Mock).mockResolvedValue([]);

    const request: ChurnPredictionRequest = { accountId: 'acc_123' };

    // Act
    const result = await predictChurn(request);

    // Assert
    expect(result.indicators).toBeDefined();
    expect(Array.isArray(result.indicators)).toBe(true);
  });

  it('should provide retention actions for at-risk accounts', async () => {
    // Arrange
    const mockAccount = { name: 'At Risk Account' };
    const mockCases = Array(5).fill({ status: 'Open', priority: 'High' });

    (db.doc.get as jest.Mock).mockResolvedValue(mockAccount);
    (db.find as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(mockCases)
      .mockResolvedValueOnce([]);

    const request: ChurnPredictionRequest = { accountId: 'acc_123' };

    // Act
    const result = await predictChurn(request);

    // Assert
    expect(result.retentionActions).toBeDefined();
    expect(result.retentionActions.length).toBeGreaterThan(0);
    result.retentionActions.forEach(action => {
      expect(action.priority).toBeDefined();
      expect(action.action).toBeDefined();
      expect(action.timeline).toBeDefined();
    });
  });

  it('should handle accounts with no historical data', async () => {
    // Arrange
    const mockAccount = { name: 'New Account' };
    (db.doc.get as jest.Mock).mockResolvedValue(mockAccount);
    (db.find as jest.Mock).mockResolvedValue([]);

    const request: ChurnPredictionRequest = { accountId: 'acc_123' };

    // Act
    const result = await predictChurn(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.churnProbability).toBeGreaterThanOrEqual(0);
    expect(result.churnProbability).toBeLessThanOrEqual(100);
  });
});

describe('Account AI Actions - generateRecommendations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should recommend products for large enterprises', async () => {
    // Arrange
    const mockAccount = {
      industry: 'Technology',
      annual_revenue: 50000000,
      number_of_employees: 1000
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockAccount);

    const request: RecommendationRequest = { accountId: 'acc_123' };

    // Act
    const result = await generateRecommendations(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.recommendations).toBeDefined();
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('should include confidence scores in recommendations', async () => {
    // Arrange
    const mockAccount = {
      industry: 'Finance',
      annual_revenue: 10000000,
      number_of_employees: 200
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockAccount);

    const request: RecommendationRequest = { accountId: 'acc_123' };

    // Act
    const result = await generateRecommendations(request);

    // Assert
    result.recommendations.forEach(rec => {
      expect(rec.confidence).toBeGreaterThanOrEqual(0);
      expect(rec.confidence).toBeLessThanOrEqual(100);
      expect(rec.estimatedValue).toBeGreaterThan(0);
    });
  });

  it('should provide industry-specific recommendations', async () => {
    // Arrange
    const mockAccount = {
      industry: 'Technology',
      annual_revenue: 5000000,
      number_of_employees: 100
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockAccount);

    const request: RecommendationRequest = { accountId: 'acc_123' };

    // Act
    const result = await generateRecommendations(request);

    // Assert
    const hasIndustryRec = result.recommendations.some(rec => 
      rec.reasoning.toLowerCase().includes('tech') || 
      rec.reasoning.toLowerCase().includes('integration')
    );
    expect(hasIndustryRec).toBe(true);
  });

  it('should return timing recommendations', async () => {
    // Arrange
    const mockAccount = {
      industry: 'Healthcare',
      annual_revenue: 15000000,
      number_of_employees: 500
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockAccount);

    const request: RecommendationRequest = { accountId: 'acc_123' };

    // Act
    const result = await generateRecommendations(request);

    // Assert
    expect(result.timing).toBeDefined();
    expect(result.timing.recommended).toBeDefined();
    expect(result.timing.reasoning).toBeDefined();
  });

  it('should handle accounts with minimal data', async () => {
    // Arrange
    const mockAccount = {
      industry: null,
      annual_revenue: null,
      number_of_employees: null
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockAccount);

    const request: RecommendationRequest = { accountId: 'acc_123' };

    // Act
    const result = await generateRecommendations(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.recommendations).toBeDefined();
  });
});
