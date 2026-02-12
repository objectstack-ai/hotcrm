/**
 * Revenue Recognition AI Actions
 * 
 * This ObjectStack Action provides AI-powered revenue recognition capabilities.
 * 
 * Functionality:
 * 1. Predict Revenue - Predict future revenue recognition based on pipeline
 * 2. Check Compliance - AI-assisted ASC 606 compliance review
 * 3. Optimize Schedule - Suggest optimal recognition schedules
 * 4. Forecast Deferred - Forecast deferred revenue trends
 */

import { broker } from '../db';

// ============================================================================
// 1. PREDICT REVENUE
// ============================================================================

export interface PredictRevenueRequest {
  /** Start of forecast period (ISO date) */
  period_start: string;
  /** End of forecast period (ISO date) */
  period_end: string;
  /** Optional contract ID to scope prediction */
  contract_id?: string;
}

export interface PredictRevenueResponse {
  /** Predicted revenue for the period */
  predicted_revenue: number;
  /** AI confidence score (0-100) */
  confidence: number;
  /** Revenue breakdown by method */
  by_method: Record<string, number>;
  /** Monthly projection */
  monthly_projection: Array<{
    month: string;
    amount: number;
  }>;
  /** Total deferred at period end */
  deferred_at_period_end: number;
}

/**
 * Predict future revenue recognition based on active schedules and pipeline
 */
export async function predictRevenue(params: PredictRevenueRequest): Promise<PredictRevenueResponse> {
  const { period_start, period_end, contract_id } = params;
  console.log('🤖 AI Revenue Prediction:', params);

  const filters: Array<[string, string, any]> = [
    ['status', '=', 'active'],
    ['recognition_end_date', '>=', period_start],
    ['recognition_start_date', '<=', period_end]
  ];
  if (contract_id) {
    filters.push(['contract_id', '=', contract_id]);
  }

  const schedules = await broker.find('revenue_schedule', {
    filters,
    fields: ['name', 'total_amount', 'recognized_amount', 'deferred_amount', 'recognition_method', 'amount_per_period', 'periods_total', 'periods_recognized', 'recognition_start_date', 'recognition_end_date', 'frequency']
  });

  let totalPredicted = 0;
  let totalDeferred = 0;
  const byMethod: Record<string, number> = {};
  const monthlyMap: Record<string, number> = {};

  for (const schedule of schedules) {
    const amountPerPeriod = schedule.amount_per_period || 0;
    const remainingPeriods = (schedule.periods_total || 0) - (schedule.periods_recognized || 0);
    const periodsInRange = Math.min(remainingPeriods, estimatePeriodsInRange(schedule.frequency, period_start, period_end));
    const schedulePredicted = amountPerPeriod * periodsInRange;

    totalPredicted += schedulePredicted;
    totalDeferred += (schedule.deferred_amount || 0) - schedulePredicted;

    const method = schedule.recognition_method || 'straight_line';
    byMethod[method] = (byMethod[method] || 0) + schedulePredicted;

    // Distribute across months
    distributeAcrossMonths(monthlyMap, period_start, periodsInRange, amountPerPeriod, schedule.frequency);
  }

  const monthly_projection = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month, amount: Math.round(amount * 100) / 100 }));

  const confidence = Math.min(Math.round(70 + (schedules.length / 50) * 20), 95);

  return {
    predicted_revenue: Math.round(totalPredicted * 100) / 100,
    confidence,
    by_method: byMethod,
    monthly_projection,
    deferred_at_period_end: Math.max(Math.round(totalDeferred * 100) / 100, 0)
  };
}

// ============================================================================
// 2. CHECK COMPLIANCE
// ============================================================================

export interface CheckComplianceRequest {
  /** Revenue schedule ID to review */
  schedule_id?: string;
  /** Or review all active schedules */
  review_all?: boolean;
}

export interface CheckComplianceResponse {
  /** Overall compliance score (0-100) */
  compliance_score: number;
  /** Compliance status */
  status: 'compliant' | 'needs_review' | 'non_compliant';
  /** Individual findings */
  findings: Array<{
    schedule_id: string;
    schedule_name: string;
    issue: string;
    severity: 'high' | 'medium' | 'low';
    recommendation: string;
  }>;
  /** Summary statistics */
  summary: {
    total_reviewed: number;
    compliant: number;
    needs_review: number;
    non_compliant: number;
  };
}

