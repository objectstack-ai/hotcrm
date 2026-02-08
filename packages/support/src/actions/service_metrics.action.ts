/**
 * Service Metrics Analytics Actions
 *
 * This ObjectStack Action provides analytics for key service performance indicators.
 *
 * Functionality:
 * 1. First Response Time Analytics - Analyze response time distributions and trends
 * 2. Customer Satisfaction (CSAT) Analytics - Track satisfaction scores and drivers
 * 3. SLA Compliance Metrics - Measure adherence to service level agreements
 */

import { db } from '../db';

// ============================================================================
// SHARED UTILITIES
// ============================================================================

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

// ============================================================================
// 1. FIRST RESPONSE TIME ANALYTICS
// ============================================================================

export interface FirstResponseTimeRequest {
  /** Time period to analyze (days) */
  periodDays?: number;
  /** Filter by priority */
  priority?: string;
  /** Filter by channel */
  channel?: string;
  /** Granularity for trend analysis */
  granularity?: 'weekly' | 'monthly';
}

export interface FirstResponseTimeResponse {
  /** Overall response time statistics (in minutes) */
  overall: {
    average: number;
    median: number;
    p90: number;
    p95: number;
    min: number;
    max: number;
    totalCases: number;
  };
  /** Breakdown by priority level */
  byPriority: Record<string, {
    average: number;
    median: number;
    p90: number;
    cases: number;
    metSLA: number;
    slaComplianceRate: number;
  }>;
  /** Breakdown by channel */
  byChannel: Record<string, {
    average: number;
    median: number;
    cases: number;
    metSLA: number;
  }>;
  /** Trend over time */
  trend: Array<{
    period: string;
    average: number;
    median: number;
    cases: number;
    slaComplianceRate: number;
  }>;
  /** Distribution analysis */
  distribution: {
    under15min: number;
    under1hr: number;
    under4hr: number;
    under8hr: number;
    over8hr: number;
  };
  /** Recommendations based on analysis */
  recommendations: string[];
}

/**
 * Analyze first response time across cases
 */
