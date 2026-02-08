/**
 * Revenue Dashboard Analytics Actions
 *
 * This ObjectStack Action provides analytics for revenue dashboards.
 *
 * Functionality:
 * 1. TCV (Total Contract Value) - Aggregate and segment contract values
 * 2. ARR (Annual Recurring Revenue) - Recurring revenue metrics and trends
 * 3. Quote-to-Close - Conversion funnel from quote to closed deal
 */

import { db } from '../db';

// ============================================================================
// 1. TOTAL CONTRACT VALUE (TCV)
// ============================================================================

export interface CalculateTCVRequest {
  /** Filter by account ID (optional) */
  accountId?: string;
  /** Filter by contract type (optional) */
  contractType?: string;
  /** Period start date for trend comparison (ISO string, optional) */
  periodStart?: string;
  /** Period end date for trend comparison (ISO string, optional) */
  periodEnd?: string;
}

export interface CalculateTCVResponse {
  /** Summary metrics */
  summary: {
    totalContractValue: number;
    activeContracts: number;
    averageContractValue: number;
    medianContractValue: number;
  };
  /** Distribution of contract values across ranges */
  distribution: Array<{
    range: string;
    count: number;
    totalValue: number;
    percentage: number;
  }>;
  /** Breakdown by contract status */
  byStatus: Array<{
    status: string;
    count: number;
    totalValue: number;
    averageValue: number;
  }>;
  /** Breakdown by account segment */
  byAccountSegment: Array<{
    segment: string;
    count: number;
    totalValue: number;
    percentage: number;
  }>;
  /** Breakdown by contract type */
  byContractType: Array<{
    contractType: string;
    count: number;
    totalValue: number;
    averageValue: number;
  }>;
  /** Growth trend compared to prior period */
  growthTrend: {
    currentPeriodValue: number;
    priorPeriodValue: number;
    absoluteChange: number;
    percentChange: number;
  };
}

/**
 * Calculate Total Contract Value with segmentation and trend analysis
 */
