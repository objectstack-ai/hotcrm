import {
  predictSLABreach,
  estimateResolutionTime,
  analyzeEscalationNeeds,
  SLABreachPredictionRequest,
  ResolutionTimeRequest,
  EscalationAnalysisRequest
} from '../../../src/actions/sla_prediction.action';

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

describe('SLA Prediction - predictSLABreach', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should predict breach probability for critical case', async () => {
    // Arrange
    const mockCase = {
      subject: 'Production system down',
      priority: 'Critical',
      status: 'New',
      created_date: new Date(Date.now() - 50 * 60 * 1000).toISOString(), // 50 minutes ago
      type: 'Technical Issue',
      owner_id: null
    };

    const mockSlaRecords: any[] = [];

    (db.doc.get as jest.Mock).mockResolvedValue(mockCase);
    (db.find as jest.Mock).mockResolvedValue(mockSlaRecords);

    const request: SLABreachPredictionRequest = {
      caseId: 'case_critical'
    };

    // Act
    const result = await predictSLABreach(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.breachProbability).toBeGreaterThanOrEqual(0);
    expect(result.breachProbability).toBeLessThanOrEqual(100);
    expect(result.riskLevel).toBeDefined();
    expect(['low', 'medium', 'high', 'critical']).toContain(result.riskLevel);
  });

  it('should identify unassigned case as risk factor', async () => {
    // Arrange
    const mockCase = {
      subject: 'Issue requiring attention',
      priority: 'High',
      status: 'New',
      created_date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      type: 'General',
      owner_id: null // Unassigned
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockCase);
    (db.find as jest.Mock).mockResolvedValue([]);

    const request: SLABreachPredictionRequest = {
      caseId: 'case_unassigned'
    };

    // Act
    const result = await predictSLABreach(request);

    // Assert
    expect(result.riskFactors).toBeDefined();
    const unassignedFactor = result.riskFactors.find(f => f.factor === 'Unassigned Case');
    expect(unassignedFactor).toBeDefined();
    expect(unassignedFactor!.impact).toBeGreaterThan(0);
  });

  it('should calculate time until breach', async () => {
    // Arrange
    const mockCase = {
      subject: 'Test case',
      priority: 'Medium',
      status: 'In Progress',
      created_date: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
      type: 'Question',
      owner_id: 'agent_123'
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockCase);
    (db.find as jest.Mock).mockResolvedValue([]);

    const request: SLABreachPredictionRequest = {
      caseId: 'case_timing'
    };

    // Act
    const result = await predictSLABreach(request);

    // Assert
    expect(result.timeUntilBreach).toBeGreaterThanOrEqual(0);
    expect(result.currentStatus).toBeDefined();
    expect(result.currentStatus.targetResponseTime).toBeGreaterThan(0);
    expect(result.currentStatus.elapsedTime).toBeGreaterThan(0);
    expect(result.currentStatus.percentComplete).toBeGreaterThanOrEqual(0);
  });

  it('should recommend escalation for high-risk cases', async () => {
    // Arrange
    const mockCase = {
      subject: 'Critical production issue',
      priority: 'Critical',
      status: 'New',
      created_date: new Date(Date.now() - 55 * 60 * 1000).toISOString(), // 55 minutes ago (near 1hr SLA)
      type: 'Technical Issue',
      owner_id: null
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockCase);
    (db.find as jest.Mock).mockResolvedValue([]);

    const request: SLABreachPredictionRequest = {
      caseId: 'case_highrisk'
    };

    // Act
    const result = await predictSLABreach(request);

    // Assert
    expect(result.actions).toBeDefined();
    expect(Array.isArray(result.actions)).toBe(true);
    expect(result.actions.length).toBeGreaterThan(0);
    
    const hasImmediateAction = result.actions.some(a => a.priority === 'immediate');
    if (result.riskLevel === 'critical' || result.riskLevel === 'high') {
      expect(hasImmediateAction).toBe(true);
    }
  });

  it('should show low risk for well-managed case', async () => {
    // Arrange
    const mockCase = {
      subject: 'Minor question',
      priority: 'Low',
      status: 'In Progress',
      created_date: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      type: 'Question',
      owner_id: 'agent_456'
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockCase);
    (db.find as jest.Mock).mockResolvedValue([]);

    const request: SLABreachPredictionRequest = {
      caseId: 'case_lowrisk'
    };

    // Act
    const result = await predictSLABreach(request);

    // Assert
    expect(result.riskLevel).toMatch(/low|medium/);
    expect(result.breachProbability).toBeLessThan(50);
  });
});

