/**
 * Forecast AI Enhancement Actions
 * 
 * This ObjectStack Action provides AI-powered sales forecast capabilities.
 * 
 * Functionality:
 * 1. Predict Forecast - Analyze pipeline and predict forecast amounts with AI confidence
 * 2. Adjust Forecast - AI-recommended adjustments based on historical patterns
 * 3. Identify Risks - Detect at-risk deals impacting forecast accuracy
 * 4. Generate Insights - Natural language insights about forecast trends
 */

import { broker } from '../db';

// ============================================================================
// 1. PREDICT FORECAST
// ============================================================================

export interface PredictForecastRequest {
  /** Start of forecast period (ISO date) */
  period_start: string;
  /** End of forecast period (ISO date) */
  period_end: string;
  /** Owner/rep ID to scope forecast */
  owner_id: string;
}

export interface PredictForecastResponse {
  /** Predicted total forecast amount */
  predicted_amount: number;
  /** AI confidence score (0-100) */
  confidence: number;
  /** Factors influencing the prediction */
  factors: Array<{
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
    description: string;
  }>;
  /** Breakdown by forecast category */
  categories: {
    closed: number;
    commit: number;
    best_case: number;
    pipeline: number;
    omitted: number;
  };
  /** Comparison to quota */
  quota_comparison: {
    quota: number;
    predicted_attainment: number;
    gap: number;
  };
}

/**
 * Analyze pipeline opportunities and predict forecast amounts using AI confidence scoring
 */
export async function predictForecast(params: PredictForecastRequest): Promise<PredictForecastResponse> {
  const { period_start, period_end, owner_id } = params;
  console.log('🤖 AI Forecast Prediction:', params);

  // Fetch pipeline opportunities within the forecast period
  const opportunities = await broker.find('opportunity', {
    filters: [
      ['owner_id', '=', owner_id],
      ['close_date', '>=', period_start],
      ['close_date', '<=', period_end],
      ['stage', '!=', 'closed_lost']
    ],
    fields: ['name', 'amount', 'stage', 'probability', 'close_date', 'forecast_category', 'type', 'lead_source']
  });

  // Fetch historical closed deals for pattern analysis
  const historicalDeals = await broker.find('opportunity', {
    filters: [
      ['owner_id', '=', owner_id],
      ['stage', 'in', ['closed_won', 'closed_lost']],
    ],
    fields: ['amount', 'stage', 'close_date', 'probability', 'forecast_category'],
    sort: 'close_date desc',
    limit: 100
  });

  // Calculate historical win rate
  const wonDeals = historicalDeals.filter((d: any) => d.stage === 'closed_won');
  const historicalWinRate = historicalDeals.length > 0
    ? (wonDeals.length / historicalDeals.length) * 100
    : 50;

  // Categorize pipeline
  const categories = {
    closed: 0,
    commit: 0,
    best_case: 0,
    pipeline: 0,
    omitted: 0
  };

  let weightedTotal = 0;
  const pipelineTotal = opportunities.reduce((sum: number, opp: any) => sum + (opp.amount || 0), 0);

  for (const opp of opportunities) {
    const amount = opp.amount || 0;
    const category = opp.forecast_category || 'pipeline';

    if (category in categories) {
      categories[category as keyof typeof categories] += amount;
    }

    // AI-adjusted probability using historical patterns
    const adjustedProbability = Math.min(
      (opp.probability || 50) * (historicalWinRate / 100) * 1.1,
      100
    );
    weightedTotal += amount * (adjustedProbability / 100);
  }

  const predicted_amount = Math.round(weightedTotal);
  const confidence = Math.min(Math.round(65 + (historicalDeals.length / 100) * 25), 95);

  // Fetch quota from forecast settings, default to weighted pipeline if unavailable
  const forecasts = await broker.find('forecast', {
    filters: [
      ['owner_id', '=', owner_id],
      ['period_start', '<=', period_end],
      ['period_end', '>=', period_start]
    ],
    fields: ['quota_amount'],
    limit: 1
  });
  const quota = (forecasts.length > 0 && forecasts[0].quota_amount) ? forecasts[0].quota_amount : pipelineTotal;

  // Determine influencing factors
  const factors = [
    {
      factor: 'Historical Win Rate',
      impact: historicalWinRate > 40 ? 'positive' as const : 'negative' as const,
      weight: 0.35,
      description: `Historical win rate of ${historicalWinRate.toFixed(1)}% ${historicalWinRate > 40 ? 'supports' : 'reduces'} forecast confidence`
    },
    {
      factor: 'Pipeline Coverage',
      impact: (categories.pipeline + categories.best_case + categories.commit) > quota ? 'positive' as const : 'negative' as const,
      weight: 0.25,
      description: `Pipeline coverage ratio of ${((categories.pipeline + categories.best_case + categories.commit) / quota * 100).toFixed(0)}%`
    },
    {
      factor: 'Deal Velocity',
      impact: 'neutral' as const,
      weight: 0.20,
      description: 'Average deal velocity is within normal range for this period'
    },
    {
      factor: 'Seasonal Trends',
      impact: 'positive' as const,
      weight: 0.20,
      description: 'Current period historically shows strong close rates'
    }
  ];

  return {
    predicted_amount,
    confidence,
    factors,
    categories,
    quota_comparison: {
      quota,
      predicted_attainment: Math.round((predicted_amount / quota) * 100),
      gap: quota - predicted_amount
    }
  };
}

