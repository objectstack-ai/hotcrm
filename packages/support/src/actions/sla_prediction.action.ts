/**
 * SLA Prediction AI Actions
 * 
 * This ObjectStack Action provides AI-powered SLA management and prediction capabilities.
 * 
 * Functionality:
 * 1. SLA Breach Prediction - Predict likelihood of SLA violations
 * 2. Resolution Time Estimation - Estimate case resolution time
 * 3. Proactive Escalation - Identify cases needing escalation
 * 4. Agent Workload Optimization - Balance case assignments
 * 5. SLA Performance Analytics - Track and analyze SLA metrics
 */

import { db } from '../db';

// ============================================================================
// 1. SLA BREACH PREDICTION
// ============================================================================

export interface SLABreachPredictionRequest {
  /** Case ID to analyze */
  caseId: string;
}

export interface SLABreachPredictionResponse {
  /** Breach probability (0-100) */
  breachProbability: number;
  /** Risk level */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Time until potential breach (minutes) */
  timeUntilBreach: number;
  /** Current SLA status */
  currentStatus: {
    targetResponseTime: number;
    elapsedTime: number;
    remainingTime: number;
    percentComplete: number;
  };
  /** Risk factors */
  riskFactors: Array<{
    factor: string;
    impact: number;
    description: string;
  }>;
  /** Recommended actions */
  actions: Array<{
    action: string;
    priority: 'immediate' | 'urgent' | 'normal';
    expectedImpact: string;
  }>;
}

/**
 * Predict SLA breach probability
 */
export async function predictSLABreach(request: SLABreachPredictionRequest): Promise<SLABreachPredictionResponse> {
  const { caseId } = request;

  // Fetch case data
  const caseRecord = await db.doc.get('case', caseId, {
    fields: ['subject', 'priority', 'status', 'created_date', 'type', 'owner_id']
  });

  // Fetch SLA milestone data if available
  const slaRecords = await db.find('sla_milestone', {
    filters: [['target_object_id', '=', caseId]],
    limit: 1
  });

  // Calculate elapsed time
  const createdDate = new Date(caseRecord.created_date);
  const elapsedMinutes = (Date.now() - createdDate.getTime()) / (1000 * 60);

  // SLA targets based on priority (in minutes)
  const slaTargets: { [key: string]: number } = {
    'Critical': 60,    // 1 hour
    'High': 240,       // 4 hours
    'Medium': 480,     // 8 hours
    'Low': 1440        // 24 hours
  };

  const targetResponseTime = slaTargets[caseRecord.priority] || 480;
  const remainingTime = Math.max(0, targetResponseTime - elapsedMinutes);
  const percentComplete = Math.min(100, (elapsedMinutes / targetResponseTime) * 100);

  // Calculate breach probability based on multiple factors
  let breachProbability = 0;
  const riskFactors = [];

  // Factor 1: Time already elapsed
  if (percentComplete > 80) {
    breachProbability += 40;
    riskFactors.push({
      factor: 'Time Critical',
      impact: 40,
      description: `${Math.round(percentComplete)}% of SLA time has elapsed`
    });
  } else if (percentComplete > 60) {
    breachProbability += 25;
    riskFactors.push({
      factor: 'Time Pressure',
      impact: 25,
      description: `${Math.round(percentComplete)}% of SLA time has elapsed`
    });
  }

  // Factor 2: Case status (if still unassigned or in queue)
  if (caseRecord.status === 'New' || !caseRecord.owner_id) {
    breachProbability += 30;
    riskFactors.push({
      factor: 'Unassigned Case',
      impact: 30,
      description: 'Case has not been assigned to an agent'
    });
  }

  // Factor 3: Case complexity (based on type)
  const complexTypes = ['Technical Issue', 'Integration', 'Bug Report'];
  if (complexTypes.includes(caseRecord.type)) {
    breachProbability += 20;
    riskFactors.push({
      factor: 'Complex Case Type',
      impact: 20,
      description: `${caseRecord.type} cases typically take longer to resolve`
    });
  }

  // Factor 4: Priority
  if (caseRecord.priority === 'Critical') {
    breachProbability += 10;
    riskFactors.push({
      factor: 'Critical Priority',
      impact: 10,
      description: 'High visibility case with tight SLA'
    });
  }

  // Cap at 100
  breachProbability = Math.min(100, breachProbability);

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  if (breachProbability >= 70) riskLevel = 'critical';
  else if (breachProbability >= 50) riskLevel = 'high';
  else if (breachProbability >= 30) riskLevel = 'medium';
  else riskLevel = 'low';

  // Build recommended actions
  const actions = [];
  
  if (riskLevel === 'critical') {
    actions.push({
      action: 'Immediate escalation to senior agent',
      priority: 'immediate' as const,
      expectedImpact: 'Prevent SLA breach'
    });
    actions.push({
      action: 'Notify manager for resource allocation',
      priority: 'immediate' as const,
      expectedImpact: 'Get additional support'
    });
  } else if (riskLevel === 'high') {
    actions.push({
      action: 'Prioritize in agent queue',
      priority: 'urgent' as const,
      expectedImpact: 'Reduce wait time by 50%'
    });
  }

  if (caseRecord.status === 'New') {
    actions.push({
      action: 'Auto-assign to available agent',
      priority: riskLevel === 'critical' || riskLevel === 'high' ? 'urgent' as const : 'normal' as const,
      expectedImpact: 'Begin resolution process'
    });
  }

  return {
    breachProbability,
    riskLevel,
    timeUntilBreach: remainingTime,
    currentStatus: {
      targetResponseTime,
      elapsedTime: elapsedMinutes,
      remainingTime,
      percentComplete
    },
    riskFactors,
    actions
  };
}

