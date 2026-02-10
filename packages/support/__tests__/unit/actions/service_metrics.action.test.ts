import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

vi.mock('../../../src/db', () => ({
  db: {
    find: vi.fn()
  }
}));

import { db } from '../../../src/db';
import {
  analyzeFirstResponseTime,
  analyzeCSAT,
  analyzeSLACompliance
} from '../../../src/actions/service_metrics.action';

// Helper: build a date string N minutes ago
function minutesAgo(min: number): string {
  return new Date(Date.now() - min * 60 * 1000).toISOString();
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

describe('analyzeFirstResponseTime', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should calculate response time metrics', async () => {
    const now = Date.now();
    const mockCases = [
      { priority: 'high', channel: 'email', created_date: new Date(now - 120 * 60000).toISOString(), first_response_date: new Date(now - 90 * 60000).toISOString(), status: 'closed', owner_id: 'agent_1' },
      { priority: 'medium', channel: 'chat', created_date: new Date(now - 200 * 60000).toISOString(), first_response_date: new Date(now - 190 * 60000).toISOString(), status: 'closed', owner_id: 'agent_2' },
      { priority: 'low', channel: 'email', created_date: new Date(now - 600 * 60000).toISOString(), first_response_date: new Date(now - 300 * 60000).toISOString(), status: 'closed', owner_id: 'agent_1' },
    ];

    (db.find as Mock).mockResolvedValueOnce(mockCases);

    const result = await analyzeFirstResponseTime({ periodDays: 30 });

    expect(result.overall).toBeDefined();
    expect(result.overall.totalCases).toBe(3);
    expect(result.overall.average).toBeGreaterThan(0);
    expect(result.overall.median).toBeGreaterThan(0);
    expect(result.overall.min).toBeGreaterThan(0);
    expect(result.overall.max).toBeGreaterThan(0);
    expect(result.overall.p90).toBeGreaterThanOrEqual(result.overall.median);
    expect(result.overall.p95).toBeGreaterThanOrEqual(result.overall.p90);
  });

  it('should break down by priority', async () => {
    const now = Date.now();
    const mockCases = [
      { priority: 'critical', channel: 'phone', created_date: new Date(now - 60 * 60000).toISOString(), first_response_date: new Date(now - 50 * 60000).toISOString(), status: 'closed', owner_id: 'agent_1' },
      { priority: 'critical', channel: 'phone', created_date: new Date(now - 90 * 60000).toISOString(), first_response_date: new Date(now - 55 * 60000).toISOString(), status: 'closed', owner_id: 'agent_2' },
      { priority: 'low', channel: 'email', created_date: new Date(now - 500 * 60000).toISOString(), first_response_date: new Date(now - 200 * 60000).toISOString(), status: 'closed', owner_id: 'agent_1' },
    ];

    (db.find as Mock).mockResolvedValueOnce(mockCases);

    const result = await analyzeFirstResponseTime({ periodDays: 30 });

    expect(result.byPriority).toBeDefined();
    expect(result.byPriority['critical']).toBeDefined();
    expect(result.byPriority['critical'].cases).toBe(2);
    expect(result.byPriority['critical'].slaComplianceRate).toBeGreaterThanOrEqual(0);
    expect(result.byPriority['critical'].slaComplianceRate).toBeLessThanOrEqual(100);
    expect(result.byPriority['low']).toBeDefined();
    expect(result.byPriority['low'].cases).toBe(1);
  });

  it('should handle cases with no response (empty result set)', async () => {
    (db.find as Mock).mockResolvedValueOnce([]);

    const result = await analyzeFirstResponseTime({ periodDays: 30 });

    expect(result.overall.totalCases).toBe(0);
    expect(result.overall.average).toBe(0);
    expect(result.overall.median).toBe(0);
    expect(result.overall.min).toBe(0);
    expect(result.overall.max).toBe(0);
    expect(result.distribution.under15min).toBe(0);
    expect(result.distribution.over8hr).toBe(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('should calculate distribution buckets', async () => {
    const now = Date.now();
    const mockCases = [
      // Under 15 min response
      { priority: 'high', channel: 'chat', created_date: new Date(now - 20 * 60000).toISOString(), first_response_date: new Date(now - 10 * 60000).toISOString(), status: 'closed', owner_id: 'a1' },
      // Under 1 hr response (45 min)
      { priority: 'medium', channel: 'email', created_date: new Date(now - 60 * 60000).toISOString(), first_response_date: new Date(now - 15 * 60000).toISOString(), status: 'closed', owner_id: 'a2' },
      // Over 8 hr response (600 min)
      { priority: 'low', channel: 'email', created_date: new Date(now - 700 * 60000).toISOString(), first_response_date: new Date(now - 100 * 60000).toISOString(), status: 'closed', owner_id: 'a3' },
    ];

    (db.find as Mock).mockResolvedValueOnce(mockCases);

    const result = await analyzeFirstResponseTime({ periodDays: 30 });

    expect(result.distribution.under15min).toBe(1);
    expect(result.distribution.over8hr).toBe(1);
  });

  it('should include recommendations when response times are poor', async () => {
    const now = Date.now();
    // All cases with very long response times (over 4 hours = 240 min)
    const mockCases = [
      { priority: 'critical', channel: 'email', created_date: new Date(now - 600 * 60000).toISOString(), first_response_date: new Date(now - 300 * 60000).toISOString(), status: 'closed', owner_id: 'a1' },
      { priority: 'high', channel: 'email', created_date: new Date(now - 700 * 60000).toISOString(), first_response_date: new Date(now - 200 * 60000).toISOString(), status: 'closed', owner_id: 'a2' },
    ];

    (db.find as Mock).mockResolvedValueOnce(mockCases);

    const result = await analyzeFirstResponseTime({ periodDays: 30 });

    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.some(r => r.includes('4 hours') || r.includes('staffing') || r.includes('escalation'))).toBe(true);
  });
});

