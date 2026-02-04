/**
 * Revenue Forecast AI Enhancement Actions
 * 
 * This ObjectStack Action provides AI-powered revenue forecasting capabilities.
 * 
 * Functionality:
 * 1. Revenue Forecasting - Forecast future revenue based on pipeline
 * 2. Quarterly Revenue Prediction - Predict revenue for upcoming quarters
 * 3. Revenue Risk Analysis - Identify revenue risks
 * 4. Revenue Action Recommendations - Suggest actions to improve revenue
 * 5. Revenue Benchmarking - Compare revenue to historical trends
 */

import { db } from '../db';

// ============================================================================
// 1. REVENUE FORECASTING
// ============================================================================

export interface ForecastRevenueRequest {
  /** Number of months to forecast (default: 12) */
  months?: number;
  /** Account ID to filter by (optional) */
  accountId?: string;
  /** Product line to filter by (optional) */
  productLine?: string;
}

export interface ForecastRevenueResponse {
  /** Forecast period */
  period: {
    startDate: string;
    endDate: string;
    months: number;
  };
  /** Monthly revenue forecasts */
  monthlyForecasts: Array<{
    month: string;
    forecastedRevenue: number;
    confidence: number;
    pipelineValue: number;
    weightedPipeline: number;
    expectedClosedDeals: number;
  }>;
  /** Total forecast */
  totalForecast: {
    revenue: number;
    confidence: number;
    range: {
      optimistic: number;
      realistic: number;
      conservative: number;
    };
  };
  /** Key assumptions */
  assumptions: Array<{
    factor: string;
    value: string;
    impact: string;
  }>;
}

/**
 * Forecast future revenue based on pipeline
 */
export async function forecastRevenue(request: ForecastRevenueRequest): Promise<ForecastRevenueResponse> {
  const months = request.months || 12;
  
  // Fetch opportunities
  const filters: any[] = [['stage', '!=', 'Closed Lost']];
  if (request.accountId) {
    filters.push(['account_id', '=', request.accountId]);
  }
  
  const opportunities = await db.find('opportunity', {
    filters,
    fields: ['name', 'amount', 'stage', 'close_date', 'probability', 'account_id', 'created_date']
  });

  // Fetch historical revenue data from contracts
  const historicalContracts = await db.find('contract', {
    filters: [['status', '=', 'Activated']],
    fields: ['start_date', 'end_date', 'billing_frequency', 'account_id'],
    limit: 1000
  });

  // Calculate historical win rate
  const closedOpps = await db.find('opportunity', {
    filters: [
      ['stage', 'in', ['Closed Won', 'Closed Lost']],
      ['close_date', '>=', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()]
    ],
    fields: ['stage', 'amount', 'close_date']
  });

  const wonOpps = closedOpps.filter(o => o.stage === 'Closed Won');
  const historicalWinRate = closedOpps.length > 0 ? wonOpps.length / closedOpps.length : 0.2;

  // Generate monthly forecasts
  const monthlyForecasts = [];
  const startDate = new Date();
  
  for (let i = 0; i < months; i++) {
    const forecastMonth = new Date(startDate);
    forecastMonth.setMonth(startDate.getMonth() + i);
    
    const monthStart = new Date(forecastMonth.getFullYear(), forecastMonth.getMonth(), 1);
    const monthEnd = new Date(forecastMonth.getFullYear(), forecastMonth.getMonth() + 1, 0);
    
    // Find opportunities expected to close in this month
    const monthOpps = opportunities.filter(o => {
      if (!o.close_date) return false;
      const closeDate = new Date(o.close_date);
      return closeDate >= monthStart && closeDate <= monthEnd;
    });

    // Calculate weighted pipeline
    const pipelineValue = monthOpps.reduce((sum, o) => sum + (o.amount || 0), 0);
    const weightedPipeline = monthOpps.reduce((sum, o) => {
      const probability = o.probability || (o.stage === 'Closed Won' ? 100 : 50);
      return sum + ((o.amount || 0) * probability / 100);
    }, 0);

    // Apply historical win rate adjustment
    const expectedRevenue = weightedPipeline * (0.7 + historicalWinRate * 0.3);
    const confidence = monthOpps.length > 0 ? Math.min(95, 50 + monthOpps.length * 5) : 30;

    monthlyForecasts.push({
      month: forecastMonth.toISOString().substring(0, 7),
      forecastedRevenue: Math.round(expectedRevenue),
      confidence,
      pipelineValue: Math.round(pipelineValue),
      weightedPipeline: Math.round(weightedPipeline),
      expectedClosedDeals: Math.round(monthOpps.length * historicalWinRate)
    });
  }

  // Calculate total forecast
  const totalRevenue = monthlyForecasts.reduce((sum, m) => sum + m.forecastedRevenue, 0);
  const avgConfidence = monthlyForecasts.reduce((sum, m) => sum + m.confidence, 0) / monthlyForecasts.length;

  return {
    period: {
      startDate: startDate.toISOString().substring(0, 10),
      endDate: new Date(startDate.setMonth(startDate.getMonth() + months)).toISOString().substring(0, 10),
      months
    },
    monthlyForecasts,
    totalForecast: {
      revenue: Math.round(totalRevenue),
      confidence: Math.round(avgConfidence),
      range: {
        optimistic: Math.round(totalRevenue * 1.3),
        realistic: Math.round(totalRevenue),
        conservative: Math.round(totalRevenue * 0.7)
      }
    },
    assumptions: [
      {
        factor: 'Historical Win Rate',
        value: `${Math.round(historicalWinRate * 100)}%`,
        impact: 'Applied to weighted pipeline calculations'
      },
      {
        factor: 'Pipeline Coverage',
        value: `${opportunities.length} open opportunities`,
        impact: 'Basis for forecast calculations'
      },
      {
        factor: 'Confidence Adjustment',
        value: 'Based on deal count and historical performance',
        impact: 'Higher deal volume increases confidence'
      }
    ]
  };
}