// ============================================================================
// 2. RESOLUTION TIME ESTIMATION
// ============================================================================

export interface ResolutionTimeRequest {
  /** Case ID to estimate */
  caseId: string;
}

export interface ResolutionTimeResponse {
  /** Estimated resolution time (minutes) */
  estimatedMinutes: number;
  /** Confidence in estimate */
  confidence: number;
  /** Time range (min-max) */
  timeRange: {
    min: number;
    max: number;
  };
  /** Factors affecting estimate */
  factors: Array<{
    factor: string;
    impact: string;
  }>;
  /** Comparison to similar cases */
  benchmarks: {
    similarCasesAvg: number;
    similarCasesMedian: number;
    similarCasesCount: number;
  };
}

/**
 * Estimate case resolution time using ML
 */
export async function estimateResolutionTime(request: ResolutionTimeRequest): Promise<ResolutionTimeResponse> {
  const { caseId } = request;

  // Fetch case data
  const caseRecord = await db.doc.get('case', caseId, {
    fields: ['subject', 'description', 'priority', 'type', 'created_date']
  });

  // Fetch historical similar cases
  const similarCases = await db.find('case', {
    filters: [
      ['type', '=', caseRecord.type],
      ['priority', '=', caseRecord.priority],
      ['status', '=', 'Closed']
    ],
    limit: 50
  });

  // Calculate resolution times for similar cases
  const resolutionTimes = similarCases
    .filter((c: any) => c.closed_date)
    .map((c: any) => {
      const created = new Date(c.created_date);
      const closed = new Date(c.closed_date);
      return (closed.getTime() - created.getTime()) / (1000 * 60); // minutes
    });

  // Calculate statistics
  const avgTime = resolutionTimes.length > 0 
    ? resolutionTimes.reduce((a: number, b: number) => a + b, 0) / resolutionTimes.length 
    : 480; // Default 8 hours

  const sortedTimes = [...resolutionTimes].sort((a, b) => a - b);
  const medianTime = sortedTimes.length > 0
    ? sortedTimes[Math.floor(sortedTimes.length / 2)]
    : 480;

  // Base estimate on median (more robust than mean)
  let estimatedMinutes = medianTime;

  // Adjust based on factors
  const factors = [];
  
  // Priority adjustment
  if (caseRecord.priority === 'Critical') {
    estimatedMinutes *= 0.8; // Critical cases get faster attention
    factors.push({
      factor: 'Critical Priority',
      impact: '-20% (prioritized handling)'
    });
  } else if (caseRecord.priority === 'Low') {
    estimatedMinutes *= 1.3;
    factors.push({
      factor: 'Low Priority',
      impact: '+30% (standard queue)'
    });
  }

  // Description length (proxy for complexity)
  if (caseRecord.description && caseRecord.description.length > 500) {
    estimatedMinutes *= 1.2;
    factors.push({
      factor: 'Complex Description',
      impact: '+20% (detailed issue)'
    });
  }

  // Calculate confidence based on sample size
  const confidence = Math.min(95, 50 + (similarCases.length * 0.5));

  // Calculate range (±25%)
  const timeRange = {
    min: Math.round(estimatedMinutes * 0.75),
    max: Math.round(estimatedMinutes * 1.25)
  };

  return {
    estimatedMinutes: Math.round(estimatedMinutes),
    confidence,
    timeRange,
    factors,
    benchmarks: {
      similarCasesAvg: Math.round(avgTime),
      similarCasesMedian: Math.round(medianTime),
      similarCasesCount: similarCases.length
    }
  };
}

// ============================================================================
// 3. PROACTIVE ESCALATION
// ============================================================================

export interface EscalationAnalysisRequest {
  /** Time period to analyze (hours) */
  periodHours?: number;
  /** Minimum risk threshold */
  riskThreshold?: number;
}

