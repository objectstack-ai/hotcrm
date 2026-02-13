import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  detectAnomalies,
  analyzeTrends,
  generateExecutiveSummary
} from '../../../src/actions/insight_ai.action';

// Mock the broker used by action functions
vi.mock('../../../src/db', () => ({
  broker: {
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue({}),
    insert: vi.fn().mockResolvedValue({ _id: 'new_001' }),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(true),
    count: vi.fn().mockResolvedValue(0)
  }
}));

// ─── detectAnomalies ───────────────────────────────────────────────────────────

describe('detectAnomalies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw when objectName is missing', async () => {
    await expect(
      detectAnomalies({ objectName: '', field: 'amount' })
    ).rejects.toThrow('objectName and field are required');
  });

  it('should throw when field is missing', async () => {
    await expect(
      detectAnomalies({ objectName: 'opportunity', field: '' })
    ).rejects.toThrow('objectName and field are required');
  });

  it('should return empty results when no records found', async () => {
    const { broker } = await import('../../../src/db');
    (broker.find as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await detectAnomalies({
      objectName: 'opportunity',
      field: 'amount'
    });

    expect(result.anomalies).toEqual([]);
    expect(result.statistics.sampleSize).toBe(0);
    expect(result.totalAnomalies).toBe(0);
  });

  it('should detect anomalies when values deviate beyond 2 std devs', async () => {
    const { broker } = await import('../../../src/db');
    // Normal values cluster around 100, outlier at 500
    const records = [
      { _id: '1', amount: 100, created_at: new Date().toISOString() },
      { _id: '2', amount: 102, created_at: new Date().toISOString() },
      { _id: '3', amount: 98, created_at: new Date().toISOString() },
      { _id: '4', amount: 101, created_at: new Date().toISOString() },
      { _id: '5', amount: 99, created_at: new Date().toISOString() },
      { _id: '6', amount: 500, created_at: new Date().toISOString() }
    ];
    (broker.find as ReturnType<typeof vi.fn>).mockResolvedValue(records);

    const result = await detectAnomalies({
      objectName: 'opportunity',
      field: 'amount',
      timeRangeDays: 30
    });

    expect(result.statistics.sampleSize).toBe(6);
    expect(result.statistics.mean).toBeGreaterThan(0);
    expect(result.statistics.stdDev).toBeGreaterThan(0);
    expect(result.totalAnomalies).toBeGreaterThanOrEqual(1);
    expect(result.anomalies.length).toBe(result.totalAnomalies);

    for (const anomaly of result.anomalies) {
      expect(anomaly.recordId).toBeDefined();
      expect(anomaly.severity).toMatch(/^(low|medium|high)$/);
      expect(anomaly.expectedRange.min).toBeDefined();
      expect(anomaly.expectedRange.max).toBeDefined();
    }
  });

  it('should return empty anomalies when all values are similar', async () => {
    const { broker } = await import('../../../src/db');
    const records = [
      { _id: '1', amount: 100, created_at: new Date().toISOString() },
      { _id: '2', amount: 101, created_at: new Date().toISOString() },
      { _id: '3', amount: 99, created_at: new Date().toISOString() }
    ];
    (broker.find as ReturnType<typeof vi.fn>).mockResolvedValue(records);

    const result = await detectAnomalies({
      objectName: 'account',
      field: 'amount'
    });

    expect(result.totalAnomalies).toBe(0);
  });

  it('should handle non-numeric field values gracefully', async () => {
    const { broker } = await import('../../../src/db');
    const records = [
      { _id: '1', status: 'open', created_at: new Date().toISOString() },
      { _id: '2', status: 'closed', created_at: new Date().toISOString() }
    ];
    (broker.find as ReturnType<typeof vi.fn>).mockResolvedValue(records);

    const result = await detectAnomalies({
      objectName: 'case',
      field: 'status'
    });

    expect(result.statistics.sampleSize).toBe(0);
    expect(result.totalAnomalies).toBe(0);
  });
});

// ─── analyzeTrends ─────────────────────────────────────────────────────────────

