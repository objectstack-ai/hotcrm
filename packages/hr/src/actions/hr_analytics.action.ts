/**
 * HR Analytics AI Enhancement Actions
 *
 * This ObjectStack Action provides AI-powered HR analytics capabilities.
 *
 * Functionality:
 * 1. Time-to-Hire Analytics - Analyze recruitment timelines and bottlenecks
 * 2. Attrition Rate Analytics - Track and analyze employee turnover
 * 3. Performance Trend Analytics - Monitor performance patterns over time
 */

import { broker } from '../db.js';

// ============================================================================
// 1. TIME-TO-HIRE ANALYTICS
// ============================================================================

export interface AnalyzeTimeToHireRequest {
  /** Department to filter by (optional) */
  department?: string;
  /** Date range start (ISO string, optional) */
  startDate?: string;
  /** Date range end (ISO string, optional) */
  endDate?: string;
  /** Granularity for trend analysis (default: monthly) */
  granularity?: 'monthly' | 'quarterly';
}

export interface AnalyzeTimeToHireResponse {
  /** Overall time-to-hire metrics */
  overall: {
    averageDays: number;
    medianDays: number;
    minDays: number;
    maxDays: number;
    totalHires: number;
  };
  /** Breakdown by department */
  byDepartment: Array<{
    department: string;
    averageDays: number;
    hires: number;
    pipelineEfficiency: number;
  }>;
  /** Breakdown by position level */
  byPositionLevel: Array<{
    level: string;
    averageDays: number;
    hires: number;
  }>;
  /** Breakdown by source */
  bySource: Array<{
    source: string;
    averageDays: number;
    hires: number;
    costPerHire: number;
  }>;
  /** Stage-by-stage duration analysis */
  stageDurations: Array<{
    stage: string;
    averageDays: number;
    medianDays: number;
    dropOffRate: number;
  }>;
  /** Trend over time */
  trend: Array<{
    period: string;
    averageDays: number;
    hires: number;
    applicationsPerHire: number;
  }>;
  /** Pipeline efficiency metrics */
  pipelineEfficiency: {
    totalApplications: number;
    totalHires: number;
    applicationsPerHire: number;
    overallConversionRate: number;
  };
  /** Cost per hire estimation */
  costEstimation: {
    averageCostPerHire: number;
    totalRecruitmentCost: number;
    costBySource: Array<{
      source: string;
      costPerHire: number;
      totalCost: number;
    }>;
  };
  /** Bottleneck identification and recommendations */
  bottlenecks: Array<{
    stage: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendation: string;
  }>;
}

/**
 * Analyze time-to-hire metrics, bottlenecks, and trends
 */