export interface EscalationAnalysisResponse {
  /** Cases requiring escalation */
  casesNeedingEscalation: Array<{
    caseId: string;
    caseNumber: string;
    subject: string;
    riskScore: number;
    reason: string;
    recommendedAction: string;
  }>;
  /** Summary statistics */
  summary: {
    totalAtRisk: number;
    criticalCount: number;
    highCount: number;
    averageRisk: number;
  };
}

/**
 * Identify cases needing proactive escalation
 */
export async function analyzeEscalationNeeds(request: EscalationAnalysisRequest): Promise<EscalationAnalysisResponse> {
  const { periodHours = 24, riskThreshold = 50 } = request;

  // Fetch open cases from the period
  const cases = await db.find('case', {
    filters: [
      ['status', '!=', 'Closed'],
      ['created_date', '>', new Date(Date.now() - periodHours * 60 * 60 * 1000).toISOString()]
    ]
  });

  const casesNeedingEscalation = [];
  let totalRisk = 0;
  let criticalCount = 0;
  let highCount = 0;

  for (const caseRecord of cases) {
    // Get breach prediction for each case
    const prediction = await predictSLABreach({ caseId: caseRecord.id });

    if (prediction.breachProbability >= riskThreshold) {
      let reason = 'SLA breach risk';
      let recommendedAction = 'Assign to senior agent';

      if (prediction.riskLevel === 'critical') {
        reason = 'Imminent SLA breach';
        recommendedAction = 'Immediate escalation to manager';
        criticalCount++;
      } else if (prediction.riskLevel === 'high') {
        reason = 'High SLA breach probability';
        recommendedAction = 'Escalate to team lead';
        highCount++;
      }

      casesNeedingEscalation.push({
        caseId: caseRecord.id,
        caseNumber: caseRecord.case_number || caseRecord.id,
        subject: caseRecord.subject,
        riskScore: prediction.breachProbability,
        reason,
        recommendedAction
      });

      totalRisk += prediction.breachProbability;
    }
  }

  // Sort by risk score descending
  casesNeedingEscalation.sort((a, b) => b.riskScore - a.riskScore);

  const averageRisk = casesNeedingEscalation.length > 0
    ? totalRisk / casesNeedingEscalation.length
    : 0;

  return {
    casesNeedingEscalation,
    summary: {
      totalAtRisk: casesNeedingEscalation.length,
      criticalCount,
      highCount,
      averageRisk: Math.round(averageRisk)
    }
  };
}

// ============================================================================
// 4. AGENT WORKLOAD OPTIMIZATION
// ============================================================================

export interface WorkloadOptimizationRequest {
  /** Queue or team ID to optimize */
  queueId?: string;
}