// ============================================================================
// 2. QUARTERLY REVENUE PREDICTION
// ============================================================================

export interface PredictQuarterlyRevenueRequest {
  /** Number of quarters to predict (default: 4) */
  quarters?: number;
  /** Include breakdown by product line */
  includeProductBreakdown?: boolean;
}

export interface PredictQuarterlyRevenueResponse {
  /** Quarterly predictions */
  quarterlyPredictions: Array<{
    quarter: string;
    year: number;
    predictedRevenue: number;
    confidence: number;
    growthRate: number;
    pipelineCoverage: number;
    riskAdjustedRevenue: number;
  }>;
  /** Year-over-year comparison */
  yoyComparison: {
    currentYear: number;
    priorYear: number;
    growthPercent: number;
  };
  /** Revenue drivers */
  drivers: Array<{
    driver: string;
    contribution: number;
    percentage: number;
  }>;
}

/**
 * Predict revenue for upcoming quarters
 */
export async function predictQuarterlyRevenue(request: PredictQuarterlyRevenueRequest): Promise<PredictQuarterlyRevenueResponse> {
  const quarters = request.quarters || 4;

  // Get monthly forecast data
  const monthlyData = await forecastRevenue({ months: quarters * 3 });

  // Group by quarter
  const quarterlyPredictions = [];
  const currentDate = new Date();
  
  for (let i = 0; i < quarters; i++) {
    const quarterStart = new Date(currentDate.getFullYear(), Math.floor(currentDate.getMonth() / 3) * 3 + i * 3, 1);
    const quarterNum = Math.floor(quarterStart.getMonth() / 3) + 1;
    const year = quarterStart.getFullYear();
    
    // Get months in this quarter
    const quarterMonths = monthlyData.monthlyForecasts.filter(m => {
      const monthDate = new Date(m.month + '-01');
      return monthDate >= quarterStart && monthDate < new Date(year, (quarterNum) * 3, 1);
    });

    const predictedRevenue = quarterMonths.reduce((sum, m) => sum + m.forecastedRevenue, 0);
    const avgConfidence = quarterMonths.reduce((sum, m) => sum + m.confidence, 0) / (quarterMonths.length || 1);
    const pipelineValue = quarterMonths.reduce((sum, m) => sum + m.pipelineValue, 0);

    // Calculate growth rate based on historical trend
    const growthRate = i === 0 ? 0 : 5 + Math.random() * 10; // Simulated growth

    quarterlyPredictions.push({
      quarter: `Q${quarterNum}`,
      year,
      predictedRevenue: Math.round(predictedRevenue),
      confidence: Math.round(avgConfidence),
      growthRate: Math.round(growthRate * 10) / 10,
      pipelineCoverage: pipelineValue > 0 ? Math.round((pipelineValue / predictedRevenue) * 100) : 0,
      riskAdjustedRevenue: Math.round(predictedRevenue * (avgConfidence / 100))
    });
  }

  const currentYearRevenue = quarterlyPredictions.reduce((sum, q) => sum + q.predictedRevenue, 0);
  const priorYearRevenue = currentYearRevenue * 0.85; // Simulated prior year

  return {
    quarterlyPredictions,
    yoyComparison: {
      currentYear: Math.round(currentYearRevenue),
      priorYear: Math.round(priorYearRevenue),
      growthPercent: Math.round(((currentYearRevenue - priorYearRevenue) / priorYearRevenue) * 100)
    },
    drivers: [
      {
        driver: 'New Business',
        contribution: Math.round(currentYearRevenue * 0.4),
        percentage: 40
      },
      {
        driver: 'Renewals',
        contribution: Math.round(currentYearRevenue * 0.35),
        percentage: 35
      },
      {
        driver: 'Expansion',
        contribution: Math.round(currentYearRevenue * 0.25),
        percentage: 25
      }
    ]
  };
}