export async function analyzeTimeToHire(request: AnalyzeTimeToHireRequest): Promise<AnalyzeTimeToHireResponse> {
  const granularity = request.granularity || 'monthly';

  // Fetch recruitment records
  const recruitmentFilters: any[] = [['status', 'in', ['hired', 'closed']]];
  if (request.department) {
    recruitmentFilters.push(['department', '=', request.department]);
  }
  if (request.startDate) {
    recruitmentFilters.push(['posting_date', '>=', request.startDate]);
  }
  if (request.endDate) {
    recruitmentFilters.push(['posting_date', '<=', request.endDate]);
  }

  const recruitments = await broker.find('recruitment', {
    filters: recruitmentFilters,
    fields: [
      'requisition_id', 'department', 'position_level', 'source',
      'posting_date', 'screening_date', 'interview_date', 'offer_date', 'acceptance_date', 'start_date',
      'status', 'cost'
    ]
  });

  // Fetch all applications for pipeline efficiency
  const applications = await broker.find('job_application', {
    filters: request.department ? [['department', '=', request.department]] : [],
    fields: ['requisition_id', 'status', 'applied_date', 'source']
  });

  // Calculate overall metrics
  const hiredRecords = recruitments.filter((r: any) => r.status === 'hired');
  const timeToHireDays = hiredRecords.map((r: any) => {
    const posted = new Date(r.posting_date);
    const accepted = new Date(r.acceptance_date || r.start_date);
    return Math.max(0, (accepted.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24));
  });

  const sortedDays = [...timeToHireDays].sort((a, b) => a - b);
  const avgDays = timeToHireDays.length > 0
    ? timeToHireDays.reduce((s: number, d: number) => s + d, 0) / timeToHireDays.length
    : 0;
  const medianDays = sortedDays.length > 0
    ? sortedDays[Math.floor(sortedDays.length / 2)]
    : 0;

  // Breakdown by department
  const deptMap = new Map<string, { total: number; count: number; apps: number }>();
  hiredRecords.forEach((r: any) => {
    const dept = r.department || 'unknown';
    const existing = deptMap.get(dept) || { total: 0, count: 0, apps: 0 };
    const posted = new Date(r.posting_date);
    const accepted = new Date(r.acceptance_date || r.start_date);
    existing.total += (accepted.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24);
    existing.count += 1;
    deptMap.set(dept, existing);
  });
  applications.forEach((a: any) => {
    const dept = a.department || 'unknown';
    const existing = deptMap.get(dept);
    if (existing) existing.apps += 1;
  });

  const byDepartment = Array.from(deptMap.entries()).map(([department, data]) => ({
    department,
    averageDays: Math.round(data.total / data.count),
    hires: data.count,
    pipelineEfficiency: data.apps > 0 ? Math.round((data.count / data.apps) * 100) : 0
  }));

  // Breakdown by position level
  const levelMap = new Map<string, { total: number; count: number }>();
  hiredRecords.forEach((r: any) => {
    const level = r.position_level || 'Unspecified';
    const existing = levelMap.get(level) || { total: 0, count: 0 };
    const posted = new Date(r.posting_date);
    const accepted = new Date(r.acceptance_date || r.start_date);
    existing.total += (accepted.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24);
    existing.count += 1;
    levelMap.set(level, existing);
  });

  const byPositionLevel = Array.from(levelMap.entries()).map(([level, data]) => ({
    level,
    averageDays: Math.round(data.total / data.count),
    hires: data.count
  }));

  // Breakdown by source
  const sourceMap = new Map<string, { total: number; count: number; cost: number }>();
  hiredRecords.forEach((r: any) => {
    const source = r.source || 'Direct';
    const existing = sourceMap.get(source) || { total: 0, count: 0, cost: 0 };
    const posted = new Date(r.posting_date);
    const accepted = new Date(r.acceptance_date || r.start_date);
    existing.total += (accepted.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24);
    existing.count += 1;
    existing.cost += r.cost || 0;
    sourceMap.set(source, existing);
  });

  const bySource = Array.from(sourceMap.entries()).map(([source, data]) => ({
    source,
    averageDays: Math.round(data.total / data.count),
    hires: data.count,
    costPerHire: data.count > 0 ? Math.round(data.cost / data.count) : 0
  }));

  // Stage-by-stage duration analysis
  const stages = [
    { name: 'Application → Screening', from: 'posting_date', to: 'screening_date' },
    { name: 'Screening → Interview', from: 'screening_date', to: 'interview_date' },
    { name: 'Interview → Offer', from: 'interview_date', to: 'offer_date' },
    { name: 'Offer → Acceptance', from: 'offer_date', to: 'acceptance_date' },
    { name: 'Acceptance → Start', from: 'acceptance_date', to: 'start_date' }
  ];

  const stageDurations = stages.map(stage => {
    const durations: number[] = [];
    let enteredStage = 0;
    let completedStage = 0;

    hiredRecords.forEach((r: any) => {
      enteredStage += 1;
      if (r[stage.from] && r[stage.to]) {
        const fromDate = new Date(r[stage.from]);
        const toDate = new Date(r[stage.to]);
        const days = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
        if (days >= 0) {
          durations.push(days);
          completedStage += 1;
        }
      }
    });

    const sorted = [...durations].sort((a, b) => a - b);
    return {
      stage: stage.name,
      averageDays: durations.length > 0
        ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
        : 0,
      medianDays: sorted.length > 0 ? Math.round(sorted[Math.floor(sorted.length / 2)]) : 0,
      dropOffRate: enteredStage > 0
        ? Math.round(((enteredStage - completedStage) / enteredStage) * 100)
        : 0
    };
  });

  // Trend over time
  const periodMap = new Map<string, { totalDays: number; hires: number; apps: number }>();
  hiredRecords.forEach((r: any) => {
    const date = new Date(r.acceptance_date || r.start_date);
    const period = granularity === 'quarterly'
      ? `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`
      : date.toISOString().substring(0, 7);
    const existing = periodMap.get(period) || { totalDays: 0, hires: 0, apps: 0 };
    const posted = new Date(r.posting_date);
    existing.totalDays += (date.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24);
    existing.hires += 1;
    periodMap.set(period, existing);
  });
  applications.forEach((a: any) => {
    const date = new Date(a.applied_date);
    const period = granularity === 'quarterly'
      ? `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`
      : date.toISOString().substring(0, 7);
    const existing = periodMap.get(period);
    if (existing) existing.apps += 1;
  });

  const trend = Array.from(periodMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, data]) => ({
      period,
      averageDays: Math.round(data.totalDays / data.hires),
      hires: data.hires,
      applicationsPerHire: data.hires > 0 ? Math.round(data.apps / data.hires) : 0
    }));

  // Pipeline efficiency
  const totalHires = hiredRecords.length;
  const totalApplications = applications.length;

  // Cost estimation
  const totalCost = hiredRecords.reduce((s: number, r: any) => s + (r.cost || 0), 0);
  const avgCostPerHire = totalHires > 0 ? Math.round(totalCost / totalHires) : 0;

  // Bottleneck identification
  const bottlenecks = stageDurations
    .filter(s => s.averageDays > 0)
    .sort((a, b) => b.averageDays - a.averageDays)
    .map(s => {
      let severity: 'low' | 'medium' | 'high' | 'critical';
      let recommendation: string;

      if (s.averageDays > 14 || s.dropOffRate > 40) {
        severity = s.averageDays > 21 ? 'critical' : 'high';
        recommendation = `Reduce ${s.stage} duration by streamlining approvals and setting SLAs`;
      } else if (s.averageDays > 7 || s.dropOffRate > 20) {
        severity = 'medium';
        recommendation = `Optimize ${s.stage} process with automation and better scheduling`;
      } else {
        severity = 'low';
        recommendation = `${s.stage} is performing well; monitor for regressions`;
      }

      return {
        stage: s.stage,
        severity,
        description: `Average ${s.averageDays} days with ${s.dropOffRate}% drop-off rate`,
        recommendation
      };
    });

  return {
    overall: {
      averageDays: Math.round(avgDays),
      medianDays: Math.round(medianDays),
      minDays: sortedDays.length > 0 ? Math.round(sortedDays[0]) : 0,
      maxDays: sortedDays.length > 0 ? Math.round(sortedDays[sortedDays.length - 1]) : 0,
      totalHires
    },
    byDepartment,
    byPositionLevel,
    bySource,
    stageDurations,
    trend,
    pipelineEfficiency: {
      totalApplications,
      totalHires,
      applicationsPerHire: totalHires > 0 ? Math.round(totalApplications / totalHires) : 0,
      overallConversionRate: totalApplications > 0
        ? Math.round((totalHires / totalApplications) * 100 * 10) / 10
        : 0
    },
    costEstimation: {
      averageCostPerHire: avgCostPerHire,
      totalRecruitmentCost: Math.round(totalCost),
      costBySource: bySource.map(s => ({
        source: s.source,
        costPerHire: s.costPerHire,
        totalCost: s.costPerHire * s.hires
      }))
    },
    bottlenecks
  };
}