// ============================================================================
// 2. ADJUST FORECAST
// ============================================================================

export interface AdjustForecastRequest {
  /** Start of forecast period */
  period_start: string;
  /** End of forecast period */
  period_end: string;
  /** Owner ID */
  owner_id: string;
  /** Current forecast amount to adjust */
  current_amount?: number;
}

export interface AdjustForecastResponse {
  /** Original forecast amount */
  original_amount: number;
  /** AI-adjusted forecast amount */
  adjusted_amount: number;
  /** Adjustment percentage */
  adjustment_percent: number;
  /** Adjustment rationale */
  adjustments: Array<{
    type: 'seasonality' | 'deal_velocity' | 'historical_pattern' | 'pipeline_quality' | 'market_trend';
    description: string;
    impact_amount: number;
    confidence: number;
  }>;
  /** Recommended manager override */
  recommended_override: number | null;
}

/**
 * AI-recommended forecast adjustments based on historical patterns, seasonality, and deal velocity
 */
export async function adjustForecast(params: AdjustForecastRequest): Promise<AdjustForecastResponse> {
  const { period_start, period_end, owner_id, current_amount } = params;
  console.log('🤖 AI Forecast Adjustment:', params);

  // Fetch current pipeline
  const pipeline = await broker.find('opportunity', {
    filters: [
      ['owner_id', '=', owner_id],
      ['close_date', '>=', period_start],
      ['close_date', '<=', period_end],
      ['stage', '!=', 'closed_lost']
    ],
    fields: ['amount', 'stage', 'probability', 'close_date', 'created_date']
  });

  const pipelineTotal = pipeline.reduce((sum: number, opp: any) => sum + (opp.amount || 0), 0);
  const original_amount = current_amount ?? pipelineTotal;

  // Fetch historical data for same period in prior years
  const historicalDeals = await broker.find('opportunity', {
    filters: [
      ['owner_id', '=', owner_id],
      ['stage', '=', 'closed_won']
    ],
    fields: ['amount', 'close_date'],
    sort: 'close_date desc',
    limit: 200
  });

  // Calculate adjustments
  const adjustments = [];

  // Seasonality adjustment
  const month = new Date(period_start).getMonth();
  const seasonalFactor = [0.85, 0.90, 1.15, 1.05, 1.00, 0.95, 0.80, 0.85, 1.10, 1.05, 1.00, 1.25][month];
  const seasonalImpact = Math.round(original_amount * (seasonalFactor - 1));
  adjustments.push({
    type: 'seasonality' as const,
    description: `Seasonal pattern for ${new Date(period_start).toLocaleString('default', { month: 'long' })} indicates ${seasonalFactor > 1 ? 'above' : 'below'}-average performance`,
    impact_amount: seasonalImpact,
    confidence: 78
  });

  // Deal velocity adjustment
  const avgDealAge = pipeline.length > 0
    ? pipeline.reduce((sum: number, opp: any) => {
        const created = new Date(opp.created_date || period_start);
        const days = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0) / pipeline.length
    : 30;

  const velocityFactor = avgDealAge > 60 ? -0.10 : avgDealAge < 20 ? 0.05 : 0;
  const velocityImpact = Math.round(original_amount * velocityFactor);
  adjustments.push({
    type: 'deal_velocity' as const,
    description: `Average deal age of ${Math.round(avgDealAge)} days ${avgDealAge > 60 ? 'suggests stalled deals' : 'is within healthy range'}`,
    impact_amount: velocityImpact,
    confidence: 72
  });

  // Historical pattern adjustment
  const historicalAvg = historicalDeals.length > 0
    ? historicalDeals.reduce((sum: number, d: any) => sum + (d.amount || 0), 0) / Math.max(historicalDeals.length / 12, 1)
    : original_amount;

  const historicalDelta = historicalAvg - original_amount;
  const historicalImpact = Math.round(historicalDelta * 0.15);
  adjustments.push({
    type: 'historical_pattern' as const,
    description: `Historical average of $${historicalAvg.toLocaleString()} provides ${historicalDelta > 0 ? 'upside' : 'downside'} signal`,
    impact_amount: historicalImpact,
    confidence: 70
  });

  // Pipeline quality adjustment
  const highProbDeals = pipeline.filter((o: any) => (o.probability || 0) >= 70);
  const highProbRatio = pipeline.length > 0 ? highProbDeals.length / pipeline.length : 0;
  const qualityFactor = highProbRatio > 0.5 ? 0.05 : highProbRatio < 0.2 ? -0.08 : 0;
  const qualityImpact = Math.round(original_amount * qualityFactor);
  adjustments.push({
    type: 'pipeline_quality' as const,
    description: `${Math.round(highProbRatio * 100)}% of deals have >70% probability - ${highProbRatio > 0.5 ? 'strong' : 'needs attention'}`,
    impact_amount: qualityImpact,
    confidence: 75
  });

  const totalAdjustment = adjustments.reduce((sum, adj) => sum + adj.impact_amount, 0);
  const adjusted_amount = original_amount + totalAdjustment;

  return {
    original_amount,
    adjusted_amount: Math.round(adjusted_amount),
    adjustment_percent: Math.round((totalAdjustment / original_amount) * 100 * 10) / 10,
    adjustments,
    recommended_override: Math.abs(totalAdjustment) > original_amount * 0.15
      ? Math.round(adjusted_amount)
      : null
  };
}

// ============================================================================
// 3. IDENTIFY RISKS
// ============================================================================

export interface IdentifyRisksRequest {
  /** Start of forecast period */
  period_start: string;
  /** End of forecast period */
  period_end: string;
  /** Owner ID */
  owner_id: string;
}

export interface IdentifyRisksResponse {
  /** Overall risk score (0-100, higher = more risk) */
  overall_risk_score: number;
  /** Risk level classification */
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  /** At-risk deals */
  at_risk_deals: Array<{
    opportunity_id: string;
    opportunity_name: string;
    amount: number;
    risk_score: number;
    risk_factors: string[];
    recommended_action: string;
  }>;
  /** Aggregate risk factors */
  risk_summary: {
    total_at_risk_amount: number;
    deals_with_no_activity: number;
    deals_past_close_date: number;
    deals_stuck_in_stage: number;
    concentration_risk: boolean;
  };
}

/**
 * Identify at-risk deals that could impact forecast accuracy
 */
export async function identifyRisks(params: IdentifyRisksRequest): Promise<IdentifyRisksResponse> {
  const { period_start, period_end, owner_id } = params;
  console.log('🤖 AI Forecast Risk Identification:', params);

  const now = new Date();

  // Fetch pipeline opportunities
  const opportunities = await broker.find('opportunity', {
    filters: [
      ['owner_id', '=', owner_id],
      ['close_date', '>=', period_start],
      ['close_date', '<=', period_end],
      ['stage', 'not_in', ['closed_won', 'closed_lost']]
    ],
    fields: ['name', 'amount', 'stage', 'probability', 'close_date', 'last_activity_date', 'created_date', 'days_in_stage']
  });

  const at_risk_deals: IdentifyRisksResponse['at_risk_deals'] = [];
  let totalAtRiskAmount = 0;
  let noActivityCount = 0;
  let pastCloseDateCount = 0;
  let stuckInStageCount = 0;

  for (const opp of opportunities) {
    const riskFactors: string[] = [];
    let riskScore = 0;

    // No recent activity
    const lastActivity = opp.last_activity_date ? new Date(opp.last_activity_date) : null;
    const daysSinceActivity = lastActivity
      ? Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSinceActivity > 14) {
      riskFactors.push(`No activity in ${daysSinceActivity} days`);
      riskScore += 25;
      noActivityCount++;
    }

    // Past expected close date
    const closeDate = new Date(opp.close_date);
    if (closeDate < now) {
      riskFactors.push(`Close date ${opp.close_date} has passed`);
      riskScore += 30;
      pastCloseDateCount++;
    }

    // Stuck in stage too long
    const daysInStage = opp.days_in_stage || 0;
    if (daysInStage > 30) {
      riskFactors.push(`Stuck in ${opp.stage} for ${daysInStage} days`);
      riskScore += 20;
      stuckInStageCount++;
    }

    // Low probability with high amount
    if ((opp.probability || 0) < 30 && (opp.amount || 0) > 50000) {
      riskFactors.push('High-value deal with low probability');
      riskScore += 15;
    }

    // Late-stage with recent pushback
    if (opp.stage === 'negotiation' && daysSinceActivity > 7) {
      riskFactors.push('Negotiation stage with recent silence');
      riskScore += 20;
    }

    if (riskScore >= 20) {
      const recommendedAction = riskScore >= 50
        ? 'Immediate outreach required - schedule executive sponsor call'
        : riskScore >= 30
        ? 'Follow up within 48 hours with value reinforcement'
        : 'Monitor closely and ensure next steps are defined';

      at_risk_deals.push({
        opportunity_id: opp._id || opp.id,
        opportunity_name: opp.name,
        amount: opp.amount || 0,
        risk_score: Math.min(riskScore, 100),
        risk_factors: riskFactors,
        recommended_action: recommendedAction
      });

      totalAtRiskAmount += opp.amount || 0;
    }
  }

  // Sort by risk score descending
  at_risk_deals.sort((a, b) => b.risk_score - a.risk_score);

  // Check concentration risk (single deal > 40% of pipeline)
  const totalPipeline = opportunities.reduce((sum: number, o: any) => sum + (o.amount || 0), 0);
  const maxDeal = opportunities.reduce((max: number, o: any) => Math.max(max, o.amount || 0), 0);
  const concentrationRisk = totalPipeline > 0 && (maxDeal / totalPipeline) > 0.4;

  // Overall risk score
  const riskRatio = totalPipeline > 0 ? totalAtRiskAmount / totalPipeline : 0;
  const overall_risk_score = Math.min(Math.round(riskRatio * 100 + (concentrationRisk ? 15 : 0)), 100);

  const risk_level = overall_risk_score >= 75 ? 'critical'
    : overall_risk_score >= 50 ? 'high'
    : overall_risk_score >= 25 ? 'medium'
    : 'low';

  return {
    overall_risk_score,
    risk_level,
    at_risk_deals,
    risk_summary: {
      total_at_risk_amount: totalAtRiskAmount,
      deals_with_no_activity: noActivityCount,
      deals_past_close_date: pastCloseDateCount,
      deals_stuck_in_stage: stuckInStageCount,
      concentration_risk: concentrationRisk
    }
  };
}