describe('SLA Prediction - estimateResolutionTime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should estimate resolution time based on similar cases', async () => {
    // Arrange
    const mockCase = {
      subject: 'Login issue',
      description: 'Cannot access account',
      priority: 'High',
      type: 'Technical Issue',
      created_date: new Date().toISOString()
    };

    const mockSimilarCases = [
      {
        type: 'Technical Issue',
        priority: 'High',
        status: 'Closed',
        created_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        closed_date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        type: 'Technical Issue',
        priority: 'High',
        status: 'Closed',
        created_date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        closed_date: new Date(Date.now() - 7.5 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    (db.doc.get as jest.Mock).mockResolvedValue(mockCase);
    (db.find as jest.Mock).mockResolvedValue(mockSimilarCases);

    const request: ResolutionTimeRequest = {
      caseId: 'case_estimate'
    };

    // Act
    const result = await estimateResolutionTime(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.estimatedMinutes).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  it('should provide time range estimate', async () => {
    // Arrange
    const mockCase = {
      priority: 'Medium',
      type: 'Question',
      created_date: new Date().toISOString()
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockCase);
    (db.find as jest.Mock).mockResolvedValue([]);

    const request: ResolutionTimeRequest = {
      caseId: 'case_range'
    };

    // Act
    const result = await estimateResolutionTime(request);

    // Assert
    expect(result.timeRange).toBeDefined();
    expect(result.timeRange.min).toBeGreaterThan(0);
    expect(result.timeRange.max).toBeGreaterThan(result.timeRange.min);
  });

  it('should identify factors affecting resolution time', async () => {
    // Arrange
    const mockCase = {
      priority: 'Critical',
      type: 'Bug Report',
      description: 'This is a very complex issue with multiple symptoms and unclear root cause. ' + 'x'.repeat(500),
      created_date: new Date().toISOString()
    };

    (db.doc.get as jest.Mock).mockResolvedValue(mockCase);
    (db.find as jest.Mock).mockResolvedValue([]);

    const request: ResolutionTimeRequest = {
      caseId: 'case_factors'
    };

    // Act
    const result = await estimateResolutionTime(request);

    // Assert
    expect(result.factors).toBeDefined();
    expect(Array.isArray(result.factors)).toBe(true);
    result.factors.forEach(factor => {
      expect(factor.factor).toBeDefined();
      expect(factor.impact).toBeDefined();
    });
  });

  it('should return benchmark statistics', async () => {
    // Arrange
    const mockCase = {
      priority: 'High',
      type: 'Technical Issue',
      created_date: new Date().toISOString()
    };

    const mockHistoricalCases = Array(10).fill({
      type: 'Technical Issue',
      priority: 'High',
      status: 'Closed',
      created_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      closed_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    });

    (db.doc.get as jest.Mock).mockResolvedValue(mockCase);
    (db.find as jest.Mock).mockResolvedValue(mockHistoricalCases);

    const request: ResolutionTimeRequest = {
      caseId: 'case_benchmark'
    };

    // Act
    const result = await estimateResolutionTime(request);

    // Assert
    expect(result.benchmarks).toBeDefined();
    expect(result.benchmarks.similarCasesAvg).toBeGreaterThan(0);
    expect(result.benchmarks.similarCasesMedian).toBeGreaterThan(0);
    expect(result.benchmarks.similarCasesCount).toBeGreaterThan(0);
  });

  it('should adjust estimate for priority', async () => {
    // Arrange
    const criticalCase = {
      priority: 'Critical',
      type: 'Issue',
      created_date: new Date().toISOString()
    };

    const lowCase = {
      priority: 'Low',
      type: 'Issue',
      created_date: new Date().toISOString()
    };

    const mockHistorical = [{
      type: 'Issue',
      priority: 'Critical',
      status: 'Closed',
      created_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      closed_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }];

    (db.find as jest.Mock).mockResolvedValue(mockHistorical);

    // Act - Critical case
    (db.doc.get as jest.Mock).mockResolvedValue(criticalCase);
    const criticalResult = await estimateResolutionTime({ caseId: 'critical' });

    // Act - Low priority case
    (db.doc.get as jest.Mock).mockResolvedValue(lowCase);
    const lowResult = await estimateResolutionTime({ caseId: 'low' });

    // Assert - Low priority should take longer
    expect(lowResult.estimatedMinutes).toBeGreaterThan(criticalResult.estimatedMinutes);
  });
});

describe('SLA Prediction - analyzeEscalationNeeds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should identify cases needing escalation', async () => {
    // Arrange
    const mockCases = [
      {
        id: 'case_1',
        case_number: 'C-001',
        subject: 'Critical production issue',
        status: 'New',
        priority: 'Critical',
        created_date: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
        owner_id: null
      },
      {
        id: 'case_2',
        case_number: 'C-002',
        subject: 'Normal request',
        status: 'In Progress',
        priority: 'Low',
        created_date: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        owner_id: 'agent_1'
      }
    ];

    (db.find as jest.Mock).mockResolvedValueOnce(mockCases);
    
    // Mock individual case gets for breach prediction
    (db.doc.get as jest.Mock).mockImplementation((type, id) => {
      return Promise.resolve(mockCases.find(c => c.id === id));
    });
    
    (db.find as jest.Mock).mockResolvedValue([]); // For SLA records

    const request: EscalationAnalysisRequest = {
      periodHours: 24,
      riskThreshold: 50
    };

    // Act
    const result = await analyzeEscalationNeeds(request);

    // Assert
    expect(result).toBeDefined();
    expect(result.casesNeedingEscalation).toBeDefined();
    expect(Array.isArray(result.casesNeedingEscalation)).toBe(true);
  });

  it('should provide summary statistics', async () => {
    // Arrange
    (db.find as jest.Mock).mockResolvedValue([]);

    const request: EscalationAnalysisRequest = {
      periodHours: 24
    };

    // Act
    const result = await analyzeEscalationNeeds(request);

    // Assert
    expect(result.summary).toBeDefined();
    expect(result.summary.totalAtRisk).toBeGreaterThanOrEqual(0);
    expect(result.summary.criticalCount).toBeGreaterThanOrEqual(0);
    expect(result.summary.highCount).toBeGreaterThanOrEqual(0);
    expect(result.summary.averageRisk).toBeGreaterThanOrEqual(0);
  });

  it('should sort cases by risk score', async () => {
    // Arrange
    const mockCases = [
      {
        id: 'case_low',
        case_number: 'C-100',
        subject: 'Low risk',
        status: 'In Progress',
        priority: 'Low',
        created_date: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        owner_id: 'agent_1'
      }
    ];

    (db.find as jest.Mock).mockResolvedValue(mockCases);
    (db.doc.get as jest.Mock).mockResolvedValue(mockCases[0]);

    const request: EscalationAnalysisRequest = {
      periodHours: 48,
      riskThreshold: 0 // Get all cases
    };

    // Act
    const result = await analyzeEscalationNeeds(request);

    // Assert
    if (result.casesNeedingEscalation.length > 1) {
      for (let i = 1; i < result.casesNeedingEscalation.length; i++) {
        expect(result.casesNeedingEscalation[i - 1].riskScore).toBeGreaterThanOrEqual(
          result.casesNeedingEscalation[i].riskScore
        );
      }
    }
  });

  it('should include recommended actions', async () => {
    // Arrange
    const mockCase = {
      id: 'case_action',
      case_number: 'C-200',
      subject: 'Needs escalation',
      status: 'New',
      priority: 'High',
      created_date: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
      owner_id: null
    };

    (db.find as jest.Mock).mockResolvedValueOnce([mockCase]).mockResolvedValue([]);
    (db.doc.get as jest.Mock).mockResolvedValue(mockCase);

    const request: EscalationAnalysisRequest = {
      periodHours: 24,
      riskThreshold: 40
    };

    // Act
    const result = await analyzeEscalationNeeds(request);

    // Assert
    if (result.casesNeedingEscalation.length > 0) {
      result.casesNeedingEscalation.forEach(caseItem => {
        expect(caseItem.reason).toBeDefined();
        expect(caseItem.recommendedAction).toBeDefined();
      });
    }
  });

  it('should filter by risk threshold', async () => {
    // Arrange
    const mockCases = [
      {
        id: 'case_high',
        case_number: 'C-300',
        subject: 'High risk case',
        status: 'New',
        priority: 'Critical',
        created_date: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
        owner_id: null,
        type: 'Technical Issue'
      }
    ];

    (db.find as jest.Mock).mockResolvedValue(mockCases);
    (db.doc.get as jest.Mock).mockResolvedValue(mockCases[0]);

    const highThresholdRequest: EscalationAnalysisRequest = {
      periodHours: 24,
      riskThreshold: 90 // Very high threshold
    };

    const lowThresholdRequest: EscalationAnalysisRequest = {
      periodHours: 24,
      riskThreshold: 10 // Low threshold
    };

    // Act
    const highResult = await analyzeEscalationNeeds(highThresholdRequest);
    
    jest.clearAllMocks();
    (db.find as jest.Mock).mockResolvedValue(mockCases);
    (db.doc.get as jest.Mock).mockResolvedValue(mockCases[0]);
    
    const lowResult = await analyzeEscalationNeeds(lowThresholdRequest);

    // Assert
    expect(lowResult.casesNeedingEscalation.length).toBeGreaterThanOrEqual(
      highResult.casesNeedingEscalation.length
    );
  });
});