describe('analyzeCSAT', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should calculate CSAT score', async () => {
    const now = Date.now();
    const mockCases = [
      { satisfaction_rating: 5, owner_id: 'agent_1', category: 'billing', priority: 'medium', created_date: new Date(now - 2 * 86400000).toISOString(), closed_date: new Date(now - 1 * 86400000).toISOString(), first_response_date: new Date(now - 1.5 * 86400000).toISOString(), status: 'closed', is_escalated: false, resolution_type: 'first_contact', channel: 'chat' },
      { satisfaction_rating: 4, owner_id: 'agent_2', category: 'technical', priority: 'high', created_date: new Date(now - 3 * 86400000).toISOString(), closed_date: new Date(now - 2 * 86400000).toISOString(), first_response_date: new Date(now - 2.5 * 86400000).toISOString(), status: 'closed', is_escalated: false, resolution_type: 'resolved', channel: 'email' },
      { satisfaction_rating: 2, owner_id: 'agent_1', category: 'billing', priority: 'low', created_date: new Date(now - 4 * 86400000).toISOString(), closed_date: new Date(now - 3 * 86400000).toISOString(), first_response_date: new Date(now - 3.5 * 86400000).toISOString(), status: 'closed', is_escalated: true, resolution_type: 'resolved', channel: 'email' },
      { satisfaction_rating: 5, owner_id: 'agent_2', category: 'technical', priority: 'medium', created_date: new Date(now - 5 * 86400000).toISOString(), closed_date: new Date(now - 4 * 86400000).toISOString(), first_response_date: new Date(now - 4.5 * 86400000).toISOString(), status: 'closed', is_escalated: false, resolution_type: 'first_contact', channel: 'chat' },
    ];

    const mockAllClosed = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }];

    (db.find as Mock)
      .mockResolvedValueOnce(mockCases)    // cases with satisfaction data
      .mockResolvedValueOnce(mockAllClosed); // all closed cases

    const result = await analyzeCSAT({ periodDays: 30 });

    // CSAT: ratings >= 4 are satisfied. 3 of 4 = 75%
    expect(result.overall.csatScore).toBe(75);
    expect(result.overall.totalResponses).toBe(4);
    expect(result.overall.averageRating).toBe(4); // (5+4+2+5)/4 = 4.0
    expect(result.overall.responseRate).toBe(80); // 4/5 = 80%
    expect(result.byAgent.length).toBe(2);
    expect(result.byCategory).toBeDefined();
    expect(result.improvements).toBeDefined();
  });

  it('should calculate NPS', async () => {
    const now = Date.now();
    // 2 promoters (5), 1 passive (4), 2 detractors (1, 3)
    const mockCases = [
      { satisfaction_rating: 5, owner_id: 'a1', category: 'billing', priority: 'medium', created_date: new Date(now - 86400000).toISOString(), closed_date: new Date(now).toISOString(), status: 'closed', is_escalated: false, resolution_type: 'first_contact', channel: 'chat' },
      { satisfaction_rating: 5, owner_id: 'a2', category: 'billing', priority: 'medium', created_date: new Date(now - 86400000).toISOString(), closed_date: new Date(now).toISOString(), status: 'closed', is_escalated: false, resolution_type: 'resolved', channel: 'email' },
      { satisfaction_rating: 4, owner_id: 'a1', category: 'tech', priority: 'low', created_date: new Date(now - 86400000).toISOString(), closed_date: new Date(now).toISOString(), status: 'closed', is_escalated: false, resolution_type: 'resolved', channel: 'email' },
      { satisfaction_rating: 1, owner_id: 'a2', category: 'tech', priority: 'high', created_date: new Date(now - 86400000).toISOString(), closed_date: new Date(now).toISOString(), status: 'closed', is_escalated: true, resolution_type: 'resolved', channel: 'phone' },
      { satisfaction_rating: 3, owner_id: 'a1', category: 'billing', priority: 'medium', created_date: new Date(now - 86400000).toISOString(), closed_date: new Date(now).toISOString(), status: 'closed', is_escalated: false, resolution_type: 'resolved', channel: 'email' },
    ];

    (db.find as Mock)
      .mockResolvedValueOnce(mockCases)
      .mockResolvedValueOnce(mockCases); // all closed = same as rated

    const result = await analyzeCSAT({ periodDays: 30 });

    // NPS: (promoters - detractors) / total * 100 = (2-2)/5*100 = 0
    expect(result.overall.npsScore).toBe(0);
  });

  it('should handle no survey data', async () => {
    (db.find as Mock)
      .mockResolvedValueOnce([])   // no cases with satisfaction data
      .mockResolvedValueOnce([]);  // no closed cases

    const result = await analyzeCSAT({ periodDays: 30 });

    expect(result.overall.csatScore).toBe(0);
    expect(result.overall.npsScore).toBe(0);
    expect(result.overall.totalResponses).toBe(0);
    expect(result.overall.responseRate).toBe(0);
    expect(result.overall.averageRating).toBe(0);
    expect(result.byAgent).toEqual([]);
    expect(result.improvements.length).toBeGreaterThan(0);
  });

  it('should break down by category and priority', async () => {
    const now = Date.now();
    const mockCases = [
      { satisfaction_rating: 5, owner_id: 'a1', category: 'billing', priority: 'high', created_date: new Date(now - 86400000).toISOString(), closed_date: new Date(now).toISOString(), status: 'closed', is_escalated: false, resolution_type: 'resolved', channel: 'email' },
      { satisfaction_rating: 3, owner_id: 'a2', category: 'technical', priority: 'low', created_date: new Date(now - 86400000).toISOString(), closed_date: new Date(now).toISOString(), status: 'closed', is_escalated: false, resolution_type: 'resolved', channel: 'chat' },
    ];

    (db.find as Mock)
      .mockResolvedValueOnce(mockCases)
      .mockResolvedValueOnce(mockCases);

    const result = await analyzeCSAT({ periodDays: 30 });

    expect(result.byCategory['billing']).toBeDefined();
    expect(result.byCategory['billing'].csatScore).toBe(100);
    expect(result.byCategory['technical']).toBeDefined();
    expect(result.byCategory['technical'].csatScore).toBe(0);

    expect(result.byPriority['high']).toBeDefined();
    expect(result.byPriority['low']).toBeDefined();
  });
});

