import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

vi.mock('../../../src/db', () => ({
  db: {
    find: vi.fn()
  }
}));

import { db } from '../../../src/db';
import {
  analyzePipeline,
  analyzeWinRates,
  analyzeForecastAccuracy
} from '../../../src/actions/sales_performance.action';

describe('analyzePipeline', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return pipeline metrics by stage', async () => {
    const now = Date.now();
    const mockOpportunities = [
      { Id: '1', Name: 'Deal A', Stage: 'prospecting', Amount: 10000, CreatedDate: new Date(now - 10 * 86400000).toISOString(), CloseDate: new Date(now + 30 * 86400000).toISOString(), Age: 10, DaysInStage: 5 },
      { Id: '2', Name: 'Deal B', Stage: 'prospecting', Amount: 20000, CreatedDate: new Date(now - 15 * 86400000).toISOString(), CloseDate: new Date(now + 45 * 86400000).toISOString(), Age: 15, DaysInStage: 8 },
      { Id: '3', Name: 'Deal C', Stage: 'qualification', Amount: 50000, CreatedDate: new Date(now - 20 * 86400000).toISOString(), CloseDate: new Date(now + 20 * 86400000).toISOString(), Age: 20, DaysInStage: 12 },
      { Id: '4', Name: 'Deal D', Stage: 'proposal', Amount: 75000, CreatedDate: new Date(now - 40 * 86400000).toISOString(), CloseDate: new Date(now + 10 * 86400000).toISOString(), Age: 40, DaysInStage: 10 },
    ];

    (db.find as Mock).mockResolvedValueOnce(mockOpportunities);

    const result = await analyzePipeline({});

    expect(result.stageMetrics).toBeDefined();
    expect(result.stageMetrics.length).toBeGreaterThan(0);

    const prospecting = result.stageMetrics.find(s => s.stage === 'prospecting');
    expect(prospecting).toBeDefined();
    expect(prospecting!.count).toBe(2);
    expect(prospecting!.totalValue).toBe(30000);

    const qualification = result.stageMetrics.find(s => s.stage === 'qualification');
    expect(qualification).toBeDefined();
    expect(qualification!.count).toBe(1);

    expect(result.totalPipelineValue).toBe(155000);
  });

  it('should calculate pipeline health score', async () => {
    const now = Date.now();
    const mockOpportunities = [
      { Id: '1', Stage: 'prospecting', Amount: 100000, CreatedDate: new Date(now - 5 * 86400000).toISOString(), Age: 5, DaysInStage: 5 },
      { Id: '2', Stage: 'qualification', Amount: 200000, CreatedDate: new Date(now - 10 * 86400000).toISOString(), Age: 10, DaysInStage: 10 },
      { Id: '3', Stage: 'negotiation', Amount: 150000, CreatedDate: new Date(now - 25 * 86400000).toISOString(), Age: 25, DaysInStage: 5 },
    ];

    (db.find as Mock).mockResolvedValueOnce(mockOpportunities);

    const result = await analyzePipeline({ quota: 100000 });

    expect(result.healthScore).toBeGreaterThanOrEqual(0);
    expect(result.healthScore).toBeLessThanOrEqual(100);
    // Coverage = 450000 / 100000 = 4.5 => >=3 so +10 bonus
    expect(result.coverageRatio).toBe(4.5);
    expect(result.observations.length).toBeGreaterThan(0);
  });

  it('should handle empty pipeline', async () => {
    (db.find as Mock).mockResolvedValueOnce([]);

    const result = await analyzePipeline({});

    expect(result.totalPipelineValue).toBe(0);
    expect(result.coverageRatio).toBeNull();
    expect(result.stageMetrics).toBeDefined();
    expect(result.aging.under30Days.count).toBe(0);
    expect(result.aging.over90Days.count).toBe(0);
    expect(result.creationTrend).toEqual([]);
  });

  it('should calculate aging buckets correctly', async () => {
    const now = Date.now();
    const mockOpportunities = [
      { Id: '1', Stage: 'prospecting', Amount: 10000, CreatedDate: new Date(now - 10 * 86400000).toISOString(), Age: 10, DaysInStage: 5 },
      { Id: '2', Stage: 'qualification', Amount: 20000, CreatedDate: new Date(now - 50 * 86400000).toISOString(), Age: 50, DaysInStage: 20 },
      { Id: '3', Stage: 'proposal', Amount: 30000, CreatedDate: new Date(now - 75 * 86400000).toISOString(), Age: 75, DaysInStage: 15 },
      { Id: '4', Stage: 'negotiation', Amount: 40000, CreatedDate: new Date(now - 100 * 86400000).toISOString(), Age: 100, DaysInStage: 10 },
    ];

    (db.find as Mock).mockResolvedValueOnce(mockOpportunities);

    const result = await analyzePipeline({});

    expect(result.aging.under30Days.count).toBe(1);
    expect(result.aging.days30to60.count).toBe(1);
    expect(result.aging.days60to90.count).toBe(1);
    expect(result.aging.over90Days.count).toBe(1);
  });

  it('should filter by ownerId when provided', async () => {
    (db.find as Mock).mockResolvedValueOnce([]);

    await analyzePipeline({ ownerId: 'rep_123' });

    expect(db.find).toHaveBeenCalledWith('Opportunity', expect.objectContaining({
      filters: expect.arrayContaining([
        ['OwnerId', '=', 'rep_123']
      ])
    }));
  });
});