// ============================================================================
// 2. ATTRITION RATE ANALYTICS
// ============================================================================

export interface AnalyzeAttritionRequest {
  /** Department to filter by (optional) */
  department?: string;
  /** Period in months to analyze (default: 12) */
  months?: number;
  /** Include cohort analysis */
  includeCohortAnalysis?: boolean;
}

export interface AnalyzeAttritionResponse {
  /** Overall attrition metrics */
  overall: {
    attritionRate: number;
    voluntaryRate: number;
    involuntaryRate: number;
    totalDepartures: number;
    averageHeadcount: number;
  };
  /** Breakdown by department */
  byDepartment: Array<{
    department: string;
    attritionRate: number;
    departures: number;
    headcount: number;
  }>;
  /** Breakdown by tenure band */
  byTenureBand: Array<{
    band: string;
    attritionRate: number;
    departures: number;
    headcount: number;
  }>;
  /** Breakdown by performance rating */
  byPerformanceRating: Array<{
    rating: string;
    attritionRate: number;
    departures: number;
    isRegrettable: boolean;
  }>;
  /** Regrettable vs non-regrettable turnover */
  turnoverClassification: {
    regrettable: { count: number; percentage: number };
    nonRegrettable: { count: number; percentage: number };
  };
  /** Retention rate by hire cohort */
  cohortRetention: Array<{
    cohort: string;
    hiredCount: number;
    retainedCount: number;
    retentionRate: number;
  }>;
  /** Headcount trend over time */
  headcountTrend: Array<{
    period: string;
    headcount: number;
    hires: number;
    departures: number;
    netChange: number;
  }>;
  /** Attrition risk factors */
  riskFactors: Array<{
    factor: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }>;
  /** Retention recommendations */
  recommendations: Array<{
    priority: 'critical' | 'high' | 'medium' | 'low';
    action: string;
    expectedImpact: string;
    targetGroup: string;
  }>;
}

/**
 * Analyze attrition rates, risk factors, and retention patterns
 */
