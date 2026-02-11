import {
  analyzeAttribution,
  analyzeROI,
  optimizeFunnel,
  scoreLeadsPredictively,
  benchmarkPerformance,
  AttributionAnalysisRequest,
  ROIAnalysisRequest,
  FunnelOptimizationRequest,
  PredictiveLeadScoringRequest,
  BenchmarkingRequest
} from '../../../src/actions/marketing_analytics.action';

import { vi } from 'vitest';

describe('Marketing Analytics Actions - analyzeAttribution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return channel attribution with revenue and ROI', async () => {
    const request: AttributionAnalysisRequest = {
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      model: 'linear'
    };

    const result = await analyzeAttribution(request);

    expect(result).toBeDefined();
    expect(result.channelAttribution).toBeDefined();
    expect(Array.isArray(result.channelAttribution)).toBe(true);
    expect(result.channelAttribution.length).toBeGreaterThan(0);
    result.channelAttribution.forEach(ch => {
      expect(ch.channel).toBeDefined();
      expect(ch.touches).toBeGreaterThanOrEqual(0);
      expect(ch.conversions).toBeGreaterThanOrEqual(0);
      expect(ch.attributedRevenue).toBeGreaterThanOrEqual(0);
      expect(ch.roi).toBeDefined();
    });
  });

  it('should provide actionable insights with impact descriptions', async () => {
    const request: AttributionAnalysisRequest = {
      startDate: '2024-01-01',
      endDate: '2024-06-30'
    };

    const result = await analyzeAttribution(request);

    expect(result.insights).toBeDefined();
    expect(Array.isArray(result.insights)).toBe(true);
    expect(result.insights.length).toBeGreaterThan(0);
    result.insights.forEach(insight => {
      expect(['opportunity', 'warning', 'trend']).toContain(insight.type);
      expect(insight.message).toBeDefined();
      expect(insight.message.length).toBeGreaterThan(0);
      expect(insight.impact).toBeDefined();
    });
  });
});

describe('Marketing Analytics Actions - analyzeROI', () => {
  it('should return a parsed response from the LLM', async () => {
    const request: ROIAnalysisRequest = {
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      forecastMonths: 6
    };

    const result = await analyzeROI(request);

    // The mock callLLM returns a generic channelAttribution response for all functions.
    // Verify function executes and returns a parsed JSON result.
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });
});

describe('Marketing Analytics Actions - optimizeFunnel', () => {
  it('should return a parsed response for funnel analysis', async () => {
    const request: FunnelOptimizationRequest = {
      startDate: '2024-01-01',
      endDate: '2024-03-31'
    };

    const result = await optimizeFunnel(request);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });
});

describe('Marketing Analytics Actions - scoreLeadsPredictively', () => {
  it('should return a parsed response for lead scoring', async () => {
    const request: PredictiveLeadScoringRequest = {
      leadId: 'lead_001',
      modelVersion: 'v1.0'
    };

    const result = await scoreLeadsPredictively(request);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });
});

describe('Marketing Analytics Actions - benchmarkPerformance', () => {
  it('should return a parsed response for benchmarking', async () => {
    const request: BenchmarkingRequest = {
      industry: 'technology',
      campaignType: 'email'
    };

    const result = await benchmarkPerformance(request);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });
});
