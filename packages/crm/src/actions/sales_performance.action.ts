/**
 * Sales Performance Analytics Actions
 *
 * Pipeline metrics, win rates, and forecast accuracy.
 *
 * Functionality:
 * 1. Pipeline Health Metrics - Stage analysis, velocity, coverage, aging
 * 2. Win Rate Analytics - Win/loss breakdown by segment, trend, and reason
 * 3. Forecast Accuracy Metrics - Bias, accuracy by rep/stage/product
 */

import { broker } from '../db';

// ============================================================================
// SHARED TYPES
// ============================================================================

interface DateRange {
  /** ISO date string for range start */
  startDate: string;
  /** ISO date string for range end */
  endDate: string;
}

// ============================================================================
// 1. PIPELINE HEALTH METRICS
// ============================================================================

export interface PipelineAnalysisRequest {
  /** Optional date range to scope the analysis */
  dateRange?: DateRange;
  /** Sales rep ID to filter by */
  ownerId?: string;
  /** Quarterly quota to calculate coverage ratio */
  quota?: number;
}

export interface StageMetric {
  stage: string;
  count: number;
  totalValue: number;
  avgDaysInStage: number;
  conversionRate: number;
}

export interface AgingBucket {
  label: string;
  count: number;
  totalValue: number;
  opportunityIds: string[];
}

export interface PipelineCreationTrend {
  month: string;
  newPipelineValue: number;
  newDealCount: number;
}

export interface PipelineAnalysisResponse {
  /** Stage-by-stage funnel metrics */
  stageMetrics: StageMetric[];
  /** Total open pipeline value */
  totalPipelineValue: number;
  /** Pipeline coverage ratio (pipeline / quota) */
  coverageRatio: number | null;
  /** Aging analysis buckets */
  aging: {
    under30Days: AgingBucket;
    days30to60: AgingBucket;
    days60to90: AgingBucket;
    over90Days: AgingBucket;
  };
  /** Monthly pipeline creation trend */
  creationTrend: PipelineCreationTrend[];
  /** Overall pipeline health score (0-100) */
  healthScore: number;
  /** Summary observations */
  observations: string[];
}

/**
 * Analyze pipeline health: stage funnel, velocity, coverage, and aging.
 */