/**
 * AI-assisted ASC 606 compliance review of revenue recognition schedules
 */
export async function checkCompliance(params: CheckComplianceRequest): Promise<CheckComplianceResponse> {
  const { schedule_id, review_all } = params;
  console.log('🤖 AI Compliance Check:', params);

  const filters: Array<[string, string, any]> = schedule_id
    ? [['_id', '=', schedule_id]]
    : [['status', 'in', ['active', 'draft']]];

  const schedules = await broker.find('revenue_schedule', {
    filters,
    fields: ['name', 'total_amount', 'recognized_amount', 'deferred_amount', 'recognition_method', 'recognition_start_date', 'recognition_end_date', 'periods_total', 'contract_id', 'recognition_rule_id']
  });

  const findings: CheckComplianceResponse['findings'] = [];
  let compliantCount = 0;
  let needsReviewCount = 0;
  let nonCompliantCount = 0;

  for (const schedule of schedules) {
    let scheduleIssues = 0;

    // Check: recognition dates must be set
    if (!schedule.recognition_start_date || !schedule.recognition_end_date) {
      findings.push({
        schedule_id: schedule._id || schedule.id,
        schedule_name: schedule.name,
        issue: 'Missing recognition dates',
        severity: 'high',
        recommendation: 'Set recognition start and end dates per ASC 606 performance obligation timeline'
      });
      scheduleIssues++;
    }

    // Check: total amount must be positive
    if (!schedule.total_amount || schedule.total_amount <= 0) {
      findings.push({
        schedule_id: schedule._id || schedule.id,
        schedule_name: schedule.name,
        issue: 'Invalid total amount',
        severity: 'high',
        recommendation: 'Ensure total transaction price is correctly allocated per ASC 606 Step 4'
      });
      scheduleIssues++;
    }

    // Check: recognized amount should not exceed total
    if ((schedule.recognized_amount || 0) > (schedule.total_amount || 0)) {
      findings.push({
        schedule_id: schedule._id || schedule.id,
        schedule_name: schedule.name,
        issue: 'Recognized amount exceeds total amount',
        severity: 'high',
        recommendation: 'Review and correct over-recognition — potential restatement required'
      });
      scheduleIssues++;
    }

    // Check: must have a recognition rule
    if (!schedule.recognition_rule_id) {
      findings.push({
        schedule_id: schedule._id || schedule.id,
        schedule_name: schedule.name,
        issue: 'No recognition rule assigned',
        severity: 'medium',
        recommendation: 'Assign a revenue recognition rule to ensure consistent ASC 606 treatment'
      });
      scheduleIssues++;
    }

    if (scheduleIssues === 0) {
      compliantCount++;
    } else if (scheduleIssues === 1) {
      needsReviewCount++;
    } else {
      nonCompliantCount++;
    }
  }

  const total_reviewed = schedules.length;
  const compliance_score = total_reviewed > 0
    ? Math.round((compliantCount / total_reviewed) * 100)
    : 100;

  const status = compliance_score >= 90 ? 'compliant'
    : compliance_score >= 60 ? 'needs_review'
    : 'non_compliant';

  return {
    compliance_score,
    status,
    findings,
    summary: {
      total_reviewed,
      compliant: compliantCount,
      needs_review: needsReviewCount,
      non_compliant: nonCompliantCount
    }
  };
}

// ============================================================================
// 3. OPTIMIZE SCHEDULE
// ============================================================================

export interface OptimizeScheduleRequest {
  /** Contract ID to optimize schedules for */
  contract_id: string;
}

export interface OptimizeScheduleResponse {
  /** Optimization suggestions */
  suggestions: Array<{
    schedule_id: string;
    schedule_name: string;
    current_method: string;
    suggested_method: string;
    reason: string;
    estimated_impact: number;
  }>;
  /** Overall optimization score */
  optimization_score: number;
  /** Summary */
  summary: string;
}