export async function calculateTCV(request: CalculateTCVRequest): Promise<CalculateTCVResponse> {
  // Build filters for active contracts
  const filters: any[] = [['status', 'in', ['Activated', 'Draft', 'InApproval']]];
  if (request.accountId) {
    filters.push(['account_id', '=', request.accountId]);
  }
  if (request.contractType) {
    filters.push(['contract_type', '=', request.contractType]);
  }

  const contracts = await db.find('contract', {
    filters,
    fields: [
      'contract_number', 'status', 'total_value', 'contract_type',
      'account_id', 'start_date', 'end_date', 'created_date'
    ],
    limit: 10000
  });

  // Fetch account data for segmentation
  const accountIds = [...new Set(contracts.map((c: any) => c.account_id).filter(Boolean))];
  const accounts = accountIds.length > 0
    ? await db.find('account', {
        filters: [['account_id', 'in', accountIds]],
        fields: ['account_id', 'name', 'industry', 'type', 'annual_revenue']
      })
    : [];

  const accountMap = new Map<string, any>();
  accounts.forEach((a: any) => accountMap.set(a.account_id, a));

  // --- Summary ---
  const values = contracts.map((c: any) => c.total_value || 0).sort((a: number, b: number) => a - b);
  const totalContractValue = values.reduce((sum: number, v: number) => sum + v, 0);
  const averageContractValue = contracts.length > 0 ? totalContractValue / contracts.length : 0;

  let medianContractValue = 0;
  if (values.length > 0) {
    const mid = Math.floor(values.length / 2);
    medianContractValue = values.length % 2 === 0
      ? (values[mid - 1] + values[mid]) / 2
      : values[mid];
  }

  // --- Distribution ---
  const ranges = [
    { label: '<$10K', min: 0, max: 10000 },
    { label: '$10K-$50K', min: 10000, max: 50000 },
    { label: '$50K-$100K', min: 50000, max: 100000 },
    { label: '$100K-$500K', min: 100000, max: 500000 },
    { label: '$500K-$1M', min: 500000, max: 1000000 },
    { label: '>$1M', min: 1000000, max: Infinity }
  ];

  const distribution = ranges.map(r => {
    const matching = contracts.filter((c: any) => {
      const v = c.total_value || 0;
      return v >= r.min && v < r.max;
    });
    const rangeTotal = matching.reduce((s: number, c: any) => s + (c.total_value || 0), 0);
    return {
      range: r.label,
      count: matching.length,
      totalValue: Math.round(rangeTotal),
      percentage: totalContractValue > 0 ? Math.round((rangeTotal / totalContractValue) * 1000) / 10 : 0
    };
  });

  // --- By Status ---
  const statusMap = new Map<string, { count: number; total: number }>();
  contracts.forEach((c: any) => {
    const status = c.status || 'Unknown';
    const entry = statusMap.get(status) || { count: 0, total: 0 };
    entry.count += 1;
    entry.total += c.total_value || 0;
    statusMap.set(status, entry);
  });

  const byStatus = Array.from(statusMap.entries()).map(([status, data]) => ({
    status,
    count: data.count,
    totalValue: Math.round(data.total),
    averageValue: Math.round(data.total / data.count)
  }));

  // --- By Account Segment ---
  const segmentMap = new Map<string, { count: number; total: number }>();
  contracts.forEach((c: any) => {
    const acct = accountMap.get(c.account_id);
    const segment = acct?.type || 'Unknown';
    const entry = segmentMap.get(segment) || { count: 0, total: 0 };
    entry.count += 1;
    entry.total += c.total_value || 0;
    segmentMap.set(segment, entry);
  });

  const byAccountSegment = Array.from(segmentMap.entries()).map(([segment, data]) => ({
    segment,
    count: data.count,
    totalValue: Math.round(data.total),
    percentage: totalContractValue > 0 ? Math.round((data.total / totalContractValue) * 1000) / 10 : 0
  }));

  // --- By Contract Type ---
  const typeMap = new Map<string, { count: number; total: number }>();
  contracts.forEach((c: any) => {
    const cType = c.contract_type || 'Standard';
    const entry = typeMap.get(cType) || { count: 0, total: 0 };
    entry.count += 1;
    entry.total += c.total_value || 0;
    typeMap.set(cType, entry);
  });

  const byContractType = Array.from(typeMap.entries()).map(([contractType, data]) => ({
    contractType,
    count: data.count,
    totalValue: Math.round(data.total),
    averageValue: Math.round(data.total / data.count)
  }));

  // --- Growth Trend ---
  const now = new Date();
  const periodEnd = request.periodEnd ? new Date(request.periodEnd) : now;
  const periodStart = request.periodStart
    ? new Date(request.periodStart)
    : new Date(periodEnd.getFullYear(), periodEnd.getMonth() - 12, periodEnd.getDate());
  const periodLength = periodEnd.getTime() - periodStart.getTime();
  const priorStart = new Date(periodStart.getTime() - periodLength);

  const currentPeriodContracts = contracts.filter((c: any) => {
    const d = new Date(c.created_date);
    return d >= periodStart && d <= periodEnd;
  });
  const currentPeriodValue = currentPeriodContracts.reduce((s: number, c: any) => s + (c.total_value || 0), 0);

  const priorContracts = await db.find('contract', {
    filters: [
      ['status', 'in', ['Activated', 'Draft', 'InApproval']],
      ['created_date', '>=', priorStart.toISOString()],
      ['created_date', '<', periodStart.toISOString()]
    ],
    fields: ['total_value'],
    limit: 10000
  });
  const priorPeriodValue = priorContracts.reduce((s: number, c: any) => s + (c.total_value || 0), 0);

  return {
    summary: {
      totalContractValue: Math.round(totalContractValue),
      activeContracts: contracts.length,
      averageContractValue: Math.round(averageContractValue),
      medianContractValue: Math.round(medianContractValue)
    },
    distribution,
    byStatus,
    byAccountSegment,
    byContractType,
    growthTrend: {
      currentPeriodValue: Math.round(currentPeriodValue),
      priorPeriodValue: Math.round(priorPeriodValue),
      absoluteChange: Math.round(currentPeriodValue - priorPeriodValue),
      percentChange: priorPeriodValue > 0
        ? Math.round(((currentPeriodValue - priorPeriodValue) / priorPeriodValue) * 1000) / 10
        : 0
    }
  };
}

// ============================================================================
// 2. ANNUAL RECURRING REVENUE (ARR)
// ============================================================================