export async function analyzePipeline(request: PipelineAnalysisRequest): Promise<PipelineAnalysisResponse> {
  const { dateRange, ownerId, quota } = request;

  // Build filters for open opportunities
  const filters: [string, string, any][] = [['IsClosed', '=', false]];
  if (ownerId) {
    filters.push(['OwnerId', '=', ownerId]);
  }
  if (dateRange) {
    filters.push(['CreatedDate', '>=', dateRange.startDate]);
    filters.push(['CreatedDate', '<=', dateRange.endDate]);
  }

  const opportunities: any[] = await broker.find('Opportunity', {
    filters,
    fields: [
      'Id', 'Name', 'Stage', 'Amount', 'CreatedDate', 'CloseDate',
      'LastActivityDate', 'OwnerId', 'Age', 'DaysInStage'
    ]
  });

  // --- Stage funnel ---
  const stageOrder = [
    'prospecting', 'qualification', 'needs_analysis',
    'proposal', 'negotiation', 'Verbal Commit'
  ];

  const stageGroups: Record<string, any[]> = {};
  for (const opp of opportunities) {
    const stage = opp.Stage || 'unknown';
    if (!stageGroups[stage]) stageGroups[stage] = [];
    stageGroups[stage].push(opp);
  }

  const stageMetrics: StageMetric[] = stageOrder.map((stage, idx) => {
    const group = stageGroups[stage] || [];
    const count = group.length;
    const totalValue = group.reduce((sum: number, o: any) => sum + (o.Amount || 0), 0);
    const avgDaysInStage = count > 0
      ? Math.round(group.reduce((sum: number, o: any) => sum + (o.DaysInStage || 0), 0) / count)
      : 0;

    const nextStage = stageOrder[idx + 1];
    const nextCount = nextStage ? (stageGroups[nextStage] || []).length : 0;
    const conversionRate = count > 0 ? Math.round((nextCount / count) * 100) : 0;

    return { stage, count, totalValue, avgDaysInStage, conversionRate };
  });

  // Include any stages not in the canonical order
  for (const stage of Object.keys(stageGroups)) {
    if (!stageOrder.includes(stage)) {
      const group = stageGroups[stage];
      stageMetrics.push({
        stage,
        count: group.length,
        totalValue: group.reduce((sum: number, o: any) => sum + (o.Amount || 0), 0),
        avgDaysInStage: group.length > 0
          ? Math.round(group.reduce((sum: number, o: any) => sum + (o.DaysInStage || 0), 0) / group.length)
          : 0,
        conversionRate: 0
      });
    }
  }

  const totalPipelineValue = opportunities.reduce((sum: number, o: any) => sum + (o.Amount || 0), 0);
  const coverageRatio = quota ? Math.round((totalPipelineValue / quota) * 100) / 100 : null;

  // --- Aging analysis ---
  const now = Date.now();
  const buckets: Record<string, { count: number; totalValue: number; opportunityIds: string[] }> = {
    under30Days: { count: 0, totalValue: 0, opportunityIds: [] },
    days30to60: { count: 0, totalValue: 0, opportunityIds: [] },
    days60to90: { count: 0, totalValue: 0, opportunityIds: [] },
    over90Days: { count: 0, totalValue: 0, opportunityIds: [] }
  };

  for (const opp of opportunities) {
    const age = opp.Age ?? Math.floor((now - new Date(opp.CreatedDate).getTime()) / (1000 * 60 * 60 * 24));
    const amount = opp.Amount || 0;
    let key: string;
    if (age > 90) key = 'over90Days';
    else if (age > 60) key = 'days60to90';
    else if (age > 30) key = 'days30to60';
    else key = 'under30Days';

    buckets[key].count++;
    buckets[key].totalValue += amount;
    buckets[key].opportunityIds.push(opp.Id);
  }

  const aging = {
    under30Days: { label: '< 30 days', ...buckets.under30Days },
    days30to60: { label: '30-60 days', ...buckets.days30to60 },
    days60to90: { label: '60-90 days', ...buckets.days60to90 },
    over90Days: { label: '> 90 days', ...buckets.over90Days }
  };

  // --- Creation trend (last 6 months) ---
  const creationTrend: PipelineCreationTrend[] = [];
  const monthMap: Record<string, { value: number; count: number }> = {};
  for (const opp of opportunities) {
    if (!opp.CreatedDate) continue;
    const d = new Date(opp.CreatedDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap[key]) monthMap[key] = { value: 0, count: 0 };
    monthMap[key].value += opp.Amount || 0;
    monthMap[key].count++;
  }
  const sortedMonths = Object.keys(monthMap).sort();
  for (const month of sortedMonths.slice(-6)) {
    creationTrend.push({
      month,
      newPipelineValue: monthMap[month].value,
      newDealCount: monthMap[month].count
    });
  }

  // --- Health score ---
  const observations: string[] = [];
  let healthScore = 70; // baseline

  if (coverageRatio !== null) {
    if (coverageRatio >= 3) { healthScore += 10; observations.push('Strong pipeline coverage (3x+ quota).'); }
    else if (coverageRatio < 2) { healthScore -= 15; observations.push('Low pipeline coverage — consider ramping prospecting.'); }
  }

  const staleRatio = opportunities.length > 0 ? buckets.over90Days.count / opportunities.length : 0;
  if (staleRatio > 0.3) { healthScore -= 15; observations.push('Over 30% of deals are older than 90 days — review for cleanup.'); }
  else if (staleRatio < 0.1) { healthScore += 5; observations.push('Minimal deal aging — pipeline is fresh.'); }

  const topHeavy = (stageGroups['negotiation'] || []).length + (stageGroups['Verbal Commit'] || []).length;
  const earlyStage = (stageGroups['prospecting'] || []).length + (stageGroups['qualification'] || []).length;
  if (earlyStage === 0 && topHeavy > 0) {
    healthScore -= 10;
    observations.push('No early-stage pipeline — future quarters at risk.');
  }

  healthScore = Math.max(0, Math.min(100, healthScore));

  return {
    stageMetrics,
    totalPipelineValue,
    coverageRatio,
    aging,
    creationTrend,
    healthScore,
    observations
  };
}