describe('analyzeWinRates', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should calculate overall win rate', async () => {
    const mockOpportunities = [
      { Id: '1', IsWon: true, Amount: 50000, CloseDate: '2024-01-15', Industry: 'Tech', LeadSource: 'Web' },
      { Id: '2', IsWon: true, Amount: 80000, CloseDate: '2024-02-10', Industry: 'Tech', LeadSource: 'Referral' },
      { Id: '3', IsWon: false, Amount: 30000, CloseDate: '2024-01-20', Industry: 'finance', LeadSource: 'Web', LossReason: 'Price' },
      { Id: '4', IsWon: false, Amount: 60000, CloseDate: '2024-03-05', Industry: 'finance', LeadSource: 'Web', LossReason: 'Competitor' },
    ];

    (db.find as Mock).mockResolvedValueOnce(mockOpportunities);

    const result = await analyzeWinRates({});

    expect(result.overallWinRate).toBe(50);
    expect(result.totalWon).toBe(2);
    expect(result.totalLost).toBe(2);
    expect(result.avgDealSize.won).toBe(65000);
    expect(result.avgDealSize.lost).toBe(45000);
  });

  it('should break down by deal size', async () => {
    const mockOpportunities = [
      { Id: '1', IsWon: true, Amount: 10000, CloseDate: '2024-01-15' },
      { Id: '2', IsWon: false, Amount: 15000, CloseDate: '2024-01-20' },
      { Id: '3', IsWon: true, Amount: 50000, CloseDate: '2024-02-10' },
      { Id: '4', IsWon: true, Amount: 200000, CloseDate: '2024-03-01' },
      { Id: '5', IsWon: false, Amount: 600000, CloseDate: '2024-03-15' },
    ];

    (db.find as Mock).mockResolvedValueOnce(mockOpportunities);

    const result = await analyzeWinRates({});

    expect(result.byDealSize).toBeDefined();
    expect(result.byDealSize.length).toBe(4);

    const under25k = result.byDealSize.find(s => s.segment === '< $25K');
    expect(under25k).toBeDefined();
    expect(under25k!.won).toBe(1);
    expect(under25k!.lost).toBe(1);
    expect(under25k!.winRate).toBe(50);

    const over500k = result.byDealSize.find(s => s.segment === '$500K+');
    expect(over500k).toBeDefined();
    expect(over500k!.won).toBe(0);
    expect(over500k!.lost).toBe(1);
    expect(over500k!.winRate).toBe(0);
  });

  it('should handle zero closed opportunities', async () => {
    (db.find as Mock).mockResolvedValueOnce([]);

    const result = await analyzeWinRates({});

    expect(result.overallWinRate).toBe(0);
    expect(result.totalWon).toBe(0);
    expect(result.totalLost).toBe(0);
    expect(result.avgDealSize.won).toBe(0);
    expect(result.avgDealSize.lost).toBe(0);
    expect(result.lossReasons).toEqual([]);
    expect(result.monthlyTrend).toEqual([]);
  });

  it('should calculate loss reasons breakdown', async () => {
    const mockOpportunities = [
      { Id: '1', IsWon: false, Amount: 30000, CloseDate: '2024-01-15', LossReason: 'Price' },
      { Id: '2', IsWon: false, Amount: 40000, CloseDate: '2024-02-10', LossReason: 'Price' },
      { Id: '3', IsWon: false, Amount: 50000, CloseDate: '2024-03-05', LossReason: 'Competitor' },
      { Id: '4', IsWon: true, Amount: 20000, CloseDate: '2024-01-20' },
    ];

    (db.find as Mock).mockResolvedValueOnce(mockOpportunities);

    const result = await analyzeWinRates({});

    expect(result.lossReasons.length).toBe(2);
    expect(result.lossReasons[0].reason).toBe('Price');
    expect(result.lossReasons[0].count).toBe(2);
    expect(result.lossReasons[0].percentage).toBe(67);
  });

  it('should produce monthly trend data', async () => {
    const mockOpportunities = [
      { Id: '1', IsWon: true, Amount: 20000, CloseDate: '2024-01-15' },
      { Id: '2', IsWon: false, Amount: 15000, CloseDate: '2024-01-20' },
      { Id: '3', IsWon: true, Amount: 30000, CloseDate: '2024-02-10' },
    ];

    (db.find as Mock).mockResolvedValueOnce(mockOpportunities);

    const result = await analyzeWinRates({});

    expect(result.monthlyTrend.length).toBe(2);
    expect(result.monthlyTrend[0].month).toBe('2024-01');
    expect(result.monthlyTrend[0].won).toBe(1);
    expect(result.monthlyTrend[0].lost).toBe(1);
    expect(result.monthlyTrend[0].winRate).toBe(50);
    expect(result.monthlyTrend[1].month).toBe('2024-02');
    expect(result.monthlyTrend[1].winRate).toBe(100);
  });
});

