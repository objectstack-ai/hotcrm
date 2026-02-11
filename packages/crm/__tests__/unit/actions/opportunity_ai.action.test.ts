import {
  predictWinProbability,
  assessDealRisk,
  recommendNextStep,
  analyzeCompetition,
  predictCloseDate,
  WinProbabilityRequest,
  DealRiskRequest,
  NextStepRequest,
  CompetitiveIntelRequest,
  CloseDatePredictionRequest
} from '../../../src/actions/opportunity_ai.action';

import { vi, Mock } from 'vitest';

vi.mock('../../../src/db', () => ({
  db: {
    doc: {
      get: vi.fn(),
      update: vi.fn()
    },
    find: vi.fn()
  }
}));

import { db } from '../../../src/db';

describe('Opportunity AI Actions - predictWinProbability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should predict win probability and update opportunity', async () => {
    (db.doc.get as Mock)
      .mockResolvedValueOnce({
        Name: 'Big Deal',
        Stage: 'proposal',
        Amount: 100000,
        CloseDate: '2024-03-15',
        Probability: 60,
        Type: 'New Business',
        LeadSource: 'Website',
        CreatedDate: '2024-01-01',
        AccountId: 'acc_001',
        ContactId: 'con_001',
        Age: 45
      })
      .mockResolvedValueOnce({
        Industry: 'technology',
        AnnualRevenue: 5000000,
        NumberOfEmployees: 200
      });
    (db.find as Mock).mockResolvedValue([
      { Type: 'call', ActivityDate: new Date().toISOString() },
      { Type: 'email', ActivityDate: new Date().toISOString() },
      { Type: 'meeting', ActivityDate: new Date().toISOString() }
    ]);
    (db.doc.update as Mock).mockResolvedValue({});

    const request: WinProbabilityRequest = { opportunityId: 'opp_001' };

    const result = await predictWinProbability(request);

    expect(result).toBeDefined();
    expect(result.winProbability).toBeGreaterThanOrEqual(0);
    expect(result.winProbability).toBeLessThanOrEqual(100);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.factors).toBeDefined();
    expect(Array.isArray(result.factors)).toBe(true);
    expect(result.stageComparison).toBeDefined();
    expect(result.historicalContext).toBeDefined();
    expect(db.doc.update).toHaveBeenCalledWith('Opportunity', 'opp_001', expect.objectContaining({
      AIProbability: expect.any(Number)
    }));
  });

  it('should return factors with impact and weight', async () => {
    (db.doc.get as Mock)
      .mockResolvedValueOnce({ Stage: 'qualification', AccountId: 'acc_001', Probability: 30 })
      .mockResolvedValueOnce({ Industry: 'finance' });
    (db.find as Mock).mockResolvedValue([]);
    (db.doc.update as Mock).mockResolvedValue({});

    const request: WinProbabilityRequest = { opportunityId: 'opp_002' };

    const result = await predictWinProbability(request);

    result.factors.forEach(factor => {
      expect(factor.factor).toBeDefined();
      expect(factor.impact).toBeDefined();
      expect(['positive', 'negative', 'neutral']).toContain(factor.impact);
      expect(factor.weight).toBeDefined();
      expect(factor.description).toBeDefined();
    });
  });
});

describe('Opportunity AI Actions - assessDealRisk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should assess deal risk and return risk level', async () => {
    (db.doc.get as Mock).mockResolvedValue({
      Stage: 'proposal',
      Amount: 75000,
      CloseDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      Age: 30
    });
    (db.find as Mock).mockResolvedValue([
      { Type: 'call', ActivityDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() }
    ]);

    const request: DealRiskRequest = { opportunityId: 'opp_001' };

    const result = await assessDealRisk(request);

    expect(result).toBeDefined();
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(100);
    expect(['low', 'medium', 'high', 'critical']).toContain(result.riskLevel);
    expect(result.risks).toBeDefined();
    expect(Array.isArray(result.risks)).toBe(true);
    expect(result.mitigationActions).toBeDefined();
    expect(Array.isArray(result.mitigationActions)).toBe(true);
  });

  it('should provide mitigation actions with priority', async () => {
    (db.doc.get as Mock).mockResolvedValue({ Stage: 'negotiation', Amount: 50000 });
    (db.find as Mock).mockResolvedValue([]);

    const request: DealRiskRequest = { opportunityId: 'opp_002' };

    const result = await assessDealRisk(request);

    result.mitigationActions.forEach(action => {
      expect(action.priority).toBeDefined();
      expect(action.action).toBeDefined();
      expect(action.reasoning).toBeDefined();
    });
  });
});