// ============================================================================
// 2. WIN RATE ANALYTICS
// ============================================================================

export interface WinRateAnalysisRequest {
  /** Date range for closed opportunities */
  dateRange?: DateRange;
  /** Filter by owner */
  ownerId?: string;
}

export interface WinRateBySegment {
  segment: string;
  won: number;
  lost: number;
  winRate: number;
}

export interface LossReason {
  reason: string;
  count: number;
  percentage: number;
}

export interface MonthlyWinRateTrend {
  month: string;
  won: number;
  lost: number;
  winRate: number;
}

export interface WinRateAnalysisResponse {
  /** Overall win rate percentage */
  overallWinRate: number;
  /** Total won and lost counts */
  totalWon: number;
  totalLost: number;
  /** Average deal size — won vs lost */
  avgDealSize: { won: number; lost: number };
  /** Win rate segmented by deal size tier */
  byDealSize: WinRateBySegment[];
  /** Win rate segmented by industry */
  byIndustry: WinRateBySegment[];
  /** Win rate segmented by lead source */
  byLeadSource: WinRateBySegment[];
  /** Loss reasons breakdown */
  lossReasons: LossReason[];
  /** Competitive win/loss */
  competitiveWinLoss: WinRateBySegment[];
  /** Monthly trend */
  monthlyTrend: MonthlyWinRateTrend[];
}

/**
 * Analyze win rates across multiple dimensions.
 */
export async function analyzeWinRates(request: WinRateAnalysisRequest): Promise<WinRateAnalysisResponse> {
  const { dateRange, ownerId } = request;

  const filters: [string, string, any][] = [['IsClosed', '=', true]];
  if (ownerId) {
    filters.push(['OwnerId', '=', ownerId]);
  }
  if (dateRange) {
    filters.push(['CloseDate', '>=', dateRange.startDate]);
    filters.push(['CloseDate', '<=', dateRange.endDate]);
  }

  const opportunities: any[] = await broker.find('Opportunity', {
    filters,
    fields: [
      'Id', 'Name', 'Stage', 'Amount', 'CloseDate', 'IsWon',
      'Industry', 'LeadSource', 'LossReason', 'Competitor',
      'OwnerId', 'CreatedDate'
    ]
  });

  const won = opportunities.filter(o => o.IsWon);
  const lost = opportunities.filter(o => !o.IsWon);

  const overallWinRate = opportunities.length > 0
    ? Math.round((won.length / opportunities.length) * 100)
    : 0;

  const avgWonSize = won.length > 0
    ? Math.round(won.reduce((s: number, o: any) => s + (o.Amount || 0), 0) / won.length)
    : 0;
  const avgLostSize = lost.length > 0
    ? Math.round(lost.reduce((s: number, o: any) => s + (o.Amount || 0), 0) / lost.length)
    : 0;

  // --- By deal size tier ---
  const sizeTiers: { label: string; min: number; max: number }[] = [
    { label: '< $25K', min: 0, max: 25000 },
    { label: '$25K-$100K', min: 25000, max: 100000 },
    { label: '$100K-$500K', min: 100000, max: 500000 },
    { label: '$500K+', min: 500000, max: Infinity }
  ];

  const byDealSize: WinRateBySegment[] = sizeTiers.map(tier => {
    const inTier = opportunities.filter(o => (o.Amount || 0) >= tier.min && (o.Amount || 0) < tier.max);
    const tierWon = inTier.filter(o => o.IsWon).length;
    const tierLost = inTier.filter(o => !o.IsWon).length;
    return {
      segment: tier.label,
      won: tierWon,
      lost: tierLost,
      winRate: inTier.length > 0 ? Math.round((tierWon / inTier.length) * 100) : 0
    };
  });

  // --- By industry ---
  const byIndustry = buildSegmentBreakdown(opportunities, 'Industry');

  // --- By lead source ---
  const byLeadSource = buildSegmentBreakdown(opportunities, 'LeadSource');

  // --- Loss reasons ---
  const reasonCounts: Record<string, number> = {};
  for (const opp of lost) {
    const reason = opp.LossReason || 'Not Specified';
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
  }
  const lossReasons: LossReason[] = Object.entries(reasonCounts)
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: lost.length > 0 ? Math.round((count / lost.length) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count);

  // --- Competitive win/loss ---
  const competitiveDeals = opportunities.filter(o => o.Competitor);
  const competitiveWinLoss = buildSegmentBreakdown(competitiveDeals, 'Competitor');

  // --- Monthly trend ---
  const monthlyBuckets: Record<string, { won: number; lost: number }> = {};
  for (const opp of opportunities) {
    if (!opp.CloseDate) continue;
    const d = new Date(opp.CloseDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyBuckets[key]) monthlyBuckets[key] = { won: 0, lost: 0 };
    if (opp.IsWon) monthlyBuckets[key].won++;
    else monthlyBuckets[key].lost++;
  }

  const monthlyTrend: MonthlyWinRateTrend[] = Object.keys(monthlyBuckets)
    .sort()
    .map(month => {
      const b = monthlyBuckets[month];
      const total = b.won + b.lost;
      return { month, won: b.won, lost: b.lost, winRate: total > 0 ? Math.round((b.won / total) * 100) : 0 };
    });

  return {
    overallWinRate,
    totalWon: won.length,
    totalLost: lost.length,
    avgDealSize: { won: avgWonSize, lost: avgLostSize },
    byDealSize,
    byIndustry,
    byLeadSource,
    lossReasons,
    competitiveWinLoss,
    monthlyTrend
  };
}

