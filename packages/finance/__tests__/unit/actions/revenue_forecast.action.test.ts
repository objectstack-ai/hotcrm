import { vi, Mock } from 'vitest';

vi.mock('../../../src/db', () => ({
  db: {
    find: vi.fn()
  }
}));

import { db } from '../../../src/db';
import {
  forecastRevenue,
  predictQuarterlyRevenue,
  analyzeRevenueRisk,
  recommendRevenueActions,
  benchmarkRevenue,
  ForecastRevenueRequest,
  AnalyzeRevenueRiskRequest,
  BenchmarkRevenueRequest
} from '../../../src/actions/revenue_forecast.action';

describe('Revenue Forecast - forecastRevenue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate monthly revenue forecasts', async () => {
    const futureClose = new Date();
    futureClose.setMonth(futureClose.getMonth() + 1);

    const mockOpportunities = [
      { name: 'Deal A', amount: 100000, stage: 'proposal', close_date: futureClose.toISOString(), probability: 60, account_id: 'acc_1' },
      { name: 'Deal B', amount: 50000, stage: 'negotiation', close_date: futureClose.toISOString(), probability: 80, account_id: 'acc_2' },
    ];

    (db.find as Mock)
      .mockResolvedValueOnce(mockOpportunities)  // open opportunities
      .mockResolvedValueOnce([])                  // historical contracts
      .mockResolvedValueOnce([]);                 // closed opps for win rate

    const result = await forecastRevenue({ months: 3 });

    expect(result.monthlyForecasts.length).toBe(3);
    expect(result.period.months).toBe(3);
    expect(result.totalForecast.revenue).toBeGreaterThanOrEqual(0);
    expect(result.totalForecast.range.optimistic).toBeGreaterThan(result.totalForecast.range.conservative);
  });

  it('should include confidence levels in forecasts', async () => {
    (db.find as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await forecastRevenue({ months: 6 });

    expect(result.totalForecast.confidence).toBeGreaterThanOrEqual(0);
    expect(result.totalForecast.confidence).toBeLessThanOrEqual(100);
    result.monthlyForecasts.forEach(m => {
      expect(m.confidence).toBeDefined();
    });
  });

  it('should calculate weighted pipeline values', async () => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const mockOpportunities = [
      { name: 'Big Deal', amount: 200000, stage: 'closed_won', close_date: nextMonth.toISOString(), probability: 100, account_id: 'acc_1' },
    ];

    (db.find as Mock)
      .mockResolvedValueOnce(mockOpportunities)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await forecastRevenue({ months: 2 });

    const monthWithDeal = result.monthlyForecasts.find(m => m.pipelineValue > 0);
    if (monthWithDeal) {
      expect(monthWithDeal.weightedPipeline).toBeGreaterThan(0);
      expect(monthWithDeal.weightedPipeline).toBeLessThanOrEqual(monthWithDeal.pipelineValue);
    }
  });

  it('should list key assumptions', async () => {
    (db.find as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await forecastRevenue({});

    expect(result.assumptions).toBeDefined();
    expect(result.assumptions.length).toBeGreaterThan(0);
    result.assumptions.forEach(a => {
      expect(a.factor).toBeDefined();
      expect(a.value).toBeDefined();
      expect(a.impact).toBeDefined();
    });
  });

  it('should handle filter by accountId', async () => {
    (db.find as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const request: ForecastRevenueRequest = { accountId: 'acc_filter', months: 2 };
    await forecastRevenue(request);

    const firstCall = (db.find as Mock).mock.calls[0];
    expect(firstCall[1].filters).toEqual(
      expect.arrayContaining([['account_id', '=', 'acc_filter']])
    );
  });
});

describe('Revenue Forecast - analyzeRevenueRisk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should identify pipeline concentration risk', async () => {
    const mockOpportunities = [
      { name: 'Deal A', amount: 500000, stage: 'proposal', close_date: new Date().toISOString(), probability: 50, account_id: 'acc_1', created_date: new Date().toISOString() },
      { name: 'Deal B', amount: 50000, stage: 'negotiation', close_date: new Date().toISOString(), probability: 60, account_id: 'acc_2', created_date: new Date().toISOString() },
    ];
    const mockContracts: any[] = [];

    (db.find as Mock)
      .mockResolvedValueOnce(mockOpportunities)
      .mockResolvedValueOnce(mockContracts);

    const result = await analyzeRevenueRisk({});

    expect(result.overallRisk).toBeDefined();
    expect(result.overallRisk.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.overallRisk.riskScore).toBeLessThanOrEqual(100);
    expect(['low', 'medium', 'high', 'critical']).toContain(result.overallRisk.riskLevel);
    const concRisk = result.risks.find(r => r.category === 'Customer Concentration');
    expect(concRisk).toBeDefined();
  });

  it('should detect stale pipeline opportunities', async () => {
    const staleDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(); // 120 days ago
    const mockOpportunities = [
      { name: 'Old Deal', amount: 100000, stage: 'proposal', close_date: new Date().toISOString(), probability: 50, account_id: 'acc_1', created_date: staleDate },
    ];

    (db.find as Mock)
      .mockResolvedValueOnce(mockOpportunities)
      .mockResolvedValueOnce([]);

    const result = await analyzeRevenueRisk({});

    const staleRisk = result.risks.find(r => r.category === 'Stale Pipeline');
    expect(staleRisk).toBeDefined();
    expect(staleRisk!.potentialLoss).toBe(100000);
  });

  it('should calculate at-risk revenue totals', async () => {
    const staleDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();
    const mockOpportunities = [
      { name: 'Deal A', amount: 300000, stage: 'proposal', probability: 40, account_id: 'acc_1', created_date: staleDate, close_date: new Date().toISOString() },
      { name: 'Deal B', amount: 100000, stage: 'negotiation', probability: 50, account_id: 'acc_2', created_date: staleDate, close_date: new Date().toISOString() },
    ];

    (db.find as Mock)
      .mockResolvedValueOnce(mockOpportunities)
      .mockResolvedValueOnce([]);

    const result = await analyzeRevenueRisk({});

    expect(result.atRiskRevenue.total).toBeGreaterThan(0);
    expect(result.atRiskRevenue.byCategory.length).toBeGreaterThan(0);
  });

  it('should include concentration risk details', async () => {
    const mockOpportunities = [
      { name: 'D1', amount: 100000, stage: 'proposal', probability: 50, account_id: 'acc_1', created_date: new Date().toISOString(), close_date: new Date().toISOString() },
    ];

    (db.find as Mock)
      .mockResolvedValueOnce(mockOpportunities)
      .mockResolvedValueOnce([]);

    const result = await analyzeRevenueRisk({});

    expect(result.concentrationRisks).toBeDefined();
    expect(result.concentrationRisks.length).toBeGreaterThan(0);
    expect(result.concentrationRisks[0].type).toBe('customer');
  });

  it('should handle clean pipeline with low risk', async () => {
    const recentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days ago
    const mockOpportunities = [
      { name: 'D1', amount: 50000, stage: 'prospecting', probability: 50, account_id: 'acc_1', created_date: recentDate, close_date: new Date().toISOString() },
      { name: 'D2', amount: 50000, stage: 'prospecting', probability: 50, account_id: 'acc_2', created_date: recentDate, close_date: new Date().toISOString() },
    ];

    (db.find as Mock)
      .mockResolvedValueOnce(mockOpportunities)
      .mockResolvedValueOnce([]);

    const result = await analyzeRevenueRisk({});

    expect(result.overallRisk.riskLevel).toBe('low');
  });
});

