import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/db', () => ({
  broker: {
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue(null),
    insert: vi.fn().mockResolvedValue({ _id: 'rec_001' }),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(true),
    count: vi.fn().mockResolvedValue(0),
  }
}));

import { detectAnomalies, analyzeTrends, generateInsights } from '../../../src/actions/insight_ai.action';
import { broker } from '../../../src/db';
import type { Mock } from 'vitest';

describe('Insight AI Action - detectAnomalies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect anomalies in business data', async () => {
    (broker.find as Mock).mockResolvedValue([
      { amount: 50000 },
      { amount: 60000 },
      { amount: 150000 }
    ]);

    const result = await detectAnomalies({
      objectName: 'opportunity',
      field: 'amount'
    });

    expect(result).toBeDefined();
    expect(result.anomalies).toBeDefined();
    expect(Array.isArray(result.anomalies)).toBe(true);
    expect(result.summary).toBeDefined();
  });

  it('should include severity and expected range for each anomaly', async () => {
    (broker.find as Mock).mockResolvedValue([{ amount: 100000 }]);

    const result = await detectAnomalies({
      objectName: 'opportunity',
      field: 'amount'
    });

    for (const anomaly of result.anomalies) {
      expect(anomaly.severity).toBeDefined();
      expect(['low', 'medium', 'high']).toContain(anomaly.severity);
      expect(anomaly.expectedRange).toBeDefined();
      expect(anomaly.expectedRange.min).toBeDefined();
      expect(anomaly.expectedRange.max).toBeDefined();
    }
  });

  it('should call broker.find with correct object and field', async () => {
    (broker.find as Mock).mockResolvedValue([]);

    await detectAnomalies({
      objectName: 'account',
      field: 'annual_revenue',
      period: 'weekly',
      sensitivity: 3
    });

    expect(broker.find).toHaveBeenCalledWith('account', expect.objectContaining({
      fields: ['annual_revenue'],
      limit: 1000
    }));
  });

  it('should use default period and sensitivity', async () => {
    (broker.find as Mock).mockResolvedValue([]);

    const result = await detectAnomalies({
      objectName: 'opportunity',
      field: 'amount'
    });

    expect(result.summary).toContain('opportunity');
  });
});

describe('Insight AI Action - analyzeTrends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should analyze trends in business metrics', async () => {
    (broker.find as Mock).mockResolvedValue([
      { amount: 50000, close_date: '2024-01-01' },
      { amount: 60000, close_date: '2024-02-01' }
    ]);

    const result = await analyzeTrends({
      objectName: 'opportunity',
      field: 'amount',
      timeField: 'close_date'
    });

    expect(result).toBeDefined();
    expect(result.trend).toBeDefined();
    expect(['increasing', 'decreasing', 'stable', 'volatile']).toContain(result.trend);
    expect(result.changeRate).toBeDefined();
    expect(typeof result.changeRate).toBe('number');
  });

  it('should include forecast with confidence scores', async () => {
    (broker.find as Mock).mockResolvedValue([]);

    const result = await analyzeTrends({
      objectName: 'opportunity',
      field: 'amount',
      timeField: 'close_date',
      period: 'quarterly'
    });

    expect(result.forecast).toBeDefined();
    expect(Array.isArray(result.forecast)).toBe(true);
    for (const entry of result.forecast) {
      expect(entry.period).toBeDefined();
      expect(entry.predicted).toBeDefined();
      expect(entry.confidence).toBeDefined();
    }
  });

  it('should return actionable insights', async () => {
    (broker.find as Mock).mockResolvedValue([]);

    const result = await analyzeTrends({
      objectName: 'opportunity',
      field: 'amount',
      timeField: 'close_date'
    });

    expect(result.insights).toBeDefined();
    expect(Array.isArray(result.insights)).toBe(true);
    expect(result.insights.length).toBeGreaterThan(0);
  });
});

describe('Insight AI Action - generateInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate executive insights', async () => {
    const result = await generateInsights({});

    expect(result).toBeDefined();
    expect(result.insights).toBeDefined();
    expect(Array.isArray(result.insights)).toBe(true);
    expect(result.insights.length).toBeGreaterThan(0);
  });

  it('should include category, title, description and impact for each insight', async () => {
    const result = await generateInsights({ objects: ['opportunity', 'account'] });

    for (const insight of result.insights) {
      expect(insight.category).toBeDefined();
      expect(insight.title).toBeDefined();
      expect(insight.description).toBeDefined();
      expect(insight.impact).toBeDefined();
    }
  });
});