// ============================================================================
// 3. FORECAST ACCURACY METRICS
// ============================================================================

export interface ForecastAccuracyRequest {
  /** Periods to evaluate (e.g. quarterly boundaries) */
  dateRange?: DateRange;
  /** Filter by owner */
  ownerId?: string;
}

export interface PeriodAccuracy {
  period: string;
  forecastedAmount: number;
  actualAmount: number;
  accuracyPct: number;
  bias: number;
  biasDirection: 'over' | 'under' | 'neutral';
}

export interface RepAccuracy {
  ownerId: string;
  forecastedAmount: number;
  actualAmount: number;
  accuracyPct: number;
}

export interface StageAccuracy {
  stage: string;
  forecastedAmount: number;
  actualAmount: number;
  accuracyPct: number;
}

export interface ForecastCoverageAnalysis {
  commit: number;
  bestCase: number;
  pipeline: number;
  quota: number;
  commitCoverage: number;
  bestCaseCoverage: number;
  pipelineCoverage: number;
}

export interface ForecastAccuracyResponse {
  /** Accuracy by period */
  periodAccuracy: PeriodAccuracy[];
  /** Overall accuracy percentage */
  overallAccuracyPct: number;
  /** Overall bias direction and magnitude */
  overallBias: { direction: 'over' | 'under' | 'neutral'; magnitude: number };
  /** Accuracy broken down by sales rep */
  byRep: RepAccuracy[];
  /** Accuracy broken down by opportunity stage at forecast time */
  byStage: StageAccuracy[];
  /** Accuracy broken down by product family */
  byProduct: Array<{ product: string; forecastedAmount: number; actualAmount: number; accuracyPct: number }>;
  /** Commit / best case / pipeline coverage breakdown */
  coverageAnalysis: ForecastCoverageAnalysis | null;
  /** Improvement recommendations */
  recommendations: string[];
}

/**
 * Measure forecast accuracy: bias, precision by rep/stage/product.
 */