export interface CalculateARRRequest {
  /** Snapshot date for ARR calculation (ISO string, default: today) */
  asOfDate?: string;
  /** Number of months of trend data to return (default: 12) */
  trendMonths?: number;
  /** Filter by account ID (optional) */
  accountId?: string;
}

export interface CalculateARRResponse {
  /** Top-level ARR metrics */
  summary: {
    totalARR: number;
    totalMRR: number;
    activeSubscriptions: number;
    arrPerCustomer: number;
    growthRate: number;
    retentionRate: number;
  };
  /** ARR movement breakdown */
  movement: {
    beginningARR: number;
    newARR: number;
    expansionARR: number;
    contractionARR: number;
    churnedARR: number;
    netNewARR: number;
    endingARR: number;
  };
  /** Monthly ARR time-series */
  trend: Array<{
    month: string;
    arr: number;
    mrr: number;
    newARR: number;
    churnedARR: number;
    netChange: number;
    customerCount: number;
  }>;
  /** ARR by customer */
  topCustomers: Array<{
    accountId: string;
    accountName: string;
    arr: number;
    percentage: number;
  }>;
}

/**
 * Calculate Annual Recurring Revenue with movement and trends
 */
export async function calculateARR(request: CalculateARRRequest): Promise<CalculateARRResponse> {
  const asOf = request.asOfDate ? new Date(request.asOfDate) : new Date();
  const trendMonths = request.trendMonths || 12;

  // Fetch all activated recurring contracts
  const filters: any[] = [
    ['status', '=', 'Activated'],
    ['billing_frequency', 'in', ['Monthly', 'Quarterly', 'Annually']]
  ];
  if (request.accountId) {
    filters.push(['account_id', '=', request.accountId]);
  }

  const contracts = await db.find('contract', {
    filters,
    fields: [
      'contract_number', 'account_id', 'total_value', 'billing_frequency',
      'start_date', 'end_date', 'created_date', 'status'
    ],
    limit: 10000
  });

  // Fetch churned contracts (cancelled / expired in last trendMonths)
  const trendStart = new Date(asOf);
  trendStart.setMonth(trendStart.getMonth() - trendMonths);

  const churnedContracts = await db.find('contract', {
    filters: [
      ['status', 'in', ['Cancelled', 'Expired']],
      ['end_date', '>=', trendStart.toISOString()],
      ['billing_frequency', 'in', ['Monthly', 'Quarterly', 'Annually']]
    ],
    fields: [
      'contract_number', 'account_id', 'total_value', 'billing_frequency',
      'start_date', 'end_date'
    ],
    limit: 10000
  });

  // Helper: normalize contract value to annual amount
  const annualize = (contract: any): number => {
    const value = contract.total_value || 0;
    const freq = contract.billing_frequency;
    if (freq === 'Monthly') return value * 12;
    if (freq === 'Quarterly') return value * 4;
    return value; // Annually or lump-sum treated as annual
  };

  // --- Summary ---
  const activeAtDate = contracts.filter((c: any) => {
    const start = new Date(c.start_date);
    const end = c.end_date ? new Date(c.end_date) : new Date('2099-12-31');
    return start <= asOf && end >= asOf;
  });

  const totalARR = activeAtDate.reduce((sum: number, c: any) => sum + annualize(c), 0);
  const totalMRR = totalARR / 12;

  const uniqueCustomers = new Set(activeAtDate.map((c: any) => c.account_id).filter(Boolean));
  const arrPerCustomer = uniqueCustomers.size > 0 ? totalARR / uniqueCustomers.size : 0;

  // Fetch account names for top-customer breakdown
  const customerIds = [...uniqueCustomers];
  const accountRecords = customerIds.length > 0
    ? await db.find('account', {
        filters: [['account_id', 'in', customerIds]],
        fields: ['account_id', 'name']
      })
    : [];
  const nameMap = new Map<string, string>();
  accountRecords.forEach((a: any) => nameMap.set(a.account_id, a.name));

  // --- ARR Movement ---
  const priorDate = new Date(asOf);
  priorDate.setFullYear(priorDate.getFullYear() - 1);

  const activeAtPrior = contracts.filter((c: any) => {
    const start = new Date(c.start_date);
    const end = c.end_date ? new Date(c.end_date) : new Date('2099-12-31');
    return start <= priorDate && end >= priorDate;
  });
  const beginningARR = activeAtPrior.reduce((sum: number, c: any) => sum + annualize(c), 0);

  const priorAccountARR = new Map<string, number>();
  activeAtPrior.forEach((c: any) => {
    const current = priorAccountARR.get(c.account_id) || 0;
    priorAccountARR.set(c.account_id, current + annualize(c));
  });

  const currentAccountARR = new Map<string, number>();
  activeAtDate.forEach((c: any) => {
    const current = currentAccountARR.get(c.account_id) || 0;
    currentAccountARR.set(c.account_id, current + annualize(c));
  });

  let newARR = 0;
  let expansionARR = 0;
  let contractionARR = 0;
  let churnedARR = 0;

  // New and expansion
  currentAccountARR.forEach((currentVal, acctId) => {
    const priorVal = priorAccountARR.get(acctId) || 0;
    if (priorVal === 0) {
      newARR += currentVal;
    } else if (currentVal > priorVal) {
      expansionARR += currentVal - priorVal;
    } else if (currentVal < priorVal) {
      contractionARR += priorVal - currentVal;
    }
  });

  // Churned: accounts that had ARR before but have none now
  priorAccountARR.forEach((priorVal, acctId) => {
    if (!currentAccountARR.has(acctId)) {
      churnedARR += priorVal;
    }
  });

  const netNewARR = newARR + expansionARR - contractionARR - churnedARR;

  // Retention rate
  const retainedARR = beginningARR - churnedARR - contractionARR;
  const retentionRate = beginningARR > 0 ? (retainedARR / beginningARR) * 100 : 100;

  // Growth rate
  const growthRate = beginningARR > 0 ? (netNewARR / beginningARR) * 100 : 0;

  // --- Monthly Trend ---
  const allContracts = [...contracts, ...churnedContracts];
  const trend = [];

  for (let i = trendMonths - 1; i >= 0; i--) {
    const monthDate = new Date(asOf.getFullYear(), asOf.getMonth() - i, 1);
    const monthEnd = new Date(asOf.getFullYear(), asOf.getMonth() - i + 1, 0);
    const monthLabel = monthDate.toISOString().substring(0, 7);

    const priorMonthDate = new Date(monthDate);
    priorMonthDate.setMonth(priorMonthDate.getMonth() - 1);

    const activeInMonth = allContracts.filter((c: any) => {
      const start = new Date(c.start_date);
      const end = c.end_date ? new Date(c.end_date) : new Date('2099-12-31');
      return start <= monthEnd && end >= monthDate;
    });

    const monthARR = activeInMonth.reduce((s: number, c: any) => s + annualize(c), 0);
    const monthCustomers = new Set(activeInMonth.map((c: any) => c.account_id).filter(Boolean));

    // New ARR this month (contracts started in this month)
    const monthNew = activeInMonth
      .filter((c: any) => {
        const start = new Date(c.start_date);
        return start >= monthDate && start <= monthEnd;
      })
      .reduce((s: number, c: any) => s + annualize(c), 0);

    // Churned this month (contracts ended in this month)
    const monthChurned = allContracts
      .filter((c: any) => {
        if (!c.end_date) return false;
        const end = new Date(c.end_date);
        return end >= monthDate && end <= monthEnd && (c.status === 'Cancelled' || c.status === 'Expired');
      })
      .reduce((s: number, c: any) => s + annualize(c), 0);

    trend.push({
      month: monthLabel,
      arr: Math.round(monthARR),
      mrr: Math.round(monthARR / 12),
      newARR: Math.round(monthNew),
      churnedARR: Math.round(monthChurned),
      netChange: Math.round(monthNew - monthChurned),
      customerCount: monthCustomers.size
    });
  }

  // --- Top Customers ---
  const customerARRList = Array.from(currentAccountARR.entries())
    .map(([accountId, arr]) => ({
      accountId,
      accountName: nameMap.get(accountId) || accountId,
      arr: Math.round(arr),
      percentage: totalARR > 0 ? Math.round((arr / totalARR) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.arr - a.arr)
    .slice(0, 20);

  return {
    summary: {
      totalARR: Math.round(totalARR),
      totalMRR: Math.round(totalMRR),
      activeSubscriptions: activeAtDate.length,
      arrPerCustomer: Math.round(arrPerCustomer),
      growthRate: Math.round(growthRate * 10) / 10,
      retentionRate: Math.round(retentionRate * 10) / 10
    },
    movement: {
      beginningARR: Math.round(beginningARR),
      newARR: Math.round(newARR),
      expansionARR: Math.round(expansionARR),
      contractionARR: Math.round(contractionARR),
      churnedARR: Math.round(churnedARR),
      netNewARR: Math.round(netNewARR),
      endingARR: Math.round(totalARR)
    },
    trend,
    topCustomers: customerARRList
  };
}

// ============================================================================
// 3. QUOTE-TO-CLOSE ANALYTICS
// ============================================================================

export interface CalculateQuoteToCloseRequest {
  /** Analysis period start (ISO string, optional – defaults to last 12 months) */
  periodStart?: string;
  /** Analysis period end (ISO string, optional – defaults to today) */
  periodEnd?: string;
  /** Filter by sales rep ID (optional) */
  salesRepId?: string;
  /** Filter by product ID (optional) */
  productId?: string;
}

export interface CalculateQuoteToCloseResponse {
  /** Top-level conversion metrics */
  summary: {
    totalQuotes: number;
    quotesAccepted: number;
    conversionRate: number;
    avgDaysToClose: number;
    medianDaysToClose: number;
    totalQuotedValue: number;
    totalClosedValue: number;
    valueConversionRate: number;
  };
  /** Funnel metrics from quote creation to close */
  funnel: Array<{
    stage: string;
    count: number;
    value: number;
    dropOffRate: number;
  }>;
  /** Win rate by quote value range */
  byValueRange: Array<{
    range: string;
    totalQuotes: number;
    wonQuotes: number;
    winRate: number;
    avgDaysToClose: number;
  }>;
  /** Win rate by product */
  byProduct: Array<{
    productId: string;
    productName: string;
    totalQuotes: number;
    wonQuotes: number;
    winRate: number;
    totalValue: number;
  }>;
  /** Win rate by sales rep */
  bySalesRep: Array<{
    repId: string;
    repName: string;
    totalQuotes: number;
    wonQuotes: number;
    winRate: number;
    avgDaysToClose: number;
    totalValue: number;
  }>;
  /** Quote revision analysis */
  revisionAnalysis: {
    avgRevisionsBeforeClose: number;
    revisionDistribution: Array<{
      revisions: number;
      count: number;
      winRate: number;
    }>;
  };
}

/**
 * Analyze the quote-to-close funnel: conversion, timing, and segmentation
 */
export async function calculateQuoteToClose(request: CalculateQuoteToCloseRequest): Promise<CalculateQuoteToCloseResponse> {
  const now = new Date();
  const periodEnd = request.periodEnd ? new Date(request.periodEnd) : now;
  const periodStart = request.periodStart
    ? new Date(request.periodStart)
    : new Date(periodEnd.getFullYear(), periodEnd.getMonth() - 12, periodEnd.getDate());

  // Fetch quotes created within the period
  const quoteFilters: any[] = [
    ['created_date', '>=', periodStart.toISOString()],
    ['created_date', '<=', periodEnd.toISOString()]
  ];
  if (request.salesRepId) {
    quoteFilters.push(['owner_id', '=', request.salesRepId]);
  }

  const quotes = await db.find('quote', {
    filters: quoteFilters,
    fields: [
      'quote_id', 'quote_number', 'status', 'total_amount', 'opportunity_id',
      'owner_id', 'created_date', 'accepted_date', 'revision_number',
      'product_id'
    ],
    limit: 10000
  });

  // Fetch linked opportunities to determine closed-won status and close date
  const oppIds = [...new Set(quotes.map((q: any) => q.opportunity_id).filter(Boolean))];
  const opportunities = oppIds.length > 0
    ? await db.find('opportunity', {
        filters: [['opportunity_id', 'in', oppIds]],
        fields: ['opportunity_id', 'stage', 'close_date', 'amount', 'owner_id']
      })
    : [];

  const oppMap = new Map<string, any>();
  opportunities.forEach((o: any) => oppMap.set(o.opportunity_id, o));

  // Fetch product names
  const productIds = [...new Set(quotes.map((q: any) => q.product_id).filter(Boolean))];
  const products = productIds.length > 0
    ? await db.find('product', {
        filters: [['product_id', 'in', productIds]],
        fields: ['product_id', 'name']
      })
    : [];
  const productNameMap = new Map<string, string>();
  products.forEach((p: any) => productNameMap.set(p.product_id, p.name));

  // Fetch rep names
  const repIds = [...new Set(quotes.map((q: any) => q.owner_id).filter(Boolean))];
  const reps = repIds.length > 0
    ? await db.find('user', {
        filters: [['user_id', 'in', repIds]],
        fields: ['user_id', 'name']
      })
    : [];
  const repNameMap = new Map<string, string>();
  reps.forEach((r: any) => repNameMap.set(r.user_id, r.name));

  // Apply optional product filter
  const filteredQuotes = request.productId
    ? quotes.filter((q: any) => q.product_id === request.productId)
    : quotes;

  // Enrich quotes with opportunity data
  const enriched = filteredQuotes.map((q: any) => {
    const opp = oppMap.get(q.opportunity_id);
    const isWon = opp?.stage === 'closed_won';
    const closeDate = opp?.close_date ? new Date(opp.close_date) : null;
    const createdDate = new Date(q.created_date);
    const daysToClose = isWon && closeDate
      ? Math.round((closeDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return { ...q, isWon, daysToClose, closeDate };
  });

  // --- Summary ---
  const wonQuotes = enriched.filter((q: any) => q.isWon);
  const daysValues = wonQuotes.map((q: any) => q.daysToClose).filter((d: any) => d !== null).sort((a: number, b: number) => a - b);

  const avgDaysToClose = daysValues.length > 0
    ? Math.round(daysValues.reduce((s: number, d: number) => s + d, 0) / daysValues.length)
    : 0;

  let medianDaysToClose = 0;
  if (daysValues.length > 0) {
    const mid = Math.floor(daysValues.length / 2);
    medianDaysToClose = daysValues.length % 2 === 0
      ? Math.round((daysValues[mid - 1] + daysValues[mid]) / 2)
      : daysValues[mid];
  }

  const totalQuotedValue = enriched.reduce((s: number, q: any) => s + (q.total_amount || 0), 0);
  const totalClosedValue = wonQuotes.reduce((s: number, q: any) => s + (q.total_amount || 0), 0);

  // --- Funnel ---
  const statusOrder = ['Draft', 'Sent', 'Viewed', 'Accepted', 'ClosedWon'];
  const statusCounts = new Map<string, { count: number; value: number }>();
  enriched.forEach((q: any) => {
    const status = q.isWon ? 'ClosedWon' : (q.status || 'Draft');
    const entry = statusCounts.get(status) || { count: 0, value: 0 };
    entry.count += 1;
    entry.value += q.total_amount || 0;
    statusCounts.set(status, entry);
  });

  // Build a cumulative funnel where each stage counts quotes that reached at least that stage
  const stageIndex = (status: string): number => {
    const idx = statusOrder.indexOf(status);
    return idx >= 0 ? idx : 0;
  };

  const funnel = statusOrder.map((stage, idx) => {
    const reachedStage = enriched.filter((q: any) => {
      const qStage = q.isWon ? 'ClosedWon' : (q.status || 'Draft');
      return stageIndex(qStage) >= idx;
    });
    const count = reachedStage.length;
    const value = reachedStage.reduce((s: number, q: any) => s + (q.total_amount || 0), 0);
    const prevCount = idx === 0 ? enriched.length : enriched.filter((q: any) => {
      const qStage = q.isWon ? 'ClosedWon' : (q.status || 'Draft');
      return stageIndex(qStage) >= idx - 1;
    }).length;
    const dropOffRate = prevCount > 0 ? Math.round(((prevCount - count) / prevCount) * 1000) / 10 : 0;

    return { stage, count, value: Math.round(value), dropOffRate };
  });

  // --- By Value Range ---
  const valueRanges = [
    { label: '<$5K', min: 0, max: 5000 },
    { label: '$5K-$25K', min: 5000, max: 25000 },
    { label: '$25K-$100K', min: 25000, max: 100000 },
    { label: '$100K-$500K', min: 100000, max: 500000 },
    { label: '>$500K', min: 500000, max: Infinity }
  ];

  const byValueRange = valueRanges.map(r => {
    const inRange = enriched.filter((q: any) => {
      const v = q.total_amount || 0;
      return v >= r.min && v < r.max;
    });
    const won = inRange.filter((q: any) => q.isWon);
    const days = won.map((q: any) => q.daysToClose).filter((d: any) => d !== null);
    return {
      range: r.label,
      totalQuotes: inRange.length,
      wonQuotes: won.length,
      winRate: inRange.length > 0 ? Math.round((won.length / inRange.length) * 1000) / 10 : 0,
      avgDaysToClose: days.length > 0
        ? Math.round(days.reduce((s: number, d: number) => s + d, 0) / days.length)
        : 0
    };
  });

  // --- By Product ---
  const prodMap = new Map<string, { total: number; won: number; value: number }>();
  enriched.forEach((q: any) => {
    const pid = q.product_id || 'unspecified';
    const entry = prodMap.get(pid) || { total: 0, won: 0, value: 0 };
    entry.total += 1;
    entry.value += q.total_amount || 0;
    if (q.isWon) entry.won += 1;
    prodMap.set(pid, entry);
  });

  const byProduct = Array.from(prodMap.entries()).map(([productId, data]) => ({
    productId,
    productName: productNameMap.get(productId) || productId,
    totalQuotes: data.total,
    wonQuotes: data.won,
    winRate: data.total > 0 ? Math.round((data.won / data.total) * 1000) / 10 : 0,
    totalValue: Math.round(data.value)
  })).sort((a, b) => b.totalValue - a.totalValue);

  // --- By Sales Rep ---
  const repMap = new Map<string, { total: number; won: number; value: number; days: number[] }>();
  enriched.forEach((q: any) => {
    const rid = q.owner_id || 'unassigned';
    const entry = repMap.get(rid) || { total: 0, won: 0, value: 0, days: [] };
    entry.total += 1;
    entry.value += q.total_amount || 0;
    if (q.isWon) {
      entry.won += 1;
      if (q.daysToClose !== null) entry.days.push(q.daysToClose);
    }
    repMap.set(rid, entry);
  });

  const bySalesRep = Array.from(repMap.entries()).map(([repId, data]) => ({
    repId,
    repName: repNameMap.get(repId) || repId,
    totalQuotes: data.total,
    wonQuotes: data.won,
    winRate: data.total > 0 ? Math.round((data.won / data.total) * 1000) / 10 : 0,
    avgDaysToClose: data.days.length > 0
      ? Math.round(data.days.reduce((s, d) => s + d, 0) / data.days.length)
      : 0,
    totalValue: Math.round(data.value)
  })).sort((a, b) => b.winRate - a.winRate);

  // --- Revision Analysis ---
  const revisionGroups = new Map<number, { total: number; won: number }>();
  enriched.forEach((q: any) => {
    const rev = q.revision_number || 0;
    const entry = revisionGroups.get(rev) || { total: 0, won: 0 };
    entry.total += 1;
    if (q.isWon) entry.won += 1;
    revisionGroups.set(rev, entry);
  });

  const wonRevisions = wonQuotes.map((q: any) => q.revision_number || 0);
  const avgRevisionsBeforeClose = wonRevisions.length > 0
    ? Math.round((wonRevisions.reduce((s: number, r: number) => s + r, 0) / wonRevisions.length) * 10) / 10
    : 0;

  const revisionDistribution = Array.from(revisionGroups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([revisions, data]) => ({
      revisions,
      count: data.total,
      winRate: data.total > 0 ? Math.round((data.won / data.total) * 1000) / 10 : 0
    }));

  return {
    summary: {
      totalQuotes: enriched.length,
      quotesAccepted: wonQuotes.length,
      conversionRate: enriched.length > 0
        ? Math.round((wonQuotes.length / enriched.length) * 1000) / 10
        : 0,
      avgDaysToClose,
      medianDaysToClose,
      totalQuotedValue: Math.round(totalQuotedValue),
      totalClosedValue: Math.round(totalClosedValue),
      valueConversionRate: totalQuotedValue > 0
        ? Math.round((totalClosedValue / totalQuotedValue) * 1000) / 10
        : 0
    },
    funnel,
    byValueRange,
    byProduct,
    bySalesRep,
    revisionAnalysis: {
      avgRevisionsBeforeClose,
      revisionDistribution
    }
  };
}

export default {
  calculateTCV,
  calculateARR,
  calculateQuoteToClose
};