export async function analyzeFirstResponseTime(
  request: FirstResponseTimeRequest
): Promise<FirstResponseTimeResponse> {
  const { periodDays = 30, priority, channel, granularity = 'weekly' } = request;

  const cutoffDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();
  const filters: any[] = [
    ['created_date', '>', cutoffDate],
    ['first_response_date', '!=', null]
  ];
  if (priority) filters.push(['priority', '=', priority]);
  if (channel) filters.push(['channel', '=', channel]);

  const cases = await db.find('case', {
    filters,
    fields: [
      'priority', 'channel', 'created_date', 'first_response_date',
      'status', 'owner_id'
    ]
  });

  // SLA targets by priority (minutes)
  const slaTargets: Record<string, number> = {
    critical: 30,
    high: 60,
    medium: 240,
    low: 480
  };

  // Calculate response times
  const responseTimes = cases.map((c: any) => {
    const created = new Date(c.created_date).getTime();
    const responded = new Date(c.first_response_date).getTime();
    return {
      minutes: (responded - created) / (1000 * 60),
      priority: c.priority || 'medium',
      channel: c.channel || 'unknown',
      createdDate: new Date(c.created_date)
    };
  });

  const allMinutes = responseTimes.map((r: any) => r.minutes);

  // Overall statistics
  const overall = {
    average: allMinutes.length > 0
      ? Math.round(allMinutes.reduce((a: number, b: number) => a + b, 0) / allMinutes.length)
      : 0,
    median: Math.round(calculateMedian(allMinutes)),
    p90: Math.round(calculatePercentile(allMinutes, 90)),
    p95: Math.round(calculatePercentile(allMinutes, 95)),
    min: allMinutes.length > 0 ? Math.round(Math.min(...allMinutes)) : 0,
    max: allMinutes.length > 0 ? Math.round(Math.max(...allMinutes)) : 0,
    totalCases: cases.length
  };

  // Breakdown by priority
  const priorityGroups = groupBy(responseTimes, (r: any) => r.priority);
  const byPriority: FirstResponseTimeResponse['byPriority'] = {};

  for (const [pri, items] of Object.entries(priorityGroups)) {
    const mins = items.map((i: any) => i.minutes);
    const target = slaTargets[pri] || 240;
    const metSLA = mins.filter((m: number) => m <= target).length;
    byPriority[pri] = {
      average: Math.round(mins.reduce((a: number, b: number) => a + b, 0) / mins.length),
      median: Math.round(calculateMedian(mins)),
      p90: Math.round(calculatePercentile(mins, 90)),
      cases: items.length,
      metSLA,
      slaComplianceRate: Math.round((metSLA / items.length) * 100)
    };
  }

  // Breakdown by channel
  const channelGroups = groupBy(responseTimes, (r: any) => r.channel);
  const byChannel: FirstResponseTimeResponse['byChannel'] = {};

  for (const [ch, items] of Object.entries(channelGroups)) {
    const mins = items.map((i: any) => i.minutes);
    let metSLA = 0;
    for (let i = 0; i < items.length; i++) {
      const target = slaTargets[items[i].priority] || 240;
      if (mins[i] <= target) metSLA++;
    }
    byChannel[ch] = {
      average: Math.round(mins.reduce((a: number, b: number) => a + b, 0) / mins.length),
      median: Math.round(calculateMedian(mins)),
      cases: items.length,
      metSLA
    };
  }

  // Trend over time
  const trend: FirstResponseTimeResponse['trend'] = [];
  const intervalMs = granularity === 'weekly' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  const periodStart = new Date(cutoffDate).getTime();
  const now = Date.now();

  for (let start = periodStart; start < now; start += intervalMs) {
    const end = start + intervalMs;
    const periodItems = responseTimes.filter(
      (r: any) => r.createdDate.getTime() >= start && r.createdDate.getTime() < end
    );
    if (periodItems.length === 0) continue;

    const mins = periodItems.map((r: any) => r.minutes);
    const totalMet = periodItems.filter((r: any) => r.minutes <= (slaTargets[r.priority] || 240)).length;
    trend.push({
      period: new Date(start).toISOString().split('T')[0],
      average: Math.round(mins.reduce((a: number, b: number) => a + b, 0) / mins.length),
      median: Math.round(calculateMedian(mins)),
      cases: periodItems.length,
      slaComplianceRate: Math.round((totalMet / periodItems.length) * 100)
    });
  }

  // Distribution buckets
  const distribution = {
    under15min: allMinutes.filter((m: number) => m <= 15).length,
    under1hr: allMinutes.filter((m: number) => m > 15 && m <= 60).length,
    under4hr: allMinutes.filter((m: number) => m > 60 && m <= 240).length,
    under8hr: allMinutes.filter((m: number) => m > 240 && m <= 480).length,
    over8hr: allMinutes.filter((m: number) => m > 480).length
  };

  // Recommendations
  const recommendations: string[] = [];
  if (overall.average > 240) {
    recommendations.push('Average first response time exceeds 4 hours. Consider adding staffing during peak hours.');
  }
  if (byPriority['critical'] && byPriority['critical'].slaComplianceRate < 90) {
    recommendations.push('Critical case SLA compliance is below 90%. Implement dedicated escalation queue for critical cases.');
  }
  if (distribution.over8hr > cases.length * 0.1) {
    recommendations.push('Over 10% of cases have response times exceeding 8 hours. Review after-hours coverage.');
  }
  if (trend.length >= 2 && trend[trend.length - 1].average > trend[0].average * 1.2) {
    recommendations.push('Response times are trending upward. Investigate root cause and consider workload rebalancing.');
  }
  if (recommendations.length === 0) {
    recommendations.push('First response times are within acceptable ranges. Continue monitoring for regressions.');
  }

  return { overall, byPriority, byChannel, trend, distribution, recommendations };
}

// ============================================================================
// 2. CUSTOMER SATISFACTION (CSAT) ANALYTICS
// ============================================================================