export async function analyzeForecastAccuracy(request: ForecastAccuracyRequest): Promise<ForecastAccuracyResponse> {
  const { dateRange, ownerId } = request;

  // Fetch closed-won opportunities for actuals
  const closedFilters: [string, string, any][] = [['IsClosed', '=', true], ['IsWon', '=', true]];
  if (ownerId) closedFilters.push(['OwnerId', '=', ownerId]);
  if (dateRange) {
    closedFilters.push(['CloseDate', '>=', dateRange.startDate]);
    closedFilters.push(['CloseDate', '<=', dateRange.endDate]);
  }

  const closedWon: any[] = await broker.find('Opportunity', {
    filters: closedFilters,
    fields: [
      'Id', 'Name', 'Amount', 'ForecastAmount', 'CloseDate',
      'ForecastCategory', 'Stage', 'OwnerId', 'ProductFamily'
    ]
  });

  // Fetch current open opportunities for coverage analysis
  const openOpps: any[] = await broker.find('Opportunity', {
    filters: [['IsClosed', '=', false]],
    fields: ['Id', 'Amount', 'ForecastCategory', 'Stage', 'OwnerId']
  });

  // --- Period accuracy (monthly) ---
  const periodMap: Record<string, { forecasted: number; actual: number }> = {};
  for (const opp of closedWon) {
    if (!opp.CloseDate) continue;
    const d = new Date(opp.CloseDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!periodMap[key]) periodMap[key] = { forecasted: 0, actual: 0 };
    periodMap[key].forecasted += opp.ForecastAmount ?? opp.Amount ?? 0;
    periodMap[key].actual += opp.Amount ?? 0;
  }

  const periodAccuracy: PeriodAccuracy[] = Object.keys(periodMap).sort().map(period => {
    const { forecasted, actual } = periodMap[period];
    const accuracyPct = forecasted > 0
      ? Math.round((1 - Math.abs(forecasted - actual) / forecasted) * 100)
      : 0;
    const bias = forecasted - actual;
    const biasDirection: 'over' | 'under' | 'neutral' =
      bias > 0 ? 'over' : bias < 0 ? 'under' : 'neutral';
    return { period, forecastedAmount: forecasted, actualAmount: actual, accuracyPct: Math.max(0, accuracyPct), bias, biasDirection };
  });

  // --- Overall accuracy ---
  const totalForecasted = closedWon.reduce((s: number, o: any) => s + (o.ForecastAmount ?? o.Amount ?? 0), 0);
  const totalActual = closedWon.reduce((s: number, o: any) => s + (o.Amount ?? 0), 0);
  const overallAccuracyPct = totalForecasted > 0
    ? Math.max(0, Math.round((1 - Math.abs(totalForecasted - totalActual) / totalForecasted) * 100))
    : 0;
  const overallBiasMag = totalForecasted - totalActual;
  const overallBias = {
    direction: (overallBiasMag > 0 ? 'over' : overallBiasMag < 0 ? 'under' : 'neutral') as 'over' | 'under' | 'neutral',
    magnitude: Math.abs(overallBiasMag)
  };

  // --- By rep ---
  const repMap: Record<string, { forecasted: number; actual: number }> = {};
  for (const opp of closedWon) {
    const id = opp.OwnerId || 'unknown';
    if (!repMap[id]) repMap[id] = { forecasted: 0, actual: 0 };
    repMap[id].forecasted += opp.ForecastAmount ?? opp.Amount ?? 0;
    repMap[id].actual += opp.Amount ?? 0;
  }
  const byRep: RepAccuracy[] = Object.entries(repMap).map(([ownerId, vals]) => ({
    ownerId,
    forecastedAmount: vals.forecasted,
    actualAmount: vals.actual,
    accuracyPct: vals.forecasted > 0
      ? Math.max(0, Math.round((1 - Math.abs(vals.forecasted - vals.actual) / vals.forecasted) * 100))
      : 0
  }));

  // --- By stage ---
  const stageMap: Record<string, { forecasted: number; actual: number }> = {};
  for (const opp of closedWon) {
    const stage = opp.Stage || 'unknown';
    if (!stageMap[stage]) stageMap[stage] = { forecasted: 0, actual: 0 };
    stageMap[stage].forecasted += opp.ForecastAmount ?? opp.Amount ?? 0;
    stageMap[stage].actual += opp.Amount ?? 0;
  }
  const byStage: StageAccuracy[] = Object.entries(stageMap).map(([stage, vals]) => ({
    stage,
    forecastedAmount: vals.forecasted,
    actualAmount: vals.actual,
    accuracyPct: vals.forecasted > 0
      ? Math.max(0, Math.round((1 - Math.abs(vals.forecasted - vals.actual) / vals.forecasted) * 100))
      : 0
  }));

  // --- By product ---
  const productMap: Record<string, { forecasted: number; actual: number }> = {};
  for (const opp of closedWon) {
    const product = opp.ProductFamily || 'Unassigned';
    if (!productMap[product]) productMap[product] = { forecasted: 0, actual: 0 };
    productMap[product].forecasted += opp.ForecastAmount ?? opp.Amount ?? 0;
    productMap[product].actual += opp.Amount ?? 0;
  }
  const byProduct = Object.entries(productMap).map(([product, vals]) => ({
    product,
    forecastedAmount: vals.forecasted,
    actualAmount: vals.actual,
    accuracyPct: vals.forecasted > 0
      ? Math.max(0, Math.round((1 - Math.abs(vals.forecasted - vals.actual) / vals.forecasted) * 100))
      : 0
  }));

  // --- Coverage analysis ---
  let coverageAnalysis: ForecastCoverageAnalysis | null = null;
  if (openOpps.length > 0) {
    const commit = openOpps
      .filter(o => o.ForecastCategory === 'commit')
      .reduce((s: number, o: any) => s + (o.Amount || 0), 0);
    const bestCase = openOpps
      .filter(o => o.ForecastCategory === 'best_case')
      .reduce((s: number, o: any) => s + (o.Amount || 0), 0);
    const pipeline = openOpps
      .reduce((s: number, o: any) => s + (o.Amount || 0), 0);
    const quotaEstimate = totalActual > 0 ? totalActual : 1;

    coverageAnalysis = {
      commit,
      bestCase,
      pipeline,
      quota: quotaEstimate,
      commitCoverage: Math.round((commit / quotaEstimate) * 100) / 100,
      bestCaseCoverage: Math.round(((commit + bestCase) / quotaEstimate) * 100) / 100,
      pipelineCoverage: Math.round((pipeline / quotaEstimate) * 100) / 100
    };
  }

  // --- Recommendations ---
  const recommendations: string[] = [];
  if (overallBias.direction === 'over' && overallBias.magnitude > totalActual * 0.1) {
    recommendations.push('Forecast bias is optimistic — tighten qualification criteria before committing deals.');
  }
  if (overallBias.direction === 'under' && overallBias.magnitude > totalActual * 0.1) {
    recommendations.push('Forecast bias is conservative — encourage reps to forecast upside opportunities.');
  }
  if (overallAccuracyPct < 70) {
    recommendations.push('Overall accuracy below 70% — implement weekly forecast review cadence.');
  }
  if (overallAccuracyPct >= 90) {
    recommendations.push('Excellent forecast accuracy — maintain current discipline.');
  }

  const lowAccuracyReps = byRep.filter(r => r.accuracyPct < 60);
  if (lowAccuracyReps.length > 0) {
    recommendations.push(`${lowAccuracyReps.length} rep(s) below 60% accuracy — schedule 1:1 forecast coaching.`);
  }

  if (coverageAnalysis && coverageAnalysis.commitCoverage < 0.8) {
    recommendations.push('Commit coverage under 80% of quota — accelerate late-stage deals or add pipeline.');
  }

  return {
    periodAccuracy,
    overallAccuracyPct,
    overallBias,
    byRep,
    byStage,
    byProduct,
    coverageAnalysis,
    recommendations
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build win/loss segment breakdown for a given field.
 */
function buildSegmentBreakdown(opportunities: any[], field: string): WinRateBySegment[] {
  const groups: Record<string, { won: number; lost: number }> = {};
  for (const opp of opportunities) {
    const key = opp[field] || 'unknown';
    if (!groups[key]) groups[key] = { won: 0, lost: 0 };
    if (opp.IsWon) groups[key].won++;
    else groups[key].lost++;
  }
  return Object.entries(groups).map(([segment, vals]) => {
    const total = vals.won + vals.lost;
    return {
      segment,
      won: vals.won,
      lost: vals.lost,
      winRate: total > 0 ? Math.round((vals.won / total) * 100) : 0
    };
  });
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  analyzePipeline,
  analyzeWinRates,
  analyzeForecastAccuracy
};