describe('Revenue Forecast - benchmarkRevenue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate historical performance metrics', async () => {
    const now = new Date();
    const mockWonOpps = [
      { name: 'Won1', amount: 100000, close_date: new Date(now.getFullYear(), now.getMonth() - 2, 15).toISOString(), created_date: new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString(), stage: 'closed_won' },
      { name: 'Won2', amount: 80000, close_date: new Date(now.getFullYear(), now.getMonth() - 1, 10).toISOString(), created_date: new Date(now.getFullYear(), now.getMonth() - 4, 1).toISOString(), stage: 'closed_won' },
    ];
    const mockAllClosed = [
      ...mockWonOpps,
      { stage: 'closed_lost', amount: 60000, close_date: new Date(now.getFullYear(), now.getMonth() - 1, 5).toISOString(), created_date: new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString() },
    ];

    (db.find as Mock)
      .mockResolvedValueOnce(mockWonOpps)
      .mockResolvedValueOnce(mockAllClosed);

    const result = await benchmarkRevenue({ months: 6 });

    expect(result.historicalPerformance.totalRevenue).toBe(180000);
    expect(result.historicalPerformance.avgMonthlyRevenue).toBe(30000);
    expect(result.metrics.winRate).toBe(67); // 2/3
  });

  it('should provide monthly trends', async () => {
    const now = new Date();
    const mockWonOpps = [
      { name: 'W1', amount: 50000, close_date: new Date(now.getFullYear(), now.getMonth() - 2, 15).toISOString(), created_date: new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString(), stage: 'closed_won' },
    ];

    (db.find as Mock)
      .mockResolvedValueOnce(mockWonOpps)
      .mockResolvedValueOnce(mockWonOpps);

    const result = await benchmarkRevenue({ months: 6 });

    expect(result.monthlyTrends.length).toBeGreaterThan(0);
    result.monthlyTrends.forEach(t => {
      expect(t.month).toBeDefined();
      expect(t.revenue).toBeGreaterThanOrEqual(0);
      expect(t.dealsWon).toBeGreaterThanOrEqual(0);
    });
  });

  it('should include industry benchmark comparisons', async () => {
    (db.find as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await benchmarkRevenue({});

    expect(result.benchmarks).toBeDefined();
    expect(result.benchmarks.industryAverage).toBeDefined();
    expect(result.benchmarks.topPerformers).toBeDefined();
    expect(result.benchmarks.topPerformers.growthRate).toBeGreaterThan(result.benchmarks.industryAverage.growthRate);
  });

  it('should generate actionable insights', async () => {
    const now = new Date();
    const mockWonOpps = [
      { name: 'W1', amount: 200000, close_date: new Date(now.getFullYear(), now.getMonth() - 1, 10).toISOString(), created_date: new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString(), stage: 'closed_won' },
    ];
    const mockAllClosed = [
      ...mockWonOpps,
      ...Array.from({ length: 8 }, (_, i) => ({
        stage: 'closed_lost', amount: 50000,
        close_date: new Date(now.getFullYear(), now.getMonth() - 1, 5).toISOString(),
        created_date: new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString()
      })),
    ];

    (db.find as Mock)
      .mockResolvedValueOnce(mockWonOpps)
      .mockResolvedValueOnce(mockAllClosed);

    const result = await benchmarkRevenue({ months: 6 });

    expect(result.insights).toBeDefined();
    expect(Array.isArray(result.insights)).toBe(true);
    // With low win rate (1/9 ≈ 11%), should get win rate insight
    const winRateInsight = result.insights.find(i => i.category === 'Win Rate');
    expect(winRateInsight).toBeDefined();
  });

  it('should handle empty dataset gracefully', async () => {
    (db.find as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await benchmarkRevenue({ months: 12 });

    expect(result.historicalPerformance.totalRevenue).toBe(0);
    expect(result.monthlyTrends).toEqual([]);
    expect(result.benchmarks.yourCompany).toBeDefined();
  });
});