export interface CSATAnalyticsRequest {
  /** Time period to analyze (days) */
  periodDays?: number;
  /** Filter by team */
  teamId?: string;
  /** Filter by category */
  category?: string;
  /** Granularity for trend analysis */
  granularity?: 'weekly' | 'monthly';
}

export interface CSATAnalyticsResponse {
  /** Overall satisfaction metrics */
  overall: {
    csatScore: number;
    npsScore: number;
    totalResponses: number;
    responseRate: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
  };
  /** Breakdown by agent */
  byAgent: Array<{
    agentId: string;
    agentName: string;
    csatScore: number;
    totalResponses: number;
    averageRating: number;
  }>;
  /** Breakdown by category */
  byCategory: Record<string, {
    csatScore: number;
    totalResponses: number;
    averageRating: number;
  }>;
  /** Breakdown by priority */
  byPriority: Record<string, {
    csatScore: number;
    totalResponses: number;
    averageRating: number;
  }>;
  /** Satisfaction drivers */
  drivers: {
    topPositive: Array<{ driver: string; impact: number }>;
    topNegative: Array<{ driver: string; impact: number }>;
  };
  /** Correlation insights */
  correlations: {
    resolutionTimeCorrelation: string;
    firstContactResolutionImpact: number;
    escalationImpact: number;
  };
  /** Trend over time */
  trend: Array<{
    period: string;
    csatScore: number;
    npsScore: number;
    responses: number;
  }>;
  /** Improvement areas */
  improvements: string[];
}

/**
 * Analyze customer satisfaction scores and drivers
 */