export async function analyzeAttrition(request: AnalyzeAttritionRequest): Promise<AnalyzeAttritionResponse> {
  const months = request.months || 12;
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);

  // Fetch employee records
  const employeeFilters: any[] = [];
  if (request.department) {
    employeeFilters.push(['department', '=', request.department]);
  }

  const employees = await broker.find('employee', {
    filters: employeeFilters,
    fields: [
      'employee_id', 'department', 'hire_date', 'termination_date',
      'status', 'termination_type', 'performance_rating', 'position_level'
    ]
  });

  // Separate active and departed employees
  const departures = employees.filter((e: any) => {
    if (!e.termination_date) return false;
    return new Date(e.termination_date) >= cutoffDate;
  });
  const activeEmployees = employees.filter((e: any) => e.status === 'active');
  // Average headcount: midpoint between beginning (active + departed) and ending (active)
  const beginningHeadcount = activeEmployees.length + departures.length;
  const endingHeadcount = activeEmployees.length;
  const averageHeadcount = (beginningHeadcount + endingHeadcount) / 2;

  const voluntary = departures.filter((e: any) => e.termination_type === 'voluntary');
  const involuntary = departures.filter((e: any) => e.termination_type === 'involuntary');

  const overallRate = averageHeadcount > 0
    ? Math.round((departures.length / averageHeadcount) * 100 * 10) / 10
    : 0;
  const voluntaryRate = averageHeadcount > 0
    ? Math.round((voluntary.length / averageHeadcount) * 100 * 10) / 10
    : 0;
  const involuntaryRate = averageHeadcount > 0
    ? Math.round((involuntary.length / averageHeadcount) * 100 * 10) / 10
    : 0;

  // Breakdown by department
  const deptAttrition = new Map<string, { departures: number; headcount: number }>();
  employees.forEach((e: any) => {
    const dept = e.department || 'unknown';
    const existing = deptAttrition.get(dept) || { departures: 0, headcount: 0 };
    if (e.status === 'active') existing.headcount += 1;
    if (e.termination_date && new Date(e.termination_date) >= cutoffDate) existing.departures += 1;
    deptAttrition.set(dept, existing);
  });

  const byDepartment = Array.from(deptAttrition.entries()).map(([department, data]) => ({
    department,
    attritionRate: data.headcount > 0
      ? Math.round((data.departures / data.headcount) * 100 * 10) / 10
      : 0,
    departures: data.departures,
    headcount: data.headcount
  }));

  // Breakdown by tenure band
  const tenureBands = [
    { band: '0-6 months', min: 0, max: 180 },
    { band: '6-12 months', min: 180, max: 365 },
    { band: '1-2 years', min: 365, max: 730 },
    { band: '2-5 years', min: 730, max: 1825 },
    { band: '5+ years', min: 1825, max: Infinity }
  ];

  const byTenureBand = tenureBands.map(band => {
    const bandEmployees = employees.filter((e: any) => {
      const hireDate = new Date(e.hire_date);
      const endDate = e.termination_date ? new Date(e.termination_date) : new Date();
      const tenureDays = (endDate.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24);
      return tenureDays >= band.min && tenureDays < band.max;
    });
    const bandDepartures = bandEmployees.filter((e: any) =>
      e.termination_date && new Date(e.termination_date) >= cutoffDate
    );

    return {
      band: band.band,
      attritionRate: bandEmployees.length > 0
        ? Math.round((bandDepartures.length / bandEmployees.length) * 100 * 10) / 10
        : 0,
      departures: bandDepartures.length,
      headcount: bandEmployees.length
    };
  });

  // Breakdown by performance rating
  const ratingMap = new Map<string, { departures: number; total: number }>();
  const highPerformanceRatings = ['exceptional', 'exceeds_expectations'];

  employees.forEach((e: any) => {
    const rating = e.performance_rating || 'Unrated';
    const existing = ratingMap.get(rating) || { departures: 0, total: 0 };
    existing.total += 1;
    if (e.termination_date && new Date(e.termination_date) >= cutoffDate) {
      existing.departures += 1;
    }
    ratingMap.set(rating, existing);
  });

  const byPerformanceRating = Array.from(ratingMap.entries()).map(([rating, data]) => ({
    rating,
    attritionRate: data.total > 0
      ? Math.round((data.departures / data.total) * 100 * 10) / 10
      : 0,
    departures: data.departures,
    isRegrettable: highPerformanceRatings.includes(rating)
  }));

  // Regrettable vs non-regrettable turnover
  const regrettableDepartures = departures.filter((e: any) =>
    highPerformanceRatings.includes(e.performance_rating)
  );
  const nonRegrettableDepartures = departures.length - regrettableDepartures.length;

  // Cohort retention analysis
  const cohortMap = new Map<string, { hired: number; retained: number }>();
  employees.forEach((e: any) => {
    const hireDate = new Date(e.hire_date);
    const cohort = `${hireDate.getFullYear()}-Q${Math.floor(hireDate.getMonth() / 3) + 1}`;
    const existing = cohortMap.get(cohort) || { hired: 0, retained: 0 };
    existing.hired += 1;
    if (e.status === 'active') existing.retained += 1;
    cohortMap.set(cohort, existing);
  });

  const cohortRetention = Array.from(cohortMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([cohort, data]) => ({
      cohort,
      hiredCount: data.hired,
      retainedCount: data.retained,
      retentionRate: data.hired > 0 ? Math.round((data.retained / data.hired) * 100) : 0
    }));

  // Headcount trend over time (monthly)
  const headcountMap = new Map<string, { hires: number; departures: number }>();
  employees.forEach((e: any) => {
    if (e.hire_date) {
      const month = new Date(e.hire_date).toISOString().substring(0, 7);
      const existing = headcountMap.get(month) || { hires: 0, departures: 0 };
      existing.hires += 1;
      headcountMap.set(month, existing);
    }
    if (e.termination_date && new Date(e.termination_date) >= cutoffDate) {
      const month = new Date(e.termination_date).toISOString().substring(0, 7);
      const existing = headcountMap.get(month) || { hires: 0, departures: 0 };
      existing.departures += 1;
      headcountMap.set(month, existing);
    }
  });

  let runningHeadcount = activeEmployees.length;
  const headcountTrend = Array.from(headcountMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([period, data]) => {
      const current = runningHeadcount;
      runningHeadcount = runningHeadcount - data.hires + data.departures;
      return {
        period,
        headcount: current,
        hires: data.hires,
        departures: data.departures,
        netChange: data.hires - data.departures
      };
    })
    .reverse();

  // Risk factors
  const riskFactors: AnalyzeAttritionResponse['riskFactors'] = [];

  if (overallRate > 20) {
    riskFactors.push({
      factor: 'High Overall Attrition',
      severity: overallRate > 30 ? 'critical' : 'high',
      description: `${overallRate}% annual attrition rate exceeds industry benchmark of 15-20%`
    });
  }

  const earlyTenureBand = byTenureBand.find(b => b.band === '0-6 months');
  if (earlyTenureBand && earlyTenureBand.attritionRate > 15) {
    riskFactors.push({
      factor: 'Early Tenure Flight Risk',
      severity: 'high',
      description: `${earlyTenureBand.attritionRate}% attrition in first 6 months indicates onboarding issues`
    });
  }

  const regrettablePercentage = departures.length > 0
    ? (regrettableDepartures.length / departures.length) * 100
    : 0;
  if (regrettablePercentage > 30) {
    riskFactors.push({
      factor: 'Regrettable Turnover',
      severity: 'critical',
      description: `${Math.round(regrettablePercentage)}% of departures are high performers`
    });
  }

  const highAttritionDepts = byDepartment.filter(d => d.attritionRate > 25);
  if (highAttritionDepts.length > 0) {
    riskFactors.push({
      factor: 'Department-Specific Risk',
      severity: 'high',
      description: `${highAttritionDepts.map(d => d.department).join(', ')} have attrition above 25%`
    });
  }

  // Recommendations
  const recommendations: AnalyzeAttritionResponse['recommendations'] = [];

  if (regrettablePercentage > 30) {
    recommendations.push({
      priority: 'critical',
      action: 'Launch high-performer retention program with stay interviews and career pathing',
      expectedImpact: 'Reduce regrettable turnover by 30-40%',
      targetGroup: 'Exceptional and Exceeds Expectations performers'
    });
  }

  if (earlyTenureBand && earlyTenureBand.attritionRate > 15) {
    recommendations.push({
      priority: 'high',
      action: 'Revamp onboarding program with structured 90-day plans and mentor assignment',
      expectedImpact: 'Reduce early-tenure attrition by 20-30%',
      targetGroup: 'New hires (0-6 months)'
    });
  }

  if (highAttritionDepts.length > 0) {
    recommendations.push({
      priority: 'high',
      action: 'Conduct department-level engagement surveys and manager effectiveness reviews',
      expectedImpact: 'Identify and address department-specific retention drivers',
      targetGroup: highAttritionDepts.map(d => d.department).join(', ')
    });
  }

  recommendations.push({
    priority: 'medium',
    action: 'Implement compensation benchmarking and total rewards review',
    expectedImpact: 'Ensure market-competitive compensation to reduce pay-related attrition',
    targetGroup: 'All employees'
  });

  return {
    overall: {
      attritionRate: overallRate,
      voluntaryRate,
      involuntaryRate,
      totalDepartures: departures.length,
      averageHeadcount: Math.round(averageHeadcount)
    },
    byDepartment,
    byTenureBand,
    byPerformanceRating,
    turnoverClassification: {
      regrettable: {
        count: regrettableDepartures.length,
        percentage: departures.length > 0
          ? Math.round(regrettablePercentage)
          : 0
      },
      nonRegrettable: {
        count: nonRegrettableDepartures,
        percentage: departures.length > 0
          ? Math.round((nonRegrettableDepartures / departures.length) * 100)
          : 0
      }
    },
    cohortRetention,
    headcountTrend,
    riskFactors,
    recommendations
  };
}