describe('analyzeTrends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty results when no metrics found', async () => {
    const { broker } = await import('../../../src/db');
    (broker.find as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await analyzeTrends({});

    expect(result.trends).toEqual([]);
    expect(result.correlations).toEqual([]);
    expect(result.summary).toContain('No metrics found');
  });

  it('should analyse trends for specific metric IDs', async () => {
    const { broker } = await import('../../../src/db');
    (broker.findOne as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        _id: 'met_001',
        name: 'Monthly Revenue',
        aggregation_type: 'sum',
        source_object: 'opportunity',
        time_grain: 'monthly'
      })
      .mockResolvedValueOnce({
        _id: 'met_002',
        name: 'Customer Churn Rate',
        aggregation_type: 'avg',
        source_object: 'account',
        time_grain: 'monthly'
      });

    const result = await analyzeTrends({
      metricIds: ['met_001', 'met_002'],
      timeRangeDays: 90
    });

    expect(result.trends).toBeInstanceOf(Array);
    expect(result.trends.length).toBeGreaterThan(0);
    expect(result.summary).toBeDefined();
  });

  it('should return trend results with required properties', async () => {
    const { broker } = await import('../../../src/db');
    (broker.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: 'met_001',
      name: 'Revenue',
      aggregation_type: 'sum',
      source_object: 'opportunity'
    });

    const result = await analyzeTrends({ metricIds: ['met_001'] });

    for (const trend of result.trends) {
      expect(trend.metricId).toBeDefined();
      expect(trend.metricName).toBeDefined();
      expect(trend.trend).toMatch(/^(increasing|decreasing|stable|volatile)$/);
      expect(typeof trend.changePercent).toBe('number');
      expect(trend.insights).toBeInstanceOf(Array);
    }
  });
});

// ─── generateExecutiveSummary ──────────────────────────────────────────────────

describe('generateExecutiveSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate summary with default monthly period', async () => {
    const { broker } = await import('../../../src/db');
    (broker.find as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([
        { _id: 'kpi_001', name: 'Revenue', current_value: 1200000, target_value: 1000000, trend: 'up' }
      ])
      .mockResolvedValueOnce([
        { _id: 'met_001', name: 'Win Rate', aggregation_type: 'avg', source_object: 'opportunity', formula: 'win_rate' }
      ]);

    const result = await generateExecutiveSummary({});

    expect(result.summary).toBeDefined();
    expect(typeof result.summary).toBe('string');
    expect(result.highlights).toBeInstanceOf(Array);
    expect(result.risks).toBeInstanceOf(Array);
    expect(result.recommendations).toBeInstanceOf(Array);
  });

  it('should return highlights with required properties', async () => {
    const { broker } = await import('../../../src/db');
    (broker.find as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ _id: 'kpi_001', name: 'Revenue', current_value: 100, target_value: 200, trend: 'up' }])
      .mockResolvedValueOnce([]);

    const result = await generateExecutiveSummary({ period: 'quarterly' });

    for (const highlight of result.highlights) {
      expect(highlight.category).toBeDefined();
      expect(highlight.metric).toBeDefined();
      expect(highlight.value).toBeDefined();
      expect(highlight.trend).toMatch(/^(up|down|flat)$/);
      expect(highlight.commentary).toBeDefined();
    }
  });

  it('should return risks with severity levels', async () => {
    const { broker } = await import('../../../src/db');
    (broker.find as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await generateExecutiveSummary({ period: 'weekly' });

    for (const risk of result.risks) {
      expect(risk.area).toBeDefined();
      expect(risk.severity).toMatch(/^(low|medium|high)$/);
      expect(risk.description).toBeDefined();
      expect(risk.recommendation).toBeDefined();
    }
  });

  it('should accept specific KPI IDs', async () => {
    const { broker } = await import('../../../src/db');
    (broker.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: 'kpi_001',
      name: 'Pipeline',
      current_value: 500000,
      target_value: 400000,
      trend: 'up'
    });
    (broker.find as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await generateExecutiveSummary({
      period: 'monthly',
      kpiIds: ['kpi_001']
    });

    expect(result.summary).toBeDefined();
    expect(result.recommendations).toBeInstanceOf(Array);
  });
});