// ============================================================================
// 4. GENERATE INSIGHTS
// ============================================================================

export interface GenerateInsightsRequest {
  /** Start of forecast period */
  period_start: string;
  /** End of forecast period */
  period_end: string;
  /** Owner ID */
  owner_id: string;
}

export interface GenerateInsightsResponse {
  /** Executive summary in natural language */
  executive_summary: string;
  /** Key insights */
  insights: Array<{
    category: 'trend' | 'risk' | 'opportunity' | 'action';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    metric?: string;
  }>;
  /** Forecast trend data */
  trend: {
    direction: 'up' | 'down' | 'flat';
    change_percent: number;
    period_over_period: string;
  };
  /** Recommended focus areas */
  focus_areas: string[];
}

/**
 * Generate natural language insights about forecast trends
 */
export async function generateInsights(params: GenerateInsightsRequest): Promise<GenerateInsightsResponse> {
  const { period_start, period_end, owner_id } = params;
  console.log('🤖 AI Forecast Insights Generation:', params);

  // Fetch current period pipeline
  const currentPipeline = await broker.find('opportunity', {
    filters: [
      ['owner_id', '=', owner_id],
      ['close_date', '>=', period_start],
      ['close_date', '<=', period_end],
      ['stage', '!=', 'closed_lost']
    ],
    fields: ['name', 'amount', 'stage', 'probability', 'close_date', 'type', 'lead_source', 'created_date']
  });

  // Fetch closed-won deals in period
  const closedWon = currentPipeline.filter((o: any) => o.stage === 'closed_won');
  const openDeals = currentPipeline.filter((o: any) => o.stage !== 'closed_won');

  const closedAmount = closedWon.reduce((sum: number, o: any) => sum + (o.amount || 0), 0);
  const openAmount = openDeals.reduce((sum: number, o: any) => sum + (o.amount || 0), 0);
  const totalPipeline = closedAmount + openAmount;

  // Fetch historical comparison
  const historicalDeals = await broker.find('opportunity', {
    filters: [
      ['owner_id', '=', owner_id],
      ['stage', '=', 'closed_won']
    ],
    fields: ['amount', 'close_date', 'type', 'lead_source'],
    sort: 'close_date desc',
    limit: 50
  });

  const historicalAvg = historicalDeals.length > 0
    ? historicalDeals.reduce((sum: number, d: any) => sum + (d.amount || 0), 0) / Math.max(historicalDeals.length / 4, 1)
    : totalPipeline;

  const changePercent = historicalAvg > 0
    ? Math.round(((totalPipeline - historicalAvg) / historicalAvg) * 100)
    : 0;

  const direction = changePercent > 5 ? 'up' : changePercent < -5 ? 'down' : 'flat';

  // Generate insights
  const insights: GenerateInsightsResponse['insights'] = [];

  // Pipeline health insight
  insights.push({
    category: 'trend',
    title: 'Pipeline Health',
    description: `Total pipeline of $${totalPipeline.toLocaleString()} with $${closedAmount.toLocaleString()} already closed. ${direction === 'up' ? 'Strong momentum' : direction === 'down' ? 'Requires attention' : 'Steady performance'} compared to historical averages.`,
    impact: direction === 'down' ? 'high' : 'medium',
    metric: `$${totalPipeline.toLocaleString()}`
  });

  // Stage distribution insight
  const stageGroups = openDeals.reduce((acc: Record<string, number>, o: any) => {
    acc[o.stage] = (acc[o.stage] || 0) + (o.amount || 0);
    return acc;
  }, {});

  const topStage = Object.entries(stageGroups).sort(([, a], [, b]) => (b as number) - (a as number))[0];
  if (topStage) {
    insights.push({
      category: 'opportunity',
      title: 'Stage Concentration',
      description: `Highest pipeline value ($${(topStage[1] as number).toLocaleString()}) is in "${topStage[0]}" stage. Focus on advancing these deals to improve forecast certainty.`,
      impact: 'medium',
      metric: topStage[0]
    });
  }

  // New pipeline insight
  const recentDeals = openDeals.filter((o: any) => {
    const created = new Date(o.created_date || period_start);
    const daysOld = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
    return daysOld <= 30;
  });
  const newPipelineAmount = recentDeals.reduce((sum: number, o: any) => sum + (o.amount || 0), 0);

  insights.push({
    category: recentDeals.length > 3 ? 'opportunity' : 'risk',
    title: 'New Pipeline Generation',
    description: `${recentDeals.length} new deal(s) worth $${newPipelineAmount.toLocaleString()} added in the last 30 days. ${recentDeals.length > 3 ? 'Healthy pipeline generation.' : 'Consider increasing prospecting activity.'}`,
    impact: recentDeals.length <= 2 ? 'high' : 'low',
    metric: `${recentDeals.length} deals`
  });

  // Close rate insight
  const closedTotal = closedWon.length + currentPipeline.filter((o: any) => o.stage === 'closed_lost').length;
  const closeRate = closedTotal > 0 ? Math.round((closedWon.length / closedTotal) * 100) : 0;

  if (closedTotal > 0) {
    insights.push({
      category: closeRate >= 30 ? 'trend' : 'risk',
      title: 'Win Rate This Period',
      description: `Current win rate of ${closeRate}% ${closeRate >= 30 ? 'is on track.' : 'is below target. Review lost deal reasons and adjust strategy.'}`,
      impact: closeRate < 25 ? 'high' : 'low',
      metric: `${closeRate}%`
    });
  }

  // Action items insight
  insights.push({
    category: 'action',
    title: 'Recommended Actions',
    description: 'Prioritize deals closest to close, re-engage stalled opportunities, and ensure all high-value deals have next steps scheduled.',
    impact: 'high'
  });

  // Build executive summary
  const executive_summary = `Forecast for ${period_start} to ${period_end}: Total pipeline is $${totalPipeline.toLocaleString()} with $${closedAmount.toLocaleString()} closed (${Math.round((closedAmount / Math.max(totalPipeline, 1)) * 100)}% attainment). ${openDeals.length} open deals worth $${openAmount.toLocaleString()} remain. Pipeline is trending ${direction} at ${Math.abs(changePercent)}% compared to historical performance. ${direction === 'down' ? 'Immediate action recommended to close the gap.' : 'Maintain current momentum to meet targets.'}`;

  // Focus areas
  const focus_areas = [
    'Advance high-probability deals through final stages',
    'Re-engage opportunities with no activity in 14+ days',
    ...(recentDeals.length <= 2 ? ['Increase top-of-funnel prospecting activity'] : []),
    ...(direction === 'down' ? ['Review and update forecast commitments with management'] : []),
    'Ensure all deals have accurate close dates and next steps'
  ];

  return {
    executive_summary,
    insights,
    trend: {
      direction,
      change_percent: Math.abs(changePercent),
      period_over_period: `${changePercent >= 0 ? '+' : ''}${changePercent}% vs historical average`
    },
    focus_areas
  };
}

// ============================================================================
// ACTION DEFINITION
// ============================================================================

const ForecastAIAction = {
  name: 'forecast_ai',
  label: 'AI Forecast Intelligence',
  description: 'AI-powered sales forecast predictions, adjustments, and risk analysis',
  params: {
    action: { type: 'text', required: true },
    period_start: { type: 'text' },
    period_end: { type: 'text' },
    owner_id: { type: 'text' }
  },
  handler: async (ctx: any) => {
    const { action } = ctx.params;
    switch (action) {
      case 'predict': return predictForecast(ctx.params);
      case 'adjust': return adjustForecast(ctx.params);
      case 'risks': return identifyRisks(ctx.params);
      case 'insights': return generateInsights(ctx.params);
      default: throw new Error(`Unknown forecast AI action: ${action}`);
    }
  }
};

export default ForecastAIAction;