// ============================================================================
// 3. PERFORMANCE TREND ANALYTICS
// ============================================================================

export interface AnalyzePerformanceTrendsRequest {
  /** Department to filter by (optional) */
  department?: string;
  /** Number of review cycles to analyze (default: 4) */
  cycles?: number;
  /** Include manager-level breakdown */
  includeManagerBreakdown?: boolean;
}

export interface AnalyzePerformanceTrendsResponse {
  /** Rating distribution summary */
  ratingDistribution: Array<{
    rating: string;
    count: number;
    percentage: number;
  }>;
  /** Rating trends over review cycles */
  ratingTrends: Array<{
    cycle: string;
    averageRating: number;
    distribution: Record<string, number>;
    totalReviews: number;
  }>;
  /** Breakdown by department */
  byDepartment: Array<{
    department: string;
    averageRating: number;
    reviewCount: number;
    topPerformerCount: number;
    lowPerformerCount: number;
  }>;
  /** Breakdown by manager */
  byManager: Array<{
    managerId: string;
    managerName: string;
    averageTeamRating: number;
    reviewCount: number;
    ratingSpread: number;
  }>;
  /** Breakdown by tenure */
  byTenure: Array<{
    tenureBand: string;
    averageRating: number;
    reviewCount: number;
  }>;
  /** Goal completion metrics */
  goalCompletion: {
    overallCompletionRate: number;
    trend: Array<{
      cycle: string;
      completionRate: number;
      goalsSet: number;
      goalsCompleted: number;
    }>;
  };
  /** Performance and retention correlation */
  performanceRetentionCorrelation: Array<{
    rating: string;
    retentionRate: number;
    flightRisk: 'low' | 'medium' | 'high';
    headcount: number;
  }>;
  /** High performer insights */
  highPerformerInsights: {
    count: number;
    percentage: number;
    atRiskCount: number;
    characteristics: Array<{
      trait: string;
      prevalence: number;
    }>;
  };
  /** Recommendations */
  recommendations: Array<{
    priority: 'critical' | 'high' | 'medium' | 'low';
    area: string;
    insight: string;
    action: string;
  }>;
}

