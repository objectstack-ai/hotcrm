import {
  analyzeContractRisk,
  predictRenewal,
  ContractRiskRequest,
  RenewalPredictionRequest
} from '../../../src/actions/contract_ai.action';

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

describe('Contract AI - analyzeContractRisk', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should analyze contract risk factors', async () => {
    // Arrange
    const mockContract = {
      contract_number: 'CNT-001',
      contract_term: 24,
      status: 'Active',
      start_date: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1000).toISOString(),
      billing_frequency: 'Monthly',
      payment_terms: '30',
      account_id: 'acc_123'
    };

    const mockAccount = {
      name: 'Test Company',
      annual_revenue: 5000000,
      number_of_employees: 200
    };

    (db.doc.get as jest.Mock)
      .mockResolvedValueOnce(mockContract)
      .mockResolvedValueOnce(mockAccount);

    const request: ContractRiskRequest = {
      contractId: 'contract_123'
    };

    // Act
    const result = await analyzeContractRisk(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(100);
    expect(result.riskLevel).toBeDefined();
    expect(['low', 'medium', 'high', 'critical']).toContain(result.riskLevel);
  });

  it('should identify long-term contract risk', async () => {
    // Arrange
    const longTermContract = {
      contract_term: 48, // 4 years
      status: 'Active',
      payment_terms: '30',
      account_id: 'acc_456'
    };

    (db.doc.get as jest.Mock)
      .mockResolvedValueOnce(longTermContract)
      .mockResolvedValueOnce({ annual_revenue: 1000000 });

    const request: ContractRiskRequest = {
      contractId: 'contract_long'
    };

    // Act
    const result = await analyzeContractRisk(request);

    // Assert
    const hasLongTermRisk = result.risks.some(r => r.category === 'Contract Term');
    expect(hasLongTermRisk).toBe(true);
  });

  it('should flag extended payment terms', async () => {
    // Arrange
    const mockContract = {
      contract_term: 12,
      status: 'Active',
      payment_terms: '90', // Extended terms
      account_id: 'acc_789'
    };

    (db.doc.get as jest.Mock)
      .mockResolvedValueOnce(mockContract)
      .mockResolvedValueOnce({ annual_revenue: 500000 });

    const request: ContractRiskRequest = {
      contractId: 'contract_payment'
    };

    // Act
    const result = await analyzeContractRisk(request);

    // Assert
    const hasPaymentRisk = result.risks.some(r => r.category === 'Payment Terms');
    expect(hasPaymentRisk).toBe(true);
    if (hasPaymentRisk) {
      const paymentRisk = result.risks.find(r => r.category === 'Payment Terms');
      expect(paymentRisk!.severity).toMatch(/high|medium/);
    }
  });

  it('should provide mitigation recommendations', async () => {
    // Arrange
    const mockContract = {
      contract_term: 12,
      status: 'Active',
      end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
      payment_terms: '30',
      account_id: 'acc_rec'
    };

    (db.doc.get as jest.Mock)
      .mockResolvedValueOnce(mockContract)
      .mockResolvedValueOnce({ annual_revenue: 2000000 });

    const request: ContractRiskRequest = {
      contractId: 'contract_rec'
    };

    // Act
    const result = await analyzeContractRisk(request);

    // Assert
    expect(result.recommendations).toBeDefined();
    expect(Array.isArray(result.recommendations)).toBe(true);
    result.recommendations.forEach(rec => {
      expect(rec.action).toBeDefined();
      expect(rec.priority).toBeDefined();
      expect(rec.timeline).toBeDefined();
    });
  });

  it('should calculate financial impact', async () => {
    // Arrange
    const mockContract = {
      contract_term: 24,
      status: 'Draft',
      payment_terms: '60',
      account_id: 'acc_impact'
    };

    (db.doc.get as jest.Mock)
      .mockResolvedValueOnce(mockContract)
      .mockResolvedValueOnce({ annual_revenue: 800000 });

    const request: ContractRiskRequest = {
      contractId: 'contract_impact'
    };

    // Act
    const result = await analyzeContractRisk(request);

    // Assert
    expect(result.financialImpact).toBeDefined();
    expect(result.financialImpact.potentialLoss).toBeGreaterThanOrEqual(0);
    expect(result.financialImpact.confidence).toBeGreaterThanOrEqual(0);
    expect(result.financialImpact.confidence).toBeLessThanOrEqual(100);
  });
});