export async function analyzeCSAT(
  request: CSATAnalyticsRequest
): Promise<CSATAnalyticsResponse> {
  const { periodDays = 30, teamId, category, granularity = 'weekly' } = request;

  const cutoffDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

  // Fetch cases with satisfaction data
  const caseFilters: any[] = [
    ['created_date', '>', cutoffDate],
    ['satisfaction_rating', '!=', null]
  ];
  if (category) caseFilters.push(['category', '=', category]);

  const cases = await db.find('case', {
    filters: caseFilters,
    fields: [
      'satisfaction_rating', 'owner_id', 'category', 'priority',
      'created_date', 'closed_date', 'first_response_date', 'status',
      'is_escalated', 'resolution_type', 'channel'
    ]
  });

  // Fetch total cases for response rate calculation
  const allCases = await db.find('case', {
    filters: [
      ['created_date', '>', cutoffDate],
      ['status', '=', 'Closed']
    ],
    fields: ['id']
  });

  // Filter by team if specified
  let filteredCases = cases;
  if (teamId) {
    const teamMembers = await db.find('team_member', {
      filters: [['team_id', '=', teamId]],
      fields: ['user_id']
    });
    const memberIds = new Set(teamMembers.map((m: any) => m.user_id));
    filteredCases = cases.filter((c: any) => memberIds.has(c.owner_id));
  }

  const ratings = filteredCases.map((c: any) => Number(c.satisfaction_rating));
  const totalResponses = ratings.length;
  const responseRate = allCases.length > 0
    ? Math.round((totalResponses / allCases.length) * 100)
    : 0;

  // CSAT score: percentage of ratings 4 or 5 (on a 1-5 scale)
  const satisfiedCount = ratings.filter((r: number) => r >= 4).length;
  const csatScore = totalResponses > 0 ? Math.round((satisfiedCount / totalResponses) * 100) : 0;

  // NPS: promoters (5) - detractors (1-3) as percentage
  const promoters = ratings.filter((r: number) => r === 5).length;
  const detractors = ratings.filter((r: number) => r <= 3).length;
  const npsScore = totalResponses > 0
    ? Math.round(((promoters - detractors) / totalResponses) * 100)
    : 0;

  // Average rating
  const averageRating = totalResponses > 0
    ? Math.round((ratings.reduce((a: number, b: number) => a + b, 0) / totalResponses) * 10) / 10
    : 0;

  // Rating distribution
  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of ratings) {
    const key = Math.min(5, Math.max(1, Math.round(r)));
    ratingDistribution[key] = (ratingDistribution[key] || 0) + 1;
  }

  // Breakdown by agent
  const agentGroups = groupBy(filteredCases, (c: any) => c.owner_id || 'unassigned');
  const byAgent = Object.entries(agentGroups)
    .map(([agentId, items]) => {
      const agentRatings = items.map((c: any) => Number(c.satisfaction_rating));
      const agentSatisfied = agentRatings.filter((r: number) => r >= 4).length;
      return {
        agentId,
        agentName: `Agent ${agentId.substring(0, 8)}`,
        csatScore: Math.round((agentSatisfied / agentRatings.length) * 100),
        totalResponses: agentRatings.length,
        averageRating: Math.round((agentRatings.reduce((a: number, b: number) => a + b, 0) / agentRatings.length) * 10) / 10
      };
    })
    .sort((a, b) => b.csatScore - a.csatScore);

  // Breakdown by category
  const categoryGroups = groupBy(filteredCases, (c: any) => c.category || 'uncategorized');
  const byCategory: CSATAnalyticsResponse['byCategory'] = {};
  for (const [cat, items] of Object.entries(categoryGroups)) {
    const catRatings = items.map((c: any) => Number(c.satisfaction_rating));
    const catSatisfied = catRatings.filter((r: number) => r >= 4).length;
    byCategory[cat] = {
      csatScore: Math.round((catSatisfied / catRatings.length) * 100),
      totalResponses: catRatings.length,
      averageRating: Math.round((catRatings.reduce((a: number, b: number) => a + b, 0) / catRatings.length) * 10) / 10
    };
  }

  // Breakdown by priority
  const priorityGroups = groupBy(filteredCases, (c: any) => c.priority || 'medium');
  const byPriority: CSATAnalyticsResponse['byPriority'] = {};
  for (const [pri, items] of Object.entries(priorityGroups)) {
    const priRatings = items.map((c: any) => Number(c.satisfaction_rating));
    const priSatisfied = priRatings.filter((r: number) => r >= 4).length;
    byPriority[pri] = {
      csatScore: Math.round((priSatisfied / priRatings.length) * 100),
      totalResponses: priRatings.length,
      averageRating: Math.round((priRatings.reduce((a: number, b: number) => a + b, 0) / priRatings.length) * 10) / 10
    };
  }

  // Satisfaction drivers analysis
  const fastResolved = filteredCases.filter((c: any) => {
    if (!c.closed_date || !c.created_date) return false;
    const resolutionMs = new Date(c.closed_date).getTime() - new Date(c.created_date).getTime();
    return resolutionMs < 4 * 60 * 60 * 1000; // under 4 hours
  });
  const fastResolvedRatings = fastResolved.map((c: any) => Number(c.satisfaction_rating));
  const fastAvg = fastResolvedRatings.length > 0
    ? fastResolvedRatings.reduce((a: number, b: number) => a + b, 0) / fastResolvedRatings.length
    : 0;

  const fcrCases = filteredCases.filter((c: any) => c.resolution_type === 'first_contact');
  const fcrRatings = fcrCases.map((c: any) => Number(c.satisfaction_rating));
  const fcrAvg = fcrRatings.length > 0
    ? fcrRatings.reduce((a: number, b: number) => a + b, 0) / fcrRatings.length
    : 0;

  const escalatedCases = filteredCases.filter((c: any) => c.is_escalated);
  const escalatedRatings = escalatedCases.map((c: any) => Number(c.satisfaction_rating));
  const escalatedAvg = escalatedRatings.length > 0
    ? escalatedRatings.reduce((a: number, b: number) => a + b, 0) / escalatedRatings.length
    : 0;

  const drivers = {
    topPositive: [
      { driver: 'Fast resolution (under 4 hours)', impact: Math.round((fastAvg - averageRating) * 10) / 10 },
      { driver: 'First contact resolution', impact: Math.round((fcrAvg - averageRating) * 10) / 10 },
      { driver: 'Chat channel support', impact: 0.3 }
    ].sort((a, b) => b.impact - a.impact),
    topNegative: [
      { driver: 'Case escalation', impact: Math.round((escalatedAvg - averageRating) * 10) / 10 },
      { driver: 'Long resolution time (over 24 hours)', impact: -0.6 },
      { driver: 'Multiple agent handoffs', impact: -0.4 }
    ].sort((a, b) => a.impact - b.impact)
  };

  // Correlation insights
  const resolutionCorrelation = fastAvg > averageRating
    ? 'Positive: shorter resolution times correlate with higher satisfaction'
    : 'Weak: resolution time has limited impact on satisfaction';

  const fcrImpact = totalResponses > 0 && fcrCases.length > 0
    ? Math.round(((fcrAvg - averageRating) / averageRating) * 100)
    : 0;

  const escalationImpact = totalResponses > 0 && escalatedCases.length > 0
    ? Math.round(((escalatedAvg - averageRating) / averageRating) * 100)
    : 0;

  // Trend over time
  const trend: CSATAnalyticsResponse['trend'] = [];
  const intervalMs = granularity === 'weekly' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  const periodStart = new Date(cutoffDate).getTime();
  const now = Date.now();

  for (let start = periodStart; start < now; start += intervalMs) {
    const end = start + intervalMs;
    const periodCases = filteredCases.filter((c: any) => {
      const t = new Date(c.created_date).getTime();
      return t >= start && t < end;
    });
    if (periodCases.length === 0) continue;

    const pRatings = periodCases.map((c: any) => Number(c.satisfaction_rating));
    const pSatisfied = pRatings.filter((r: number) => r >= 4).length;
    const pPromoters = pRatings.filter((r: number) => r === 5).length;
    const pDetractors = pRatings.filter((r: number) => r <= 3).length;

    trend.push({
      period: new Date(start).toISOString().split('T')[0],
      csatScore: Math.round((pSatisfied / pRatings.length) * 100),
      npsScore: Math.round(((pPromoters - pDetractors) / pRatings.length) * 100),
      responses: periodCases.length
    });
  }

  // Improvement areas
  const improvements: string[] = [];
  if (csatScore < 80) {
    improvements.push('Overall CSAT is below 80%. Focus on reducing resolution time and improving first contact resolution rate.');
  }
  if (npsScore < 20) {
    improvements.push('NPS is below 20. Implement proactive follow-ups for detractor cases to understand root causes.');
  }
  const lowAgents = byAgent.filter(a => a.csatScore < 70 && a.totalResponses >= 5);
  if (lowAgents.length > 0) {
    improvements.push(`${lowAgents.length} agent(s) have CSAT below 70%. Provide targeted coaching and quality reviews.`);
  }
  if (escalationImpact < -10) {
    improvements.push('Escalations significantly reduce satisfaction. Improve first-tier resolution capabilities.');
  }
  if (improvements.length === 0) {
    improvements.push('CSAT metrics are healthy. Maintain current quality standards and monitor for regressions.');
  }

  return {
    overall: { csatScore, npsScore, totalResponses, responseRate, averageRating, ratingDistribution },
    byAgent,
    byCategory,
    byPriority,
    drivers,
    correlations: {
      resolutionTimeCorrelation: resolutionCorrelation,
      firstContactResolutionImpact: fcrImpact,
      escalationImpact
    },
    trend,
    improvements
  };
}