/**
 * Suggest optimal recognition schedules based on contract terms and compliance requirements
 */
export async function optimizeSchedule(params: OptimizeScheduleRequest): Promise<OptimizeScheduleResponse> {
  const { contract_id } = params;
  console.log('🤖 AI Schedule Optimization:', params);

  const schedules = await broker.find('revenue_schedule', {
    filters: [['contract_id', '=', contract_id]],
    fields: ['name', 'total_amount', 'recognition_method', 'frequency', 'periods_total', 'recognition_start_date', 'recognition_end_date', 'status']
  });

  const contracts = await broker.find('contract', {
    filters: [['_id', '=', contract_id]],
    fields: ['name', 'contract_value', 'start_date', 'end_date', 'type'],
    limit: 1
  });
  const contract = contracts[0] || {};

  const suggestions: OptimizeScheduleResponse['suggestions'] = [];

  for (const schedule of schedules) {
    if (schedule.status === 'completed' || schedule.status === 'cancelled') continue;

    const currentMethod = schedule.recognition_method || 'straight_line';
    let suggestedMethod = currentMethod;
    let reason = '';
    let estimatedImpact = 0;

    // Suggest milestone for large multi-period contracts
    if (currentMethod === 'straight_line' && (schedule.total_amount || 0) > 100000 && (schedule.periods_total || 0) > 6) {
      suggestedMethod = 'milestone';
      reason = 'Large contract with extended term — milestone-based recognition may better align with performance obligations';
      estimatedImpact = Math.round((schedule.total_amount || 0) * 0.05);
    }

    // Suggest point-in-time for short-duration schedules
    if (currentMethod === 'straight_line' && (schedule.periods_total || 0) <= 1) {
      suggestedMethod = 'point_in_time';
      reason = 'Single-period schedule — point-in-time recognition simplifies compliance';
      estimatedImpact = 0;
    }

    if (suggestedMethod !== currentMethod) {
      suggestions.push({
        schedule_id: schedule._id || schedule.id,
        schedule_name: schedule.name,
        current_method: currentMethod,
        suggested_method: suggestedMethod,
        reason,
        estimated_impact: estimatedImpact
      });
    }
  }

  const optimization_score = schedules.length > 0
    ? Math.round(100 - (suggestions.length / schedules.length) * 40)
    : 100;

  const summary = suggestions.length > 0
    ? `Found ${suggestions.length} optimization opportunity(ies) across ${schedules.length} schedule(s) for contract "${contract.name || contract_id}".`
    : `All ${schedules.length} schedule(s) for contract "${contract.name || contract_id}" are optimally configured.`;

  return {
    suggestions,
    optimization_score,
    summary
  };
}

// ============================================================================
// 4. FORECAST DEFERRED
// ============================================================================

export interface ForecastDeferredRequest {
  /** Number of months to forecast */
  forecast_months: number;
  /** Optional filter by contract */
  contract_id?: string;
}

export interface ForecastDeferredResponse {
  /** Current total deferred revenue */
  current_deferred: number;
  /** Projected deferred revenue by month */
  monthly_forecast: Array<{
    month: string;
    deferred_balance: number;
    recognized_in_month: number;
    new_deferred: number;
  }>;
  /** Projected deferred at end of forecast period */
  projected_deferred_end: number;
  /** Trend direction */
  trend: 'increasing' | 'decreasing' | 'stable';
}

/**
 * Forecast deferred revenue trends over the specified period
 */