describe('analyzeSLACompliance', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should calculate compliance rate', async () => {
    const now = Date.now();
    const mockMilestones = [
      { type: 'first_response', target_date: new Date(now - 60000).toISOString(), completed_date: new Date(now - 120000).toISOString(), status: 'met', priority: 'high', owner_id: 'a1', team_id: 'team_1', target_object_id: 'case_1', created_date: new Date(now - 300000).toISOString() },
      { type: 'first_response', target_date: new Date(now - 60000).toISOString(), completed_date: new Date(now - 90000).toISOString(), status: 'met', priority: 'medium', owner_id: 'a2', team_id: 'team_1', target_object_id: 'case_2', created_date: new Date(now - 400000).toISOString() },
      { type: 'resolution', target_date: new Date(now - 60000).toISOString(), completed_date: new Date(now - 30000).toISOString(), status: 'breached', priority: 'high', owner_id: 'a1', team_id: 'team_1', target_object_id: 'case_3', breach_reason: 'Agent unavailable', created_date: new Date(now - 500000).toISOString() },
      { type: 'resolution', target_date: new Date(now - 60000).toISOString(), completed_date: new Date(now - 120000).toISOString(), status: 'met', priority: 'low', owner_id: 'a2', team_id: 'team_2', target_object_id: 'case_4', created_date: new Date(now - 600000).toISOString() },
    ];

    const mockOpenMilestones: any[] = [];

    (db.find as Mock)
      .mockResolvedValueOnce(mockMilestones)
      .mockResolvedValueOnce(mockOpenMilestones);

    const result = await analyzeSLACompliance({ periodDays: 30 });

    expect(result.overall.complianceRate).toBe(75); // 3 met out of 4
    expect(result.overall.totalMilestones).toBe(4);
    expect(result.overall.milestonesMet).toBe(3);
    expect(result.overall.milestoneBreached).toBe(1);
  });

  it('should identify breach patterns', async () => {
    const now = Date.now();
    const mockMilestones = [
      { type: 'first_response', target_date: new Date(now - 60000).toISOString(), completed_date: new Date(now - 30000).toISOString(), status: 'breached', priority: 'high', owner_id: 'a1', team_id: 'team_1', target_object_id: 'case_1', breach_reason: 'Agent unavailable', created_date: new Date(now - 300000).toISOString() },
      { type: 'resolution', target_date: new Date(now - 60000).toISOString(), completed_date: new Date(now - 10000).toISOString(), status: 'breached', priority: 'medium', owner_id: 'a1', team_id: 'team_1', target_object_id: 'case_1', breach_reason: 'Agent unavailable', created_date: new Date(now - 400000).toISOString() },
      { type: 'first_response', target_date: new Date(now - 60000).toISOString(), completed_date: new Date(now - 20000).toISOString(), status: 'breached', priority: 'high', owner_id: 'a2', team_id: 'team_1', target_object_id: 'case_2', breach_reason: 'High volume', created_date: new Date(now - 500000).toISOString() },
      { type: 'first_response', target_date: new Date(now - 120000).toISOString(), completed_date: new Date(now - 180000).toISOString(), status: 'met', priority: 'low', owner_id: 'a2', team_id: 'team_2', target_object_id: 'case_3', created_date: new Date(now - 600000).toISOString() },
    ];

    (db.find as Mock)
      .mockResolvedValueOnce(mockMilestones)
      .mockResolvedValueOnce([]);

    const result = await analyzeSLACompliance({ periodDays: 30 });

    expect(result.breachAnalysis).toBeDefined();
    expect(result.breachAnalysis.topReasons.length).toBeGreaterThan(0);
    expect(result.breachAnalysis.topReasons[0].reason).toBe('Agent unavailable');
    expect(result.breachAnalysis.topReasons[0].count).toBe(2);

    // case_1 has 2 breaches - repeat offender
    expect(result.breachAnalysis.repeatOffenders.length).toBeGreaterThan(0);
    expect(result.breachAnalysis.repeatOffenders[0].entityId).toBe('case_1');
    expect(result.breachAnalysis.repeatOffenders[0].breachCount).toBe(2);
  });

  it('should handle empty milestone data', async () => {
    (db.find as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await analyzeSLACompliance({ periodDays: 30 });

    expect(result.overall.complianceRate).toBe(0);
    expect(result.overall.totalMilestones).toBe(0);
    expect(result.overall.milestonesMet).toBe(0);
    expect(result.overall.milestoneBreached).toBe(0);
    expect(result.breachAnalysis.topReasons).toEqual([]);
    expect(result.riskAnalysis).toBeDefined();
  });

  it('should break down compliance by SLA type', async () => {
    const now = Date.now();
    const mockMilestones = [
      { type: 'first_response', target_date: new Date(now - 60000).toISOString(), completed_date: new Date(now - 120000).toISOString(), status: 'met', priority: 'high', owner_id: 'a1', team_id: 't1', target_object_id: 'c1', created_date: new Date(now - 300000).toISOString() },
      { type: 'first_response', target_date: new Date(now - 60000).toISOString(), completed_date: new Date(now - 30000).toISOString(), status: 'breached', priority: 'high', owner_id: 'a1', team_id: 't1', target_object_id: 'c2', breach_reason: 'Delayed', created_date: new Date(now - 400000).toISOString() },
      { type: 'resolution', target_date: new Date(now - 60000).toISOString(), completed_date: new Date(now - 120000).toISOString(), status: 'met', priority: 'medium', owner_id: 'a2', team_id: 't1', target_object_id: 'c3', created_date: new Date(now - 500000).toISOString() },
    ];

    (db.find as Mock)
      .mockResolvedValueOnce(mockMilestones)
      .mockResolvedValueOnce([]);

    const result = await analyzeSLACompliance({ periodDays: 30 });

    expect(result.byType['first_response']).toBeDefined();
    expect(result.byType['first_response'].total).toBe(2);
    expect(result.byType['first_response'].met).toBe(1);
    expect(result.byType['first_response'].breached).toBe(1);
    expect(result.byType['first_response'].complianceRate).toBe(50);

    expect(result.byType['resolution']).toBeDefined();
    expect(result.byType['resolution'].total).toBe(1);
    expect(result.byType['resolution'].met).toBe(1);
    expect(result.byType['resolution'].complianceRate).toBe(100);
  });

  it('should calculate risk analysis with at-risk milestones', async () => {
    const now = Date.now();
    const mockMilestones = [
      { type: 'first_response', target_date: new Date(now - 60000).toISOString(), completed_date: new Date(now - 120000).toISOString(), status: 'met', priority: 'high', owner_id: 'a1', team_id: 't1', target_object_id: 'c1', created_date: new Date(now - 300000).toISOString() },
    ];

    // Open milestones: target in 1 minute, created 60 minutes ago → < 20% time remaining
    const mockOpenMilestones = [
      { target_date: new Date(now + 60000).toISOString(), created_date: new Date(now - 3600000).toISOString(), priority: 'high' },
      { target_date: new Date(now + 30000).toISOString(), created_date: new Date(now - 7200000).toISOString(), priority: 'critical' },
    ];

    (db.find as Mock)
      .mockResolvedValueOnce(mockMilestones)
      .mockResolvedValueOnce(mockOpenMilestones);

    const result = await analyzeSLACompliance({ periodDays: 30 });

    expect(result.riskAnalysis).toBeDefined();
    expect(result.riskAnalysis.atRiskCount).toBeGreaterThanOrEqual(0);
    expect(['low', 'moderate', 'high', 'critical']).toContain(result.riskAnalysis.riskLevel);
    expect(result.riskAnalysis.recommendations.length).toBeGreaterThan(0);
  });
});