describe('Contract AI - predictRenewal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should predict renewal probability', async () => {
    // Arrange
    const mockContract = {
      account_id: 'acc_renewal',
      status: 'Active',
      start_date: new Date(Date.now() - 18 * 30 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString(),
      contract_term: 24
    };

    const mockAccount = { name: 'Renewal Corp' };
    const mockCases: any[] = [];
    const mockOpportunities: any[] = [];

    (db.doc.get as jest.Mock)
      .mockResolvedValueOnce(mockContract)
      .mockResolvedValueOnce(mockAccount);
    (db.find as jest.Mock)
      .mockResolvedValueOnce(mockCases)
      .mockResolvedValueOnce(mockOpportunities);

    const request: RenewalPredictionRequest = {
      contractId: 'contract_renewal'
    };

    // Act
    const result = await predictRenewal(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.renewalProbability).toBeGreaterThanOrEqual(0);
    expect(result.renewalProbability).toBeLessThanOrEqual(100);
    expect(result.likelihood).toBeDefined();
  });

  it('should consider customer tenure in prediction', async () => {
    // Arrange
    const longTenureContract = {
      account_id: 'acc_longtime',
      status: 'Active',
      start_date: new Date(Date.now() - 36 * 30 * 24 * 60 * 60 * 1000).toISOString(), // 3 years
      end_date: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString(),
      contract_term: 36
    };

    (db.doc.get as jest.Mock)
      .mockResolvedValueOnce(longTenureContract)
      .mockResolvedValueOnce({ name: 'Long Time Customer' });
    (db.find as jest.Mock).mockResolvedValue([]);

    const request: RenewalPredictionRequest = {
      contractId: 'contract_longtime'
    };

    // Act
    const result = await predictRenewal(request);

    // Assert
    const hasTenureFactor = result.factors.some(f => f.factor === 'Long-term Customer');
    expect(hasTenureFactor).toBe(true);
    expect(result.renewalProbability).toBeGreaterThan(50);
  });

  it('should identify support issues as negative factor', async () => {
    // Arrange
    const mockContract = {
      account_id: 'acc_issues',
      status: 'Active',
      start_date: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1000).toISOString(),
      contract_term: 24
    };

    const mockCases = [
      { priority: 'high', status: 'Open', created_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
      { priority: 'critical', status: 'Open', created_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
      { priority: 'high', status: 'Open', created_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() },
      { priority: 'high', status: 'Open', created_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() },
      { priority: 'high', status: 'Closed', created_date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString() }
    ];

    (db.doc.get as jest.Mock)
      .mockResolvedValueOnce(mockContract)
      .mockResolvedValueOnce({ name: 'Troubled Customer' });
    (db.find as jest.Mock)
      .mockResolvedValueOnce(mockCases)
      .mockResolvedValueOnce([]);

    const request: RenewalPredictionRequest = {
      contractId: 'contract_issues'
    };

    // Act
    const result = await predictRenewal(request);

    // Assert
    const hasSupportIssues = result.factors.some(f => f.factor === 'Support Issues' && f.impact === 'negative');
    expect(hasSupportIssues).toBe(true);
  });

  it('should recommend retention actions', async () => {
    // Arrange
    const mockContract = {
      account_id: 'acc_retain',
      status: 'Active',
      start_date: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString(),
      contract_term: 24
    };

    (db.doc.get as jest.Mock)
      .mockResolvedValueOnce(mockContract)
      .mockResolvedValueOnce({ name: 'Customer' });
    (db.find as jest.Mock).mockResolvedValue([]);

    const request: RenewalPredictionRequest = {
      contractId: 'contract_retain'
    };

    // Act
    const result = await predictRenewal(request);

    // Assert
    expect(result.retentionActions).toBeDefined();
    expect(Array.isArray(result.retentionActions)).toBe(true);
    result.retentionActions.forEach(action => {
      expect(action.action).toBeDefined();
      expect(action.timing).toBeDefined();
      expect(action.expectedImpact).toBeDefined();
    });
  });

  it('should suggest expansion opportunities', async () => {
    // Arrange
    const mockContract = {
      account_id: 'acc_expand',
      status: 'Active',
      start_date: new Date(Date.now() - 24 * 30 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1000).toISOString(),
      contract_term: 36
    };

    (db.doc.get as jest.Mock)
      .mockResolvedValueOnce(mockContract)
      .mockResolvedValueOnce({ name: 'Growth Customer' });
    (db.find as jest.Mock).mockResolvedValue([]);

    const request: RenewalPredictionRequest = {
      contractId: 'contract_expand'
    };

    // Act
    const result = await predictRenewal(request);

    // Assert
    expect(result.expansionOpportunities).toBeDefined();
    if (result.expansionOpportunities && result.expansionOpportunities.length > 0) {
      result.expansionOpportunities.forEach(opp => {
        expect(opp.product).toBeDefined();
        expect(opp.estimatedValue).toBeGreaterThan(0);
      });
    }
  });
});