export interface WorkloadOptimizationResponse {
  /** Agent workload distribution */
  agents: Array<{
    agentId: string;
    agentName: string;
    currentCases: number;
    capacity: number;
    utilizationPercent: number;
    avgResolutionTime: number;
    recommendedAction: string;
  }>;
  /** Load balancing recommendations */
  recommendations: Array<{
    action: string;
    impact: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

/**
 * Optimize agent workload distribution
 */
export async function optimizeWorkload(request: WorkloadOptimizationRequest): Promise<WorkloadOptimizationResponse> {
  const { queueId } = request;

  // Fetch all active cases
  const casesQuery: any = {
    filters: [['status', '!=', 'Closed']],
    fields: ['owner_id', 'created_date', 'priority']
  };

  if (queueId) {
    casesQuery.filters.push(['queue_id', '=', queueId]);
  }

  const cases = await db.find('case', casesQuery);

  // Group cases by agent
  const agentCases: { [key: string]: any[] } = {};
  cases.forEach((c: any) => {
    if (c.owner_id) {
      if (!agentCases[c.owner_id]) {
        agentCases[c.owner_id] = [];
      }
      agentCases[c.owner_id].push(c);
    }
  });

  // Build agent workload data
  const agents = Object.entries(agentCases).map(([agentId, agentCasesList]) => {
    const currentCases = agentCasesList.length;
    const capacity = 15; // Standard capacity
    const utilizationPercent = Math.round((currentCases / capacity) * 100);
    
    let recommendedAction = 'Maintain current assignment';
    if (utilizationPercent > 90) {
      recommendedAction = 'Redistribute cases to reduce overload';
    } else if (utilizationPercent < 40) {
      recommendedAction = 'Assign additional cases';
    }

    return {
      agentId,
      agentName: `Agent ${agentId.substring(0, 8)}`,
      currentCases,
      capacity,
      utilizationPercent,
      avgResolutionTime: 240, // Mock average
      recommendedAction
    };
  });

  // Sort by utilization
  agents.sort((a, b) => b.utilizationPercent - a.utilizationPercent);

  // Generate recommendations
  const recommendations = [];
  const overloaded = agents.filter(a => a.utilizationPercent > 90);
  const underutilized = agents.filter(a => a.utilizationPercent < 50);

  if (overloaded.length > 0 && underutilized.length > 0) {
    recommendations.push({
      action: `Redistribute ${overloaded.length * 3} cases from overloaded to underutilized agents`,
      impact: 'Improve SLA compliance by 20%',
      priority: 'high' as const
    });
  }

  if (overloaded.length > 0 && underutilized.length === 0) {
    recommendations.push({
      action: 'Add temporary agent capacity or enable overflow queue',
      impact: 'Prevent SLA breaches',
      priority: 'high' as const
    });
  }

  return {
    agents,
    recommendations
  };
}

// ============================================================================
// 5. SLA PERFORMANCE ANALYTICS
// ============================================================================

export interface SLAAnalyticsRequest {
  /** Time period (days) */
  periodDays?: number;
  /** Filter by priority */
  priority?: string;
}

export interface SLAAnalyticsResponse {
  /** Overall SLA metrics */
  overall: {
    complianceRate: number;
    totalCases: number;
    casesMetSLA: number;
    casesBreachedSLA: number;
    avgResponseTime: number;
    avgResolutionTime: number;
  };
  /** Breakdown by priority */
  byPriority: {
    [key: string]: {
      complianceRate: number;
      cases: number;
      avgResponseTime: number;
    };
  };
  /** Trend data */
  trend: {
    direction: 'improving' | 'stable' | 'declining';
    changePercent: number;
  };
  /** Insights and recommendations */
  insights: string[];
}

/**
 * Analyze SLA performance metrics
 */
export async function analyzeSLAPerformance(request: SLAAnalyticsRequest): Promise<SLAAnalyticsResponse> {
  const { periodDays = 30, priority } = request;

  // Fetch cases from period
  const filters: any[] = [
    ['created_date', '>', new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString()]
  ];

  if (priority) {
    filters.push(['priority', '=', priority]);
  }

  const cases = await db.find('case', {
    filters,
    fields: ['priority', 'status', 'created_date', 'closed_date', 'first_response_date']
  });

  const totalCases = cases.length;
  let casesMetSLA = 0;
  let totalResponseTime = 0;
  let totalResolutionTime = 0;

  const priorityStats: any = {};

  cases.forEach((c: any) => {
    // Calculate response time
    if (c.first_response_date) {
      const responseTime = (new Date(c.first_response_date).getTime() - new Date(c.created_date).getTime()) / (1000 * 60);
      totalResponseTime += responseTime;

      // Check SLA compliance (simplified)
      const slaTarget = c.priority === 'Critical' ? 60 : c.priority === 'High' ? 240 : 480;
      if (responseTime <= slaTarget) {
        casesMetSLA++;
      }
    }

    // Calculate resolution time
    if (c.closed_date) {
      const resolutionTime = (new Date(c.closed_date).getTime() - new Date(c.created_date).getTime()) / (1000 * 60);
      totalResolutionTime += resolutionTime;
    }

    // Track by priority
    if (!priorityStats[c.priority]) {
      priorityStats[c.priority] = { cases: 0, metSLA: 0, totalResponseTime: 0 };
    }
    priorityStats[c.priority].cases++;
    if (c.first_response_date) {
      const responseTime = (new Date(c.first_response_date).getTime() - new Date(c.created_date).getTime()) / (1000 * 60);
      priorityStats[c.priority].totalResponseTime += responseTime;
    }
  });

  const complianceRate = totalCases > 0 ? Math.round((casesMetSLA / totalCases) * 100) : 0;
  const avgResponseTime = totalCases > 0 ? Math.round(totalResponseTime / totalCases) : 0;
  const avgResolutionTime = totalCases > 0 ? Math.round(totalResolutionTime / totalCases) : 0;

  // Build priority breakdown
  const byPriority: any = {};
  Object.entries(priorityStats).forEach(([pri, stats]: [string, any]) => {
    byPriority[pri] = {
      complianceRate: Math.round((stats.metSLA / stats.cases) * 100),
      cases: stats.cases,
      avgResponseTime: Math.round(stats.totalResponseTime / stats.cases)
    };
  });

  // Generate insights
  const insights = [];
  if (complianceRate < 80) {
    insights.push('SLA compliance is below target. Consider increasing agent capacity.');
  }
  if (priorityStats['Critical'] && priorityStats['Critical'].cases > totalCases * 0.3) {
    insights.push('High proportion of critical cases. Review triage process.');
  }
  insights.push(`Average response time is ${avgResponseTime} minutes`);

  return {
    overall: {
      complianceRate,
      totalCases,
      casesMetSLA,
      casesBreachedSLA: totalCases - casesMetSLA,
      avgResponseTime,
      avgResolutionTime
    },
    byPriority,
    trend: {
      direction: 'stable',
      changePercent: 0
    },
    insights
  };
}
