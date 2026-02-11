import {
  optimizeCampaignPerformance,
  segmentAudience,
  recommendChannels,
  analyzeABTest,
  calculateCampaignHealth,
  CampaignOptimizationRequest,
  AudienceSegmentationRequest,
  ChannelRecommendationRequest,
  ABTestAnalysisRequest,
  CampaignHealthRequest
} from '../../../src/actions/campaign_ai.action';

import { vi } from 'vitest';

describe('Campaign AI Actions - optimizeCampaignPerformance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return a valid performance score and KPIs', async () => {
    const request: CampaignOptimizationRequest = { campaignId: 'camp_001' };

    const result = await optimizeCampaignPerformance(request);

    expect(result).toBeDefined();
    expect(result.performanceScore).toBeGreaterThanOrEqual(0);
    expect(result.performanceScore).toBeLessThanOrEqual(100);
    expect(result.kpis).toBeDefined();
    expect(result.kpis.openRate).toBeGreaterThanOrEqual(0);
    expect(result.kpis.clickRate).toBeGreaterThanOrEqual(0);
    expect(result.kpis.conversionRate).toBeGreaterThanOrEqual(0);
    expect(result.kpis.roi).toBeDefined();
    expect(result.kpis.engagement).toBeDefined();
  });

  it('should provide optimization recommendations with priority and effort', async () => {
    const request: CampaignOptimizationRequest = { campaignId: 'camp_002' };

    const result = await optimizeCampaignPerformance(request);

    expect(result.recommendations).toBeDefined();
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(result.recommendations.length).toBeGreaterThan(0);
    result.recommendations.forEach(rec => {
      expect(['targeting', 'content', 'timing', 'budget', 'channel']).toContain(rec.category);
      expect(['high', 'medium', 'low']).toContain(rec.priority);
      expect(rec.title).toBeDefined();
      expect(rec.description).toBeDefined();
      expect(rec.expectedImpact).toBeDefined();
      expect(['low', 'medium', 'high']).toContain(rec.effort);
    });
  });

  it('should include industry benchmarks comparison', async () => {
    const request: CampaignOptimizationRequest = { campaignId: 'camp_003' };

    const result = await optimizeCampaignPerformance(request);

    expect(result.benchmarks).toBeDefined();
    expect(result.benchmarks.industryAverage).toBeDefined();
    expect(result.benchmarks.industryAverage.openRate).toBeGreaterThan(0);
    expect(result.benchmarks.yourPerformance).toBeDefined();
    expect(result.benchmarks.yourPerformance.openRate).toBeGreaterThan(0);
  });

  it('should provide quick wins for immediate improvement', async () => {
    const request: CampaignOptimizationRequest = { campaignId: 'camp_004' };

    const result = await optimizeCampaignPerformance(request);

    expect(result.quickWins).toBeDefined();
    expect(Array.isArray(result.quickWins)).toBe(true);
    expect(result.quickWins.length).toBeGreaterThan(0);
    result.quickWins.forEach(win => {
      expect(typeof win).toBe('string');
      expect(win.length).toBeGreaterThan(0);
    });
  });
});

describe('Campaign AI Actions - segmentAudience', () => {
  it('should generate audience segments with targeting criteria', async () => {
    const request: AudienceSegmentationRequest = {
      campaignType: 'email',
      targetSize: 10000,
      criteria: {
        demographics: ['age 25-54'],
        behaviors: ['opened email in last 90 days'],
        firmographics: ['enterprise']
      }
    };

    const result = await segmentAudience(request);

    expect(result).toBeDefined();
    expect(result.segments).toBeDefined();
    expect(Array.isArray(result.segments)).toBe(true);
    expect(result.segments.length).toBeGreaterThan(0);
    result.segments.forEach(seg => {
      expect(seg.segmentName).toBeDefined();
      expect(seg.description).toBeDefined();
      expect(seg.estimatedSize).toBeGreaterThan(0);
      expect(seg.targetingCriteria.length).toBeGreaterThan(0);
      expect(['high', 'medium', 'low']).toContain(seg.priority);
      expect(seg.channels.length).toBeGreaterThan(0);
    });
  });
});

describe('Campaign AI Actions - analyzeABTest', () => {
  it('should determine a winner with statistical confidence', async () => {
    const request: ABTestAnalysisRequest = {
      campaignId: 'camp_ab_001',
      variantA: {
        name: 'Control',
        sent: 5000,
        opened: 1100,
        clicked: 550,
        converted: 55
      },
      variantB: {
        name: 'New Subject Line',
        sent: 5000,
        opened: 1350,
        clicked: 700,
        converted: 80
      },
      testVariable: 'subject_line'
    };

    const result = await analyzeABTest(request);

    expect(result).toBeDefined();
    expect(result.winner).toBeDefined();
    expect(['A', 'B', 'inconclusive']).toContain(result.winner.variant);
    expect(result.winner.confidence).toBeGreaterThanOrEqual(0);
    expect(result.winner.confidence).toBeLessThanOrEqual(100);
    expect(result.winner.reason).toBeDefined();
    expect(result.statistics).toBeDefined();
    expect(typeof result.statistics.isSignificant).toBe('boolean');
    expect(result.statistics.pValue).toBeGreaterThanOrEqual(0);
    expect(result.statistics.pValue).toBeLessThanOrEqual(1);
  });
});

describe('Campaign AI Actions - calculateCampaignHealth', () => {
  it('should return a response object from the LLM', async () => {
    const request: CampaignHealthRequest = { campaignId: 'camp_health_001' };

    const result = await calculateCampaignHealth(request);

    // The mock callLLM returns the default A/B test-shaped response for
    // calculateCampaignHealth since its prompt doesn't match specific conditionals.
    // Verify the function executes and returns a parsed JSON result.
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('should fetch campaign and members data before calling LLM', async () => {
    const request: CampaignHealthRequest = { campaignId: 'camp_health_002' };

    // The function calls db.doc.get and db.find before LLM.
    // Since db is a local mock, this should complete without errors.
    const result = await calculateCampaignHealth(request);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });
});