describe('analyzeForecastAccuracy', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should calculate forecast accuracy', async () => {
    const mockClosedWon = [
      { Id: '1', Amount: 50000, ForecastAmount: 55000, CloseDate: '2024-01-15', Stage: 'closed_won', OwnerId: 'rep_1', ProductFamily: 'software' },
      { Id: '2', Amount: 80000, ForecastAmount: 75000, CloseDate: '2024-02-10', Stage: 'closed_won', OwnerId: 'rep_1', ProductFamily: 'Services' },
    ];

    const mockOpenOpps = [
      { Id: '3', Amount: 40000, ForecastCategory: 'commit', Stage: 'negotiation', OwnerId: 'rep_1' },
      { Id: '4', Amount: 60000, ForecastCategory: 'best_case', Stage: 'proposal', OwnerId: 'rep_2' },
    ];

    (db.find as Mock)
      .mockResolvedValueOnce(mockClosedWon)
      .mockResolvedValueOnce(mockOpenOpps);

    const result = await analyzeForecastAccuracy({});

    expect(result.overallAccuracyPct).toBeGreaterThanOrEqual(0);
    expect(result.overallAccuracyPct).toBeLessThanOrEqual(100);
    expect(result.periodAccuracy.length).toBeGreaterThan(0);

    // total forecasted = 55000+75000 = 130000, actual = 50000+80000 = 130000
    expect(result.overallAccuracyPct).toBe(100);
  });

  it('should identify over forecasting bias', async () => {
    const mockClosedWon = [
      { Id: '1', Amount: 40000, ForecastAmount: 60000, CloseDate: '2024-01-15', Stage: 'closed_won', OwnerId: 'rep_1', ProductFamily: 'software' },
      { Id: '2', Amount: 50000, ForecastAmount: 70000, CloseDate: '2024-02-10', Stage: 'closed_won', OwnerId: 'rep_1', ProductFamily: 'software' },
    ];

    (db.find as Mock)
      .mockResolvedValueOnce(mockClosedWon)
      .mockResolvedValueOnce([]);

    const result = await analyzeForecastAccuracy({});

    expect(result.overallBias.direction).toBe('over');
    expect(result.overallBias.magnitude).toBe(40000);
    // Recommendation about optimistic bias
    expect(result.recommendations.some(r => r.toLowerCase().includes('optimistic') || r.toLowerCase().includes('bias'))).toBe(true);
  });

  it('should identify under forecasting bias', async () => {
    const mockClosedWon = [
      { Id: '1', Amount: 80000, ForecastAmount: 50000, CloseDate: '2024-01-15', Stage: 'closed_won', OwnerId: 'rep_1', ProductFamily: 'Services' },
      { Id: '2', Amount: 100000, ForecastAmount: 70000, CloseDate: '2024-02-10', Stage: 'closed_won', OwnerId: 'rep_2', ProductFamily: 'Services' },
    ];

    (db.find as Mock)
      .mockResolvedValueOnce(mockClosedWon)
      .mockResolvedValueOnce([]);

    const result = await analyzeForecastAccuracy({});

    expect(result.overallBias.direction).toBe('under');
    expect(result.overallBias.magnitude).toBe(60000);
    expect(result.recommendations.some(r => r.toLowerCase().includes('conservative'))).toBe(true);
  });

  it('should break down accuracy by rep', async () => {
    const mockClosedWon = [
      { Id: '1', Amount: 50000, ForecastAmount: 50000, CloseDate: '2024-01-15', Stage: 'closed_won', OwnerId: 'rep_1', ProductFamily: 'software' },
      { Id: '2', Amount: 80000, ForecastAmount: 100000, CloseDate: '2024-02-10', Stage: 'closed_won', OwnerId: 'rep_2', ProductFamily: 'software' },
    ];

    (db.find as Mock)
      .mockResolvedValueOnce(mockClosedWon)
      .mockResolvedValueOnce([]);

    const result = await analyzeForecastAccuracy({});

    expect(result.byRep.length).toBe(2);

    const rep1 = result.byRep.find(r => r.ownerId === 'rep_1');
    expect(rep1).toBeDefined();
    expect(rep1!.accuracyPct).toBe(100);

    const rep2 = result.byRep.find(r => r.ownerId === 'rep_2');
    expect(rep2).toBeDefined();
    expect(rep2!.accuracyPct).toBe(80); // 1 - |100000-80000|/100000 = 80%
  });

  it('should handle no closed-won opportunities', async () => {
    (db.find as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await analyzeForecastAccuracy({});

    expect(result.overallAccuracyPct).toBe(0);
    expect(result.overallBias.direction).toBe('neutral');
    expect(result.overallBias.magnitude).toBe(0);
    expect(result.periodAccuracy).toEqual([]);
    expect(result.byRep).toEqual([]);
    expect(result.byStage).toEqual([]);
    expect(result.byProduct).toEqual([]);
    expect(result.coverageAnalysis).toBeNull();
  });

  it('should produce coverage analysis when open opportunities exist', async () => {
    const mockClosedWon = [
      { Id: '1', Amount: 100000, ForecastAmount: 100000, CloseDate: '2024-01-15', Stage: 'closed_won', OwnerId: 'rep_1' },
    ];
    const mockOpenOpps = [
      { Id: '2', Amount: 50000, ForecastCategory: 'commit', Stage: 'negotiation', OwnerId: 'rep_1' },
      { Id: '3', Amount: 30000, ForecastCategory: 'best_case', Stage: 'proposal', OwnerId: 'rep_1' },
      { Id: '4', Amount: 20000, ForecastCategory: 'Pipeline', Stage: 'prospecting', OwnerId: 'rep_2' },
    ];

    (db.find as Mock)
      .mockResolvedValueOnce(mockClosedWon)
      .mockResolvedValueOnce(mockOpenOpps);

    const result = await analyzeForecastAccuracy({});

    expect(result.coverageAnalysis).not.toBeNull();
    expect(result.coverageAnalysis!.commit).toBe(50000);
    expect(result.coverageAnalysis!.bestCase).toBe(30000);
    expect(result.coverageAnalysis!.pipeline).toBe(100000); // total of all open
  });
});