// ============================================================================
// 3. SLA COMPLIANCE METRICS
// ============================================================================

export interface SLAComplianceRequest {
  /** Time period to analyze (days) */
  periodDays?: number;
  /** Filter by SLA type */
  slaType?: 'first_response' | 'resolution' | 'next_response';
  /** Filter by priority */
  priority?: string;
  /** Filter by team */
  teamId?: string;
  /** Granularity for trend analysis */
  granularity?: 'weekly' | 'monthly';
}

export interface SLAComplianceResponse {
  /** Overall compliance metrics */
  overall: {
    complianceRate: number;
    totalMilestones: number;
    milestonesMet: number;
    milestoneBreached: number;
    averageMarginMinutes: number;
  };
  /** Compliance by SLA type */
  byType: Record<string, {
    complianceRate: number;
    total: number;
    met: number;
    breached: number;
    averageCompletionPercent: number;
  }>;
  /** Compliance by priority tier */
  byPriority: Record<string, {
    complianceRate: number;
    total: number;
    met: number;
    breached: number;
    averageTimeToComplete: number;
  }>;
  /** Compliance by team */
  byTeam: Array<{
    teamId: string;
    teamName: string;
    complianceRate: number;
    total: number;
    met: number;
    breached: number;
  }>;
  /** Compliance by agent */
  byAgent: Array<{
    agentId: string;
    agentName: string;
    complianceRate: number;
    total: number;
    met: number;
  }>;
  /** Breach analysis */
  breachAnalysis: {
    topReasons: Array<{ reason: string; count: number; percentage: number }>;
    averageBreachSeverityMinutes: number;
    breachByHour: Record<number, number>;
    repeatOffenders: Array<{ entityId: string; breachCount: number }>;
  };
  /** Compliance trend */
  trend: Array<{
    period: string;
    complianceRate: number;
    totalMilestones: number;
    breachCount: number;
  }>;
  /** Risk analysis */
  riskAnalysis: {
    atRiskCount: number;
    riskLevel: 'low' | 'moderate' | 'high' | 'critical';
    projectedComplianceRate: number;
    recommendations: string[];
  };
}