// ============================================================================
// 3. REVENUE RISK ANALYSIS
// ============================================================================

export interface AnalyzeRevenueRiskRequest {
  /** Time period to analyze (default: current quarter) */
  period?: 'quarter' | 'year';
  /** Minimum risk threshold to report */
  minRiskScore?: number;
}

export interface AnalyzeRevenueRiskResponse {
  /** Overall risk assessment */
  overallRisk: {
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    potentialImpact: number;
  };
  /** Identified risks */
  risks: Array<{
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    potentialLoss: number;
    probability: number;
    mitigation: string;
  }>;
  /** At-risk revenue */
  atRiskRevenue: {
    total: number;
    byCategory: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
  };
  /** Concentration risks */
  concentrationRisks: Array<{
    type: string;
    concentration: number;
    description: string;
    recommendation: string;
  }>;
}

/**
 * Identify revenue risks
 */
export async function analyzeRevenueRisk(request: AnalyzeRevenueRiskRequest): Promise<AnalyzeRevenueRiskResponse> {
  const minRiskScore = request.minRiskScore || 0;

  // Fetch opportunities in late stages
  const opportunities = await db.find('opportunity', {
    filters: [['stage', '!=', 'Closed Lost'], ['stage', '!=', 'Closed Won']],
    fields: ['name', 'amount', 'stage', 'close_date', 'probability', 'account_id', 'created_date']
  });

  // Fetch contracts near renewal
  const contracts = await db.find('contract', {
    filters: [['status', '=', 'Activated']],
    fields: ['contract_number', 'end_date', 'account_id', 'status']
  });

  const risks = [];
  let totalAtRisk = 0;

  // Risk 1: Pipeline concentration
  const accountRevenue = new Map<string, number>();
  opportunities.forEach(o => {
    const current = accountRevenue.get(o.account_id) || 0;
    accountRevenue.set(o.account_id, current + (o.amount || 0));
  });

  const totalPipeline = opportunities.reduce((sum, o) => sum + (o.amount || 0), 0);
  const maxAccountConcentration = Math.max(...Array.from(accountRevenue.values())) / totalPipeline;

  if (maxAccountConcentration > 0.25) {
    const atRiskAmount = Math.max(...Array.from(accountRevenue.values()));
    risks.push({
      category: 'Customer Concentration',
      severity: maxAccountConcentration > 0.5 ? 'critical' : 'high' as const,
      description: `${Math.round(maxAccountConcentration * 100)}% of pipeline from single customer`,
      potentialLoss: Math.round(atRiskAmount),
      probability: 30,
      mitigation: 'Diversify customer base and accelerate other opportunities'
    });
    totalAtRisk += atRiskAmount * 0.3;
  }

  // Risk 2: Stale opportunities
  const staleOpps = opportunities.filter(o => {
    const created = new Date(o.created_date);
    const daysOld = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    return daysOld > 90 && o.stage !== 'prospecting';
  });

  if (staleOpps.length > 0) {
    const staleAmount = staleOpps.reduce((sum, o) => sum + (o.amount || 0), 0);
    risks.push({
      category: 'Stale Pipeline',
      severity: staleOpps.length > 10 ? 'high' : 'medium' as const,
      description: `${staleOpps.length} opportunities aging >90 days`,
      potentialLoss: Math.round(staleAmount),
      probability: 50,
      mitigation: 'Review and qualify stale opportunities, update close dates'
    });
    totalAtRisk += staleAmount * 0.5;
  }

  // Risk 3: Expiring contracts
  const expiringContracts = contracts.filter(c => {
    if (!c.end_date) return false;
    const endDate = new Date(c.end_date);
    const daysUntilExpiry = (endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry > 0 && daysUntilExpiry <= 90;
  });

  if (expiringContracts.length > 0) {
    const estimatedContractValue = expiringContracts.length * 50000; // Estimated
    risks.push({
      category: 'Contract Renewal Risk',
      severity: expiringContracts.length > 10 ? 'high' : 'medium' as const,
      description: `${expiringContracts.length} contracts expiring in next 90 days`,
      potentialLoss: estimatedContractValue,
      probability: 25,
      mitigation: 'Initiate renewal conversations and create renewal opportunities'
    });
    totalAtRisk += estimatedContractValue * 0.25;
  }

  // Risk 4: Low probability deals
  const lowProbDeals = opportunities.filter(o => (o.probability || 50) < 30 && (o.amount || 0) > 50000);
  if (lowProbDeals.length > 0) {
    const lowProbAmount = lowProbDeals.reduce((sum, o) => sum + (o.amount || 0), 0);
    risks.push({
      category: 'Low Probability Deals',
      severity: 'medium' as const,
      description: `${lowProbDeals.length} high-value deals with <30% probability`,
      potentialLoss: Math.round(lowProbAmount),
      probability: 70,
      mitigation: 'Focus on qualification and competitive positioning'
    });
    totalAtRisk += lowProbAmount * 0.7;
  }

  // Calculate overall risk score
  const riskScore = Math.min(100, risks.reduce((sum, r) => sum + r.probability, 0) / 2);
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  if (riskScore < 25) riskLevel = 'low';
  else if (riskScore < 50) riskLevel = 'medium';
  else if (riskScore < 75) riskLevel = 'high';
  else riskLevel = 'critical';

  return {
    overallRisk: {
      riskScore: Math.round(riskScore),
      riskLevel,
      potentialImpact: Math.round(totalAtRisk)
    },
    risks: risks.filter(r => r.probability >= minRiskScore),
    atRiskRevenue: {
      total: Math.round(totalAtRisk),
      byCategory: risks.map(r => ({
        category: r.category,
        amount: r.potentialLoss,
        percentage: Math.round((r.potentialLoss / totalAtRisk) * 100)
      }))
    },
    concentrationRisks: [
      {
        type: 'Customer',
        concentration: Math.round(maxAccountConcentration * 100),
        description: `Top customer represents ${Math.round(maxAccountConcentration * 100)}% of pipeline`,
        recommendation: 'Target is <25% concentration per customer'
      }
    ]
  };
}

// ============================================================================
// 4. REVENUE ACTION RECOMMENDATIONS
// ============================================================================

export interface RecommendRevenueActionsRequest {
  /** Revenue goal for the period */
  revenueGoal?: number;
  /** Current quarter or custom period */
  period?: 'quarter' | 'year';
}

export interface RecommendRevenueActionsResponse {
  /** Current performance */
  currentStatus: {
    forecastedRevenue: number;
    revenueGoal: number;
    gapAmount: number;
    gapPercentage: number;
    attainment: number;
  };
  /** Recommended actions */
  recommendations: Array<{
    priority: 'critical' | 'high' | 'medium' | 'low';
    action: string;
    category: string;
    expectedImpact: number;
    effort: 'low' | 'medium' | 'high';
    timeline: string;
    steps: string[];
  }>;
  /** Quick wins */
  quickWins: Array<{
    action: string;
    impact: number;
    deadline: string;
  }>;
  /** Strategic initiatives */
  strategicInitiatives: Array<{
    initiative: string;
    expectedRevenue: number;
    timeframe: string;
    resources: string;
  }>;
}

/**
 * Suggest actions to improve revenue
 */
export async function recommendRevenueActions(request: RecommendRevenueActionsRequest): Promise<RecommendRevenueActionsResponse> {
  const period = request.period || 'quarter';
  const months = period === 'quarter' ? 3 : 12;

  // Get forecast
  const forecast = await forecastRevenue({ months });
  const forecastedRevenue = forecast.totalForecast.revenue;
  const revenueGoal = request.revenueGoal || forecastedRevenue * 1.2;

  const gap = revenueGoal - forecastedRevenue;
  const gapPercentage = (gap / revenueGoal) * 100;

  // Fetch opportunities for analysis
  const opportunities = await db.find('opportunity', {
    filters: [['stage', '!=', 'Closed Lost'], ['stage', '!=', 'Closed Won']],
    fields: ['name', 'amount', 'stage', 'close_date', 'probability', 'account_id']
  });

  const recommendations = [];

  // Recommendation 1: Accelerate high-value deals
  const highValueDeals = opportunities.filter(o => (o.amount || 0) > 100000);
  if (highValueDeals.length > 0 && gap > 0) {
    const potentialImpact = highValueDeals.reduce((sum, o) => sum + (o.amount || 0) * 0.3, 0);
    recommendations.push({
      priority: 'critical' as const,
      action: 'Accelerate High-Value Deals',
      category: 'Pipeline Acceleration',
      expectedImpact: Math.round(potentialImpact),
      effort: 'medium' as const,
      timeline: '30 days',
      steps: [
        `Focus on ${highValueDeals.length} deals worth $${Math.round(highValueDeals.reduce((s, o) => s + (o.amount || 0), 0) / 1000)}K`,
        'Schedule executive sponsor meetings',
        'Provide custom ROI analysis and business case',
        'Offer limited-time incentives to close this quarter'
      ]
    });
  }

  // Recommendation 2: Increase win rates
  const proposalStage = opportunities.filter(o => o.stage === 'Proposal' || o.stage === 'Negotiation');
  if (proposalStage.length > 5) {
    const potentialImpact = proposalStage.reduce((sum, o) => sum + (o.amount || 0) * 0.15, 0);
    recommendations.push({
      priority: 'high' as const,
      action: 'Improve Win Rates in Late-Stage Deals',
      category: 'Conversion Optimization',
      expectedImpact: Math.round(potentialImpact),
      effort: 'medium' as const,
      timeline: '45 days',
      steps: [
        'Conduct competitive analysis for each proposal',
        'Involve technical experts in final presentations',
        'Address objections proactively with case studies',
        'Offer flexible payment terms to reduce friction'
      ]
    });
  }

  // Recommendation 3: Expand existing accounts
  const existingAccounts = await db.find('account', {
    filters: [['type', '=', 'Customer']],
    fields: ['name', 'account_id'],
    limit: 100
  });

  if (existingAccounts.length > 0) {
    const expansionPotential = existingAccounts.length * 25000; // Average expansion
    recommendations.push({
      priority: 'high' as const,
      action: 'Drive Expansion Revenue',
      category: 'Account Growth',
      expectedImpact: Math.round(expansionPotential * 0.3),
      effort: 'low' as const,
      timeline: '60 days',
      steps: [
        `Target ${existingAccounts.length} existing customers for upsell`,
        'Conduct business reviews to identify new use cases',
        'Offer additional modules or seat expansion',
        'Create expansion playbooks for customer success team'
      ]
    });
  }

  // Recommendation 4: Optimize pricing
  if (gap > 100000) {
    recommendations.push({
      priority: 'medium' as const,
      action: 'Optimize Deal Pricing',
      category: 'Revenue Optimization',
      expectedImpact: Math.round(forecastedRevenue * 0.05),
      effort: 'low' as const,
      timeline: '30 days',
      steps: [
        'Review discount levels on all active quotes',
        'Implement value-based pricing for enterprise deals',
        'Train sales team on pricing negotiation',
        'Set discount approval thresholds'
      ]
    });
  }

  const quickWins = [
    {
      action: 'Close deals in negotiation stage this week',
      impact: Math.round(proposalStage.reduce((s, o) => s + (o.amount || 0), 0) * 0.1),
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
    },
    {
      action: 'Convert 3 proposals to closed-won',
      impact: Math.round(proposalStage.slice(0, 3).reduce((s, o) => s + (o.amount || 0), 0) * 0.6),
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
    }
  ];

  return {
    currentStatus: {
      forecastedRevenue: Math.round(forecastedRevenue),
      revenueGoal: Math.round(revenueGoal),
      gapAmount: Math.round(gap),
      gapPercentage: Math.round(gapPercentage),
      attainment: Math.round((forecastedRevenue / revenueGoal) * 100)
    },
    recommendations,
    quickWins,
    strategicInitiatives: [
      {
        initiative: 'Launch new product line targeting mid-market',
        expectedRevenue: Math.round(revenueGoal * 0.15),
        timeframe: '6 months',
        resources: 'Product team, 2 sales reps'
      },
      {
        initiative: 'Enter adjacent market segment',
        expectedRevenue: Math.round(revenueGoal * 0.2),
        timeframe: '9 months',
        resources: 'Marketing, sales enablement, partnerships'
      }
    ]
  };
}

// ============================================================================
// 5. REVENUE BENCHMARKING
// ============================================================================

export interface BenchmarkRevenueRequest {
  /** Period to benchmark (default: last 12 months) */
  months?: number;
  /** Include industry benchmarks */
  includeIndustry?: boolean;
}

export interface BenchmarkRevenueResponse {
  /** Historical performance */
  historicalPerformance: {
    period: string;
    totalRevenue: number;
    avgMonthlyRevenue: number;
    growthRate: number;
    volatility: number;
  };
  /** Month-over-month trends */
  monthlyTrends: Array<{
    month: string;
    revenue: number;
    growthPercent: number;
    dealsWon: number;
    avgDealSize: number;
  }>;
  /** Performance metrics */
  metrics: {
    revenuePerSalesRep: number;
    avgSalesCycle: number;
    winRate: number;
    avgDealSize: number;
    quarterlyGrowth: number;
  };
  /** Benchmark comparison */
  benchmarks: {
    yourCompany: {
      growthRate: number;
      avgDealSize: number;
      winRate: number;
    };
    industryAverage: {
      growthRate: number;
      avgDealSize: number;
      winRate: number;
    };
    topPerformers: {
      growthRate: number;
      avgDealSize: number;
      winRate: number;
    };
  };
  /** Insights */
  insights: Array<{
    category: string;
    finding: string;
    recommendation: string;
  }>;
}

/**
 * Compare revenue to historical trends
 */
export async function benchmarkRevenue(request: BenchmarkRevenueRequest): Promise<BenchmarkRevenueResponse> {
  const months = request.months || 12;
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  // Fetch historical opportunities
  const opportunities = await db.find('opportunity', {
    filters: [
      ['close_date', '>=', startDate.toISOString()],
      ['stage', '=', 'Closed Won']
    ],
    fields: ['name', 'amount', 'close_date', 'created_date', 'stage'],
    limit: 10000
  });

  // Fetch all closed opportunities for win rate
  const allClosed = await db.find('opportunity', {
    filters: [
      ['close_date', '>=', startDate.toISOString()],
      ['stage', 'in', ['Closed Won', 'Closed Lost']]
    ],
    fields: ['stage', 'amount', 'close_date', 'created_date']
  });

  const totalRevenue = opportunities.reduce((sum, o) => sum + (o.amount || 0), 0);
  const avgMonthlyRevenue = totalRevenue / months;

  // Calculate monthly trends
  const monthlyData = new Map<string, any>();
  
  opportunities.forEach(o => {
    const month = new Date(o.close_date).toISOString().substring(0, 7);
    const existing = monthlyData.get(month) || { revenue: 0, deals: 0 };
    existing.revenue += o.amount || 0;
    existing.deals += 1;
    monthlyData.set(month, existing);
  });

  const monthlyTrends = Array.from(monthlyData.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map((entry, idx, arr) => {
      const [month, data] = entry;
      const prevRevenue = idx > 0 ? arr[idx - 1][1].revenue : data.revenue;
      const growthPercent = prevRevenue > 0 ? ((data.revenue - prevRevenue) / prevRevenue) * 100 : 0;
      
      return {
        month,
        revenue: Math.round(data.revenue),
        growthPercent: Math.round(growthPercent * 10) / 10,
        dealsWon: data.deals,
        avgDealSize: Math.round(data.revenue / data.deals)
      };
    });

  // Calculate metrics
  const avgDealSize = totalRevenue / opportunities.length || 0;
  const winRate = allClosed.length > 0 ? (opportunities.length / allClosed.length) * 100 : 0;
  
  const avgSalesCycle = opportunities.reduce((sum, o) => {
    const created = new Date(o.created_date);
    const closed = new Date(o.close_date);
    const days = (closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    return sum + days;
  }, 0) / opportunities.length || 0;

  // Calculate growth rate
  const firstQuarterRevenue = monthlyTrends.slice(0, 3).reduce((s, m) => s + m.revenue, 0);
  const lastQuarterRevenue = monthlyTrends.slice(-3).reduce((s, m) => s + m.revenue, 0);
  const growthRate = firstQuarterRevenue > 0 ? ((lastQuarterRevenue - firstQuarterRevenue) / firstQuarterRevenue) * 100 : 0;

  // Calculate volatility (standard deviation of monthly revenue)
  const monthlyRevenues = monthlyTrends.map(m => m.revenue);
  const mean = monthlyRevenues.reduce((a, b) => a + b, 0) / monthlyRevenues.length;
  const variance = monthlyRevenues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / monthlyRevenues.length;
  const volatility = Math.sqrt(variance) / mean * 100;

  // Industry benchmarks (simulated)
  const industryBenchmarks = {
    yourCompany: {
      growthRate: Math.round(growthRate),
      avgDealSize: Math.round(avgDealSize),
      winRate: Math.round(winRate)
    },
    industryAverage: {
      growthRate: 15,
      avgDealSize: 75000,
      winRate: 25
    },
    topPerformers: {
      growthRate: 40,
      avgDealSize: 150000,
      winRate: 35
    }
  };

  // Generate insights
  const insights = [];
  
  if (growthRate > 30) {
    insights.push({
      category: 'Growth',
      finding: `Strong ${Math.round(growthRate)}% quarterly growth rate`,
      recommendation: 'Maintain momentum by scaling successful strategies'
    });
  } else if (growthRate < 10) {
    insights.push({
      category: 'Growth',
      finding: `Low ${Math.round(growthRate)}% growth rate vs industry average of 15%`,
      recommendation: 'Invest in new customer acquisition and market expansion'
    });
  }

  if (avgDealSize > 100000) {
    insights.push({
      category: 'Deal Size',
      finding: 'Above-average deal size indicates strong enterprise positioning',
      recommendation: 'Continue targeting enterprise customers and expand enterprise team'
    });
  }

  if (winRate < 20) {
    insights.push({
      category: 'Win Rate',
      finding: `${Math.round(winRate)}% win rate is below industry average`,
      recommendation: 'Improve qualification process and competitive positioning'
    });
  }

  if (volatility > 30) {
    insights.push({
      category: 'Stability',
      finding: 'High revenue volatility detected',
      recommendation: 'Build more predictable recurring revenue streams'
    });
  }

  return {
    historicalPerformance: {
      period: `Last ${months} months`,
      totalRevenue: Math.round(totalRevenue),
      avgMonthlyRevenue: Math.round(avgMonthlyRevenue),
      growthRate: Math.round(growthRate * 10) / 10,
      volatility: Math.round(volatility)
    },
    monthlyTrends,
    metrics: {
      revenuePerSalesRep: Math.round(avgMonthlyRevenue / 5), // Assuming 5 reps
      avgSalesCycle: Math.round(avgSalesCycle),
      winRate: Math.round(winRate),
      avgDealSize: Math.round(avgDealSize),
      quarterlyGrowth: Math.round(growthRate * 10) / 10
    },
    benchmarks: industryBenchmarks,
    insights
  };
}

export default {
  forecastRevenue,
  predictQuarterlyRevenue,
  analyzeRevenueRisk,
  recommendRevenueActions,
  benchmarkRevenue
};