describe('Opportunity AI Actions - recommendNextStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should recommend next steps based on deal stage', async () => {
    (db.doc.get as Mock).mockResolvedValue({
      Stage: 'proposal',
      Amount: 100000,
      CloseDate: '2024-03-15'
    });
    (db.find as Mock).mockResolvedValue([
      { Type: 'meeting', Subject: 'Demo call' },
      { Type: 'email', Subject: 'Proposal sent' }
    ]);

    const request: NextStepRequest = { opportunityId: 'opp_001' };

    const result = await recommendNextStep(request);

    expect(result).toBeDefined();
    expect(result.primaryRecommendation).toBeDefined();
    expect(result.primaryRecommendation.action).toBeDefined();
    expect(result.primaryRecommendation.type).toBeDefined();
    expect(result.primaryRecommendation.priority).toBeDefined();
    expect(result.primaryRecommendation.reasoning).toBeDefined();
    expect(result.alternatives).toBeDefined();
    expect(result.successPatterns).toBeDefined();
  });
});

describe('Opportunity AI Actions - analyzeCompetition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should analyze competitive landscape and return positioning', async () => {
    (db.doc.get as Mock).mockResolvedValue({
      Name: 'Enterprise Deal',
      Industry: 'technology',
      Amount: 200000
    });
    (db.find as Mock).mockResolvedValue([
      { Type: 'meeting', Subject: 'Competitive review', Description: 'Discussed Salesforce comparison' }
    ]);

    const request: CompetitiveIntelRequest = { opportunityId: 'opp_001' };

    const result = await analyzeCompetition(request);

    expect(result).toBeDefined();
    expect(result.competitors).toBeDefined();
    expect(Array.isArray(result.competitors)).toBe(true);
    expect(result.positioning).toBeDefined();
    expect(result.positioning.strengths).toBeDefined();
    expect(result.positioning.weaknesses).toBeDefined();
    expect(result.positioning.differentiators).toBeDefined();
    expect(result.talkingPoints).toBeDefined();
    expect(result.insights).toBeDefined();
    expect(result.insights.winRate).toBeGreaterThanOrEqual(0);
  });
});

describe('Opportunity AI Actions - predictCloseDate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should predict close date and update opportunity when variance is significant', async () => {
    (db.doc.get as Mock)
      .mockResolvedValueOnce({
        Stage: 'proposal',
        CloseDate: '2024-02-28',
        Amount: 150000,
        CreatedDate: '2024-01-01',
        AccountId: 'acc_001'
      })
      .mockResolvedValueOnce({
        Industry: 'technology'
      });
    (db.doc.update as Mock).mockResolvedValue({});

    const request: CloseDatePredictionRequest = { opportunityId: 'opp_001' };

    const result = await predictCloseDate(request);

    expect(result).toBeDefined();
    expect(result.predictedCloseDate).toBeDefined();
    expect(result.currentCloseDate).toBeDefined();
    expect(result.variance).toBeDefined();
    expect(typeof result.isRealistic).toBe('boolean');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.factors).toBeDefined();
    expect(result.forecastCategory).toBeDefined();
    expect(db.doc.update).toHaveBeenCalledWith('Opportunity', 'opp_001', expect.objectContaining({
      AIPredictedCloseDate: expect.any(String),
      ForecastCategory: expect.any(String)
    }));
  });
});