export async function forecastDeferred(params: ForecastDeferredRequest): Promise<ForecastDeferredResponse> {
  const { forecast_months, contract_id } = params;
  console.log('🤖 AI Deferred Revenue Forecast:', params);

  const filters: Array<[string, string, any]> = [
    ['status', '=', 'active']
  ];
  if (contract_id) {
    filters.push(['contract_id', '=', contract_id]);
  }

  const schedules = await broker.find('revenue_schedule', {
    filters,
    fields: ['total_amount', 'recognized_amount', 'deferred_amount', 'amount_per_period', 'periods_total', 'periods_recognized', 'frequency', 'recognition_end_date']
  });

  const currentDeferred = schedules.reduce((sum: number, s: any) => sum + (s.deferred_amount || 0), 0);

  const monthly_forecast: ForecastDeferredResponse['monthly_forecast'] = [];
  let runningDeferred = currentDeferred;
  const now = new Date();

  for (let i = 0; i < forecast_months; i++) {
    const forecastDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    const monthKey = forecastDate.toISOString().slice(0, 7);

    let recognizedInMonth = 0;

    for (const schedule of schedules) {
      const endDate = new Date(schedule.recognition_end_date);
      if (forecastDate > endDate) continue;

      const remaining = (schedule.periods_total || 0) - (schedule.periods_recognized || 0);
      if (remaining <= 0) continue;

      const freq = schedule.frequency || 'monthly';
      if (freq === 'monthly') {
        recognizedInMonth += schedule.amount_per_period || 0;
      } else if (freq === 'quarterly' && i % 3 === 0) {
        recognizedInMonth += schedule.amount_per_period || 0;
      } else if (freq === 'annually' && i % 12 === 0) {
        recognizedInMonth += schedule.amount_per_period || 0;
      }
    }

    // Estimate new deferred from pipeline (simplified heuristic)
    const newDeferred = Math.round(recognizedInMonth * 0.3);

    runningDeferred = runningDeferred - recognizedInMonth + newDeferred;

    monthly_forecast.push({
      month: monthKey,
      deferred_balance: Math.round(Math.max(runningDeferred, 0) * 100) / 100,
      recognized_in_month: Math.round(recognizedInMonth * 100) / 100,
      new_deferred: newDeferred
    });
  }

  const projectedEnd = monthly_forecast.length > 0
    ? monthly_forecast[monthly_forecast.length - 1].deferred_balance
    : currentDeferred;

  const trend = projectedEnd > currentDeferred * 1.05 ? 'increasing'
    : projectedEnd < currentDeferred * 0.95 ? 'decreasing'
    : 'stable';

  return {
    current_deferred: Math.round(currentDeferred * 100) / 100,
    monthly_forecast,
    projected_deferred_end: projectedEnd,
    trend
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function estimatePeriodsInRange(frequency: string, periodStart: string, periodEnd: string): number {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;

  switch (frequency) {
    case 'quarterly': return Math.ceil(monthsDiff / 3);
    case 'annually': return Math.ceil(monthsDiff / 12);
    default: return monthsDiff; // monthly
  }
}

function distributeAcrossMonths(monthlyMap: Record<string, number>, periodStart: string, periods: number, amountPerPeriod: number, frequency: string): void {
  const start = new Date(periodStart);
  const monthStep = frequency === 'quarterly' ? 3 : frequency === 'annually' ? 12 : 1;

  for (let i = 0; i < periods; i++) {
    const date = new Date(start.getFullYear(), start.getMonth() + (i * monthStep), 1);
    const key = date.toISOString().slice(0, 7);
    monthlyMap[key] = (monthlyMap[key] || 0) + amountPerPeriod;
  }
}

// ============================================================================
// ACTION DEFINITION
// ============================================================================

const RevenueRecognitionAIAction = {
  name: 'revenue_recognition_ai',
  label: 'AI Revenue Recognition Intelligence',
  description: 'AI-powered revenue recognition predictions, compliance checks, and deferred revenue forecasting',
  params: {
    action: { type: 'text', required: true },
    period_start: { type: 'text' },
    period_end: { type: 'text' },
    contract_id: { type: 'text' },
    schedule_id: { type: 'text' },
    forecast_months: { type: 'number' },
    review_all: { type: 'boolean' }
  },
  handler: async (ctx: any) => {
    const { action } = ctx.params;
    switch (action) {
      case 'predict': return predictRevenue(ctx.params);
      case 'compliance': return checkCompliance(ctx.params);
      case 'optimize': return optimizeSchedule(ctx.params);
      case 'forecast_deferred': return forecastDeferred(ctx.params);
      default: throw new Error(`Unknown revenue recognition AI action: ${action}`);
    }
  }
};

export default RevenueRecognitionAIAction;