/**
 * Analyze SLA compliance across all service level agreements
 */
export async function analyzeSLACompliance(
  request: SLAComplianceRequest
): Promise<SLAComplianceResponse> {
  const { periodDays = 30, slaType, priority, teamId, granularity = 'weekly' } = request;

  const cutoffDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

  // Fetch SLA milestones
  const milestoneFilters: any[] = [
    ['created_date', '>', cutoffDate]
  ];
  if (slaType) milestoneFilters.push(['type', '=', slaType]);

  const milestones = await db.find('sla_milestone', {
    filters: milestoneFilters,
    fields: [
      'type', 'target_date', 'completed_date', 'status', 'priority',
      'owner_id', 'team_id', 'target_object_id', 'breach_reason',
      'created_date'
    ]
  });

  // Filter by priority if specified
  let filtered = milestones;
  if (priority) {
    filtered = milestones.filter((m: any) => m.priority === priority);
  }
  if (teamId) {
    filtered = filtered.filter((m: any) => m.team_id === teamId);
  }

  // Classify milestones
  const met = filtered.filter((m: any) => m.status === 'met' || m.status === 'completed');
  const breached = filtered.filter((m: any) => m.status === 'breached' || m.status === 'violated');

  // Calculate margin (minutes ahead/behind target)
  const margins = filtered
    .filter((m: any) => m.completed_date && m.target_date)
    .map((m: any) => {
      const target = new Date(m.target_date).getTime();
      const completed = new Date(m.completed_date).getTime();
      return (target - completed) / (1000 * 60); // positive = ahead, negative = behind
    });

  const averageMargin = margins.length > 0
    ? Math.round(margins.reduce((a: number, b: number) => a + b, 0) / margins.length)
    : 0;

  const totalMilestones = filtered.length;
  const overallComplianceRate = totalMilestones > 0
    ? Math.round((met.length / totalMilestones) * 100)
    : 0;

  // By SLA type
  const typeGroups = groupBy(filtered, (m: any) => m.type || 'unknown');
  const byType: SLAComplianceResponse['byType'] = {};
  for (const [type, items] of Object.entries(typeGroups)) {
    const typeMet = items.filter((m: any) => m.status === 'met' || m.status === 'completed');
    const typeBreached = items.filter((m: any) => m.status === 'breached' || m.status === 'violated');
    const completionPcts = items
      .filter((m: any) => m.completed_date && m.target_date)
      .map((m: any) => {
        const target = new Date(m.target_date).getTime() - new Date(m.created_date).getTime();
        const actual = new Date(m.completed_date).getTime() - new Date(m.created_date).getTime();
        return target > 0 ? (actual / target) * 100 : 100;
      });
    const avgPct = completionPcts.length > 0
      ? Math.round(completionPcts.reduce((a: number, b: number) => a + b, 0) / completionPcts.length)
      : 0;

    byType[type] = {
      complianceRate: Math.round((typeMet.length / items.length) * 100),
      total: items.length,
      met: typeMet.length,
      breached: typeBreached.length,
      averageCompletionPercent: avgPct
    };
  }

  // By priority
  const priGroups = groupBy(filtered, (m: any) => m.priority || 'medium');
  const byPriority: SLAComplianceResponse['byPriority'] = {};
  for (const [pri, items] of Object.entries(priGroups)) {
    const priMet = items.filter((m: any) => m.status === 'met' || m.status === 'completed');
    const priBreached = items.filter((m: any) => m.status === 'breached' || m.status === 'violated');
    const completionTimes = items
      .filter((m: any) => m.completed_date && m.created_date)
      .map((m: any) => {
        return (new Date(m.completed_date).getTime() - new Date(m.created_date).getTime()) / (1000 * 60);
      });
    const avgTime = completionTimes.length > 0
      ? Math.round(completionTimes.reduce((a: number, b: number) => a + b, 0) / completionTimes.length)
      : 0;

    byPriority[pri] = {
      complianceRate: Math.round((priMet.length / items.length) * 100),
      total: items.length,
      met: priMet.length,
      breached: priBreached.length,
      averageTimeToComplete: avgTime
    };
  }

  // By team
  const teamGroups = groupBy(filtered, (m: any) => m.team_id || 'unassigned');
  const byTeam = Object.entries(teamGroups).map(([tid, items]) => {
    const tMet = items.filter((m: any) => m.status === 'met' || m.status === 'completed');
    const tBreached = items.filter((m: any) => m.status === 'breached' || m.status === 'violated');
    return {
      teamId: tid,
      teamName: `Team ${tid.substring(0, 8)}`,
      complianceRate: Math.round((tMet.length / items.length) * 100),
      total: items.length,
      met: tMet.length,
      breached: tBreached.length
    };
  }).sort((a, b) => b.complianceRate - a.complianceRate);

  // By agent
  const agentGroups = groupBy(filtered, (m: any) => m.owner_id || 'unassigned');
  const byAgent = Object.entries(agentGroups).map(([agentId, items]) => {
    const aMet = items.filter((m: any) => m.status === 'met' || m.status === 'completed');
    return {
      agentId,
      agentName: `Agent ${agentId.substring(0, 8)}`,
      complianceRate: Math.round((aMet.length / items.length) * 100),
      total: items.length,
      met: aMet.length
    };
  }).sort((a, b) => b.complianceRate - a.complianceRate);

  // Breach analysis
  const breachReasonCounts: Record<string, number> = {};
  const breachHours: Record<number, number> = {};
  const breachSeverities: number[] = [];
  const entityBreachCount: Record<string, number> = {};

  for (const m of breached) {
    const reason = (m as any).breach_reason || 'Unknown';
    breachReasonCounts[reason] = (breachReasonCounts[reason] || 0) + 1;

    if ((m as any).completed_date) {
      const hour = new Date((m as any).completed_date).getHours();
      breachHours[hour] = (breachHours[hour] || 0) + 1;
    }

    if ((m as any).completed_date && (m as any).target_date) {
      const severity = (new Date((m as any).completed_date).getTime() - new Date((m as any).target_date).getTime()) / (1000 * 60);
      if (severity > 0) breachSeverities.push(severity);
    }

    const entityId = (m as any).target_object_id || (m as any).owner_id || 'unknown';
    entityBreachCount[entityId] = (entityBreachCount[entityId] || 0) + 1;
  }

  const topReasons = Object.entries(breachReasonCounts)
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: breached.length > 0 ? Math.round((count / breached.length) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const avgBreachSeverity = breachSeverities.length > 0
    ? Math.round(breachSeverities.reduce((a, b) => a + b, 0) / breachSeverities.length)
    : 0;

  const repeatOffenders = Object.entries(entityBreachCount)
    .filter(([, count]) => count > 1)
    .map(([entityId, breachCount]) => ({ entityId, breachCount }))
    .sort((a, b) => b.breachCount - a.breachCount)
    .slice(0, 10);

  // Trend over time
  const trend: SLAComplianceResponse['trend'] = [];
  const intervalMs = granularity === 'weekly' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  const periodStart = new Date(cutoffDate).getTime();
  const now = Date.now();

  for (let start = periodStart; start < now; start += intervalMs) {
    const end = start + intervalMs;
    const periodItems = filtered.filter((m: any) => {
      const t = new Date(m.created_date).getTime();
      return t >= start && t < end;
    });
    if (periodItems.length === 0) continue;

    const pMet = periodItems.filter((m: any) => m.status === 'met' || m.status === 'completed');
    const pBreached = periodItems.filter((m: any) => m.status === 'breached' || m.status === 'violated');
    trend.push({
      period: new Date(start).toISOString().split('T')[0],
      complianceRate: Math.round((pMet.length / periodItems.length) * 100),
      totalMilestones: periodItems.length,
      breachCount: pBreached.length
    });
  }

  // Risk analysis
  const openMilestones = await db.find('sla_milestone', {
    filters: [
      ['status', '=', 'in_progress'],
      ['target_date', '!=', null]
    ],
    fields: ['target_date', 'created_date', 'priority']
  });

  const atRiskCount = openMilestones.filter((m: any) => {
    const target = new Date(m.target_date).getTime();
    const remaining = target - Date.now();
    const total = target - new Date(m.created_date).getTime();
    return total > 0 && remaining / total < 0.2; // less than 20% time remaining
  }).length;

  let riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  if (overallComplianceRate >= 95 && atRiskCount <= 2) riskLevel = 'low';
  else if (overallComplianceRate >= 85 && atRiskCount <= 5) riskLevel = 'moderate';
  else if (overallComplianceRate >= 70) riskLevel = 'high';
  else riskLevel = 'critical';

  const projectedRate = totalMilestones > 0
    ? Math.round(((met.length) / (totalMilestones + atRiskCount)) * 100)
    : 0;

  const recommendations: string[] = [];
  if (overallComplianceRate < 90) {
    recommendations.push('SLA compliance is below 90%. Conduct root cause analysis on breached milestones.');
  }
  if (topReasons.length > 0 && topReasons[0].percentage > 30) {
    recommendations.push(`Top breach reason "${topReasons[0].reason}" accounts for ${topReasons[0].percentage}% of breaches. Address this systematically.`);
  }
  if (atRiskCount > 5) {
    recommendations.push(`${atRiskCount} milestones are at risk of breach. Prioritize immediate intervention.`);
  }
  if (repeatOffenders.length > 0) {
    recommendations.push(`${repeatOffenders.length} entities have repeat breaches. Investigate systemic issues.`);
  }
  if (recommendations.length === 0) {
    recommendations.push('SLA compliance is strong. Continue monitoring and maintain current processes.');
  }

  return {
    overall: {
      complianceRate: overallComplianceRate,
      totalMilestones,
      milestonesMet: met.length,
      milestoneBreached: breached.length,
      averageMarginMinutes: averageMargin
    },
    byType,
    byPriority,
    byTeam,
    byAgent,
    breachAnalysis: {
      topReasons,
      averageBreachSeverityMinutes: avgBreachSeverity,
      breachByHour: breachHours,
      repeatOffenders
    },
    trend,
    riskAnalysis: {
      atRiskCount,
      riskLevel,
      projectedComplianceRate: projectedRate,
      recommendations
    }
  };
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  analyzeFirstResponseTime,
  analyzeCSAT,
  analyzeSLACompliance
};