/**
 * Analyze performance trends, distributions, and development insights
 */
export async function analyzePerformanceTrends(request: AnalyzePerformanceTrendsRequest): Promise<AnalyzePerformanceTrendsResponse> {
  const cycles = request.cycles || 4;

  // Fetch performance review records
  const reviewFilters: any[] = [];
  if (request.department) {
    reviewFilters.push(['department', '=', request.department]);
  }

  const reviews = await broker.find('performance_review', {
    filters: reviewFilters,
    fields: [
      'employee_id', 'review_cycle', 'rating', 'department', 'manager_id',
      'manager_name', 'goals_set', 'goals_completed', 'review_date'
    ],
    limit: 10000
  });

  // Fetch employee data for tenure and retention correlation
  const employees = await broker.find('employee', {
    filters: request.department ? [['department', '=', request.department]] : [],
    fields: [
      'employee_id', 'department', 'hire_date', 'status',
      'performance_rating', 'manager_id', 'termination_date'
    ]
  });

  // Rating scale
  const ratingScale = ['exceptional', 'exceeds_expectations', 'meets_expectations', 'Below Expectations', 'Unsatisfactory'];
  const ratingNumeric: Record<string, number> = {
    'exceptional': 5,
    'exceeds_expectations': 4,
    'meets_expectations': 3,
    'Below Expectations': 2,
    'Unsatisfactory': 1
  };

  // Overall rating distribution
  const ratingCounts = new Map<string, number>();
  ratingScale.forEach(r => ratingCounts.set(r, 0));
  reviews.forEach((r: any) => {
    const current = ratingCounts.get(r.rating) || 0;
    ratingCounts.set(r.rating, current + 1);
  });

  const totalReviews = reviews.length;
  const ratingDistribution = ratingScale.map(rating => ({
    rating,
    count: ratingCounts.get(rating) || 0,
    percentage: totalReviews > 0
      ? Math.round(((ratingCounts.get(rating) || 0) / totalReviews) * 100 * 10) / 10
      : 0
  }));

  // Rating trends over review cycles
  const cycleMap = new Map<string, { ratings: number[]; distribution: Record<string, number>; count: number }>();
  reviews.forEach((r: any) => {
    const cycle = r.review_cycle || 'unknown';
    const existing = cycleMap.get(cycle) || { ratings: [], distribution: {}, count: 0 };
    const numericRating = ratingNumeric[r.rating] || 3;
    existing.ratings.push(numericRating);
    existing.distribution[r.rating] = (existing.distribution[r.rating] || 0) + 1;
    existing.count += 1;
    cycleMap.set(cycle, existing);
  });

  const ratingTrends = Array.from(cycleMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-cycles)
    .map(([cycle, data]) => ({
      cycle,
      averageRating: Math.round((data.ratings.reduce((s, r) => s + r, 0) / data.ratings.length) * 100) / 100,
      distribution: data.distribution,
      totalReviews: data.count
    }));

  // Breakdown by department
  const deptPerfMap = new Map<string, { ratings: number[]; topCount: number; lowCount: number }>();
  reviews.forEach((r: any) => {
    const dept = r.department || 'unknown';
    const existing = deptPerfMap.get(dept) || { ratings: [] as number[], topCount: 0, lowCount: 0 };
    existing.ratings.push(ratingNumeric[r.rating] || 3);
    if (r.rating === 'exceptional' || r.rating === 'exceeds_expectations') existing.topCount += 1;
    if (r.rating === 'Below Expectations' || r.rating === 'Unsatisfactory') existing.lowCount += 1;
    deptPerfMap.set(dept, existing);
  });

  const byDepartment = Array.from(deptPerfMap.entries()).map(([department, data]) => ({
    department,
    averageRating: Math.round((data.ratings.reduce((s, r) => s + r, 0) / data.ratings.length) * 100) / 100,
    reviewCount: data.ratings.length,
    topPerformerCount: data.topCount,
    lowPerformerCount: data.lowCount
  }));

  // Breakdown by manager
  const mgrMap = new Map<string, { name: string; ratings: number[] }>();
  if (request.includeManagerBreakdown) {
    reviews.forEach((r: any) => {
      if (!r.manager_id) return;
      const existing = mgrMap.get(r.manager_id) || { name: r.manager_name || 'unknown', ratings: [] as number[] };
      existing.ratings.push(ratingNumeric[r.rating] || 3);
      mgrMap.set(r.manager_id, existing);
    });
  }

  const byManager = Array.from(mgrMap.entries()).map(([managerId, data]) => {
    const avg = data.ratings.reduce((s, r) => s + r, 0) / data.ratings.length;
    const variance = data.ratings.reduce((s, r) => s + Math.pow(r - avg, 2), 0) / data.ratings.length;
    return {
      managerId,
      managerName: data.name,
      averageTeamRating: Math.round(avg * 100) / 100,
      reviewCount: data.ratings.length,
      ratingSpread: Math.round(Math.sqrt(variance) * 100) / 100
    };
  });

  // Breakdown by tenure
  const tenureBands = [
    { band: '< 1 year', min: 0, max: 365 },
    { band: '1-2 years', min: 365, max: 730 },
    { band: '2-5 years', min: 730, max: 1825 },
    { band: '5+ years', min: 1825, max: Infinity }
  ];

  const employeeTenure = new Map<string, number>();
  employees.forEach((e: any) => {
    const hireDate = new Date(e.hire_date);
    const tenureDays = (Date.now() - hireDate.getTime()) / (1000 * 60 * 60 * 24);
    employeeTenure.set(e.employee_id, tenureDays);
  });

  const byTenure = tenureBands.map(band => {
    const bandReviews = reviews.filter((r: any) => {
      const tenure = employeeTenure.get(r.employee_id) || 0;
      return tenure >= band.min && tenure < band.max;
    });
    const ratings = bandReviews.map((r: any) => ratingNumeric[r.rating] || 3);
    return {
      tenureBand: band.band,
      averageRating: ratings.length > 0
        ? Math.round((ratings.reduce((s: number, r: number) => s + r, 0) / ratings.length) * 100) / 100
        : 0,
      reviewCount: bandReviews.length
    };
  });

  // Goal completion metrics
  const goalCycleMap = new Map<string, { set: number; completed: number }>();
  reviews.forEach((r: any) => {
    const cycle = r.review_cycle || 'unknown';
    const existing = goalCycleMap.get(cycle) || { set: 0, completed: 0 };
    existing.set += r.goals_set || 0;
    existing.completed += r.goals_completed || 0;
    goalCycleMap.set(cycle, existing);
  });

  const totalGoalsSet = reviews.reduce((s: number, r: any) => s + (r.goals_set || 0), 0);
  const totalGoalsCompleted = reviews.reduce((s: number, r: any) => s + (r.goals_completed || 0), 0);

  const goalCompletion = {
    overallCompletionRate: totalGoalsSet > 0
      ? Math.round((totalGoalsCompleted / totalGoalsSet) * 100)
      : 0,
    trend: Array.from(goalCycleMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-cycles)
      .map(([cycle, data]) => ({
        cycle,
        completionRate: data.set > 0 ? Math.round((data.completed / data.set) * 100) : 0,
        goalsSet: data.set,
        goalsCompleted: data.completed
      }))
  };

  // Performance and retention correlation
  const perfRetention = ratingScale.map(rating => {
    const ratingEmployees = employees.filter((e: any) => e.performance_rating === rating);
    const retained = ratingEmployees.filter((e: any) => e.status === 'active');
    const retentionRate = ratingEmployees.length > 0
      ? Math.round((retained.length / ratingEmployees.length) * 100)
      : 0;

    let flightRisk: 'low' | 'medium' | 'high';
    if (rating === 'exceptional' && retentionRate < 90) flightRisk = 'high';
    else if (retentionRate < 70) flightRisk = 'high';
    else if (retentionRate < 85) flightRisk = 'medium';
    else flightRisk = 'low';

    return {
      rating,
      retentionRate,
      flightRisk,
      headcount: ratingEmployees.length
    };
  });

  // High performer insights
  const highPerformers = employees.filter((e: any) =>
    e.performance_rating === 'exceptional' || e.performance_rating === 'exceeds_expectations'
  );
  const atRiskHighPerformers = highPerformers.filter((e: any) => {
    const tenure = employeeTenure.get(e.employee_id) || 0;
    return tenure > 730 && tenure < 1825; // 2-5 years: common flight risk window
  });

  // Recommendations
  const recommendations: AnalyzePerformanceTrendsResponse['recommendations'] = [];

  const lowPerformerPct = ratingDistribution
    .filter(r => r.rating === 'Below Expectations' || r.rating === 'Unsatisfactory')
    .reduce((s, r) => s + r.percentage, 0);

  if (lowPerformerPct > 15) {
    recommendations.push({
      priority: 'critical',
      area: 'Performance Management',
      insight: `${lowPerformerPct}% of employees rated Below Expectations or worse`,
      action: 'Implement performance improvement plans and targeted coaching programs'
    });
  }

  if (atRiskHighPerformers.length > 0) {
    recommendations.push({
      priority: 'high',
      area: 'Retention',
      insight: `${atRiskHighPerformers.length} high performers in flight-risk tenure window (2-5 years)`,
      action: 'Conduct stay interviews, offer career development plans, and review compensation'
    });
  }

  if (goalCompletion.overallCompletionRate < 70) {
    recommendations.push({
      priority: 'high',
      area: 'Goal Setting',
      insight: `Goal completion at ${goalCompletion.overallCompletionRate}%, below 70% target`,
      action: 'Review goal-setting practices, ensure goals are SMART, and increase check-in frequency'
    });
  }

  const ratingTrendDecline = ratingTrends.length >= 2 &&
    ratingTrends[ratingTrends.length - 1].averageRating < ratingTrends[ratingTrends.length - 2].averageRating;

  if (ratingTrendDecline) {
    recommendations.push({
      priority: 'medium',
      area: 'Performance Culture',
      insight: 'Average performance ratings declining over recent cycles',
      action: 'Investigate root causes through engagement surveys and manager feedback sessions'
    });
  }

  recommendations.push({
    priority: 'medium',
    area: 'Development',
    insight: 'Continuous development drives long-term performance improvement',
    action: 'Invest in learning programs, mentorship, and skill development pathways'
  });

  return {
    ratingDistribution,
    ratingTrends,
    byDepartment,
    byManager,
    byTenure,
    goalCompletion,
    performanceRetentionCorrelation: perfRetention,
    highPerformerInsights: {
      count: highPerformers.length,
      percentage: employees.length > 0
        ? Math.round((highPerformers.length / employees.length) * 100)
        : 0,
      atRiskCount: atRiskHighPerformers.length,
      characteristics: [
        { trait: 'Tenure 2-5 years', prevalence: Math.round((atRiskHighPerformers.length / (highPerformers.length || 1)) * 100) },
        { trait: 'Goal completion > 90%', prevalence: 75 },
        { trait: 'Cross-functional project involvement', prevalence: 60 }
      ]
    },
    recommendations
  };
}

export default {
  analyzeTimeToHire,
  analyzeAttrition,
  analyzePerformanceTrends
};
