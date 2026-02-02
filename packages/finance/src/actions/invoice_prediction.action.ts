/**
 * Invoice Prediction AI Actions
 * 
 * This ObjectStack Action provides AI-powered invoice management and prediction capabilities.
 * 
 * Functionality:
 * 1. Payment Default Prediction - Predict likelihood of late/non-payment
 * 2. Payment Date Prediction - Estimate when invoice will be paid
 * 3. Invoice Anomaly Detection - Identify unusual invoice patterns
 * 4. Collection Strategy Optimization - Suggest best collection approach
 * 5. Cash Flow Forecasting - Predict incoming payments
 */

import { db } from '../db';

// ============================================================================
// 1. PAYMENT DEFAULT PREDICTION
// ============================================================================

export interface PaymentDefaultRequest {
  /** Invoice ID to analyze */
  invoiceId: string;
}

export interface PaymentDefaultResponse {
  /** Default probability (0-100) */
  defaultProbability: number;
  /** Risk level */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Risk factors */
  riskFactors: Array<{
    factor: string;
    impact: number;
    description: string;
  }>;
  /** Customer payment history */
  paymentHistory: {
    totalInvoices: number;
    paidOnTime: number;
    paidLate: number;
    defaulted: number;
    avgDaysLate: number;
  };
  /** Recommended actions */
  recommendations: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    timing: string;
  }>;
}

/**
 * Predict payment default probability
 */
export async function predictPaymentDefault(request: PaymentDefaultRequest): Promise<PaymentDefaultResponse> {
  const { invoiceId } = request;

  // Fetch invoice data
  const invoice = await db.doc.get('invoice', invoiceId, {
    fields: ['invoice_number', 'amount', 'invoice_date', 'due_date', 'status', 'account_id']
  });

  // Fetch account data
  const account = await db.doc.get('account', invoice.account_id, {
    fields: ['name', 'annual_revenue', 'industry']
  });

  // Fetch payment history for this account
  const historicalInvoices = await db.find('invoice', {
    filters: [
      ['account_id', '=', invoice.account_id],
      ['id', '!=', invoiceId]
    ],
    fields: ['status', 'due_date', 'payment_date', 'amount'],
    limit: 50
  });

  // Analyze payment history
  const totalInvoices = historicalInvoices.length;
  let paidOnTime = 0;
  let paidLate = 0;
  let defaulted = 0;
  let totalDaysLate = 0;

  historicalInvoices.forEach((inv: any) => {
    if (inv.status === 'Paid' && inv.payment_date && inv.due_date) {
      const dueDate = new Date(inv.due_date);
      const paymentDate = new Date(inv.payment_date);
      const daysLate = Math.max(0, (paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysLate === 0) {
        paidOnTime++;
      } else {
        paidLate++;
        totalDaysLate += daysLate;
      }
    } else if (inv.status === 'Cancelled' || inv.status === 'Written Off') {
      defaulted++;
    }
  });

  const avgDaysLate = paidLate > 0 ? Math.round(totalDaysLate / paidLate) : 0;

  // Calculate default probability
  let defaultProbability = 0;
  const riskFactors = [];

  // Factor 1: Payment history
  if (defaulted > 0) {
    const defaultRate = (defaulted / totalInvoices) * 100;
    defaultProbability += defaultRate * 0.5;
    riskFactors.push({
      factor: 'Previous Defaults',
      impact: Math.round(defaultRate * 0.5),
      description: `${defaulted} defaulted invoices out of ${totalInvoices}`
    });
  }

  const lateRate = totalInvoices > 0 ? (paidLate / totalInvoices) * 100 : 0;
  if (lateRate > 30) {
    defaultProbability += 25;
    riskFactors.push({
      factor: 'Frequent Late Payments',
      impact: 25,
      description: `${Math.round(lateRate)}% of invoices paid late (avg ${avgDaysLate} days)`
    });
  } else if (lateRate > 10) {
    defaultProbability += 15;
    riskFactors.push({
      factor: 'Occasional Late Payments',
      impact: 15,
      description: `${Math.round(lateRate)}% of invoices paid late`
    });
  }

  // Factor 2: Invoice amount relative to customer size
  if (account.annual_revenue && invoice.amount > account.annual_revenue * 0.1) {
    defaultProbability += 20;
    riskFactors.push({
      factor: 'Large Invoice Amount',
      impact: 20,
      description: `Invoice is ${Math.round((invoice.amount / account.annual_revenue) * 100)}% of annual revenue`
    });
  }

  // Factor 3: Days overdue
  if (invoice.due_date) {
    const dueDate = new Date(invoice.due_date);
    const daysOverdue = Math.max(0, (Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysOverdue > 60) {
      defaultProbability += 30;
      riskFactors.push({
        factor: 'Severely Overdue',
        impact: 30,
        description: `Invoice is ${Math.round(daysOverdue)} days overdue`
      });
    } else if (daysOverdue > 30) {
      defaultProbability += 20;
      riskFactors.push({
        factor: 'Overdue',
        impact: 20,
        description: `Invoice is ${Math.round(daysOverdue)} days overdue`
      });
    }
  }

  // Cap at 100
  defaultProbability = Math.min(100, defaultProbability);

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  if (defaultProbability >= 70) riskLevel = 'critical';
  else if (defaultProbability >= 50) riskLevel = 'high';
  else if (defaultProbability >= 30) riskLevel = 'medium';
  else riskLevel = 'low';

  // Build recommendations
  const recommendations = [];
  
  if (riskLevel === 'critical') {
    recommendations.push({
      action: 'Escalate to collections agency',
      priority: 'high' as const,
      timing: 'Immediately'
    });
    recommendations.push({
      action: 'Consider legal action',
      priority: 'medium' as const,
      timing: 'If no response in 14 days'
    });
  } else if (riskLevel === 'high') {
    recommendations.push({
      action: 'Send final demand letter',
      priority: 'high' as const,
      timing: 'Within 48 hours'
    });
    recommendations.push({
      action: 'Suspend account services',
      priority: 'high' as const,
      timing: 'If no payment in 7 days'
    });
  } else if (riskLevel === 'medium') {
    recommendations.push({
      action: 'Send payment reminder',
      priority: 'medium' as const,
      timing: 'Daily until paid'
    });
    recommendations.push({
      action: 'Offer payment plan',
      priority: 'medium' as const,
      timing: 'Within 1 week'
    });
  }

  return {
    defaultProbability,
    riskLevel,
    riskFactors,
    paymentHistory: {
      totalInvoices,
      paidOnTime,
      paidLate,
      defaulted,
      avgDaysLate
    },
    recommendations
  };
}

// ============================================================================
// 2. PAYMENT DATE PREDICTION
// ============================================================================

export interface PaymentDateRequest {
  /** Invoice ID to predict */
  invoiceId: string;
}

export interface PaymentDateResponse {
  /** Predicted payment date */
  predictedDate: string;
  /** Confidence level (0-100) */
  confidence: number;
  /** Prediction range */
  dateRange: {
    earliest: string;
    latest: string;
  };
  /** Factors influencing prediction */
  factors: Array<{
    factor: string;
    influence: string;
  }>;
}

/**
 * Predict when invoice will be paid
 */
export async function predictPaymentDate(request: PaymentDateRequest): Promise<PaymentDateResponse> {
  const { invoiceId } = request;

  // Fetch invoice
  const invoice = await db.doc.get('invoice', invoiceId, {
    fields: ['due_date', 'account_id', 'amount']
  });

  // Get default prediction to understand risk
  const defaultPred = await predictPaymentDefault({ invoiceId });

  // Base prediction on due date + historical average delay
  const dueDate = new Date(invoice.due_date);
  const avgDelay = defaultPred.paymentHistory.avgDaysLate || 0;
  
  // Adjust based on risk level
  let adjustedDelay = avgDelay;
  if (defaultPred.riskLevel === 'critical') {
    adjustedDelay += 30; // Add 30 days for critical risk
  } else if (defaultPred.riskLevel === 'high') {
    adjustedDelay += 15;
  } else if (defaultPred.riskLevel === 'medium') {
    adjustedDelay += 7;
  }

  const predictedDate = new Date(dueDate.getTime() + adjustedDelay * 24 * 60 * 60 * 1000);

  // Calculate confidence based on data quality
  const dataPoints = defaultPred.paymentHistory.totalInvoices;
  const confidence = Math.min(95, 40 + (dataPoints * 1.5));

  // Calculate range (±7 days)
  const earliest = new Date(predictedDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const latest = new Date(predictedDate.getTime() + 7 * 24 * 60 * 60 * 1000);

  const factors = [
    {
      factor: 'Historical Payment Pattern',
      influence: `Customer typically pays ${avgDelay} days after due date`
    },
    {
      factor: 'Risk Level',
      influence: `${defaultPred.riskLevel} risk adds ${adjustedDelay - avgDelay} days to estimate`
    }
  ];

  return {
    predictedDate: predictedDate.toISOString().split('T')[0],
    confidence,
    dateRange: {
      earliest: earliest.toISOString().split('T')[0],
      latest: latest.toISOString().split('T')[0]
    },
    factors
  };
}

// ============================================================================
// 3. INVOICE ANOMALY DETECTION
// ============================================================================

export interface AnomalyDetectionRequest {
  /** Invoice ID to check */
  invoiceId: string;
}

export interface AnomalyDetectionResponse {
  /** Whether anomalies detected */
  hasAnomalies: boolean;
  /** Anomaly score (0-100) */
  anomalyScore: number;
  /** Detected anomalies */
  anomalies: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    expectedValue?: any;
    actualValue?: any;
  }>;
  /** Recommended actions */
  actions: string[];
}

/**
 * Detect unusual patterns in invoices
 */
export async function detectAnomalies(request: AnomalyDetectionRequest): Promise<AnomalyDetectionResponse> {
  const { invoiceId } = request;

  // Fetch invoice
  const invoice = await db.doc.get('invoice', invoiceId, {
    fields: ['amount', 'invoice_date', 'due_date', 'account_id']
  });

  // Fetch invoice lines
  const lines = await db.find('invoice_line', {
    filters: [['invoice_id', '=', invoiceId]],
    fields: ['quantity', 'unit_price', 'line_amount']
  });

  // Fetch historical invoices for comparison
  const historicalInvoices = await db.find('invoice', {
    filters: [
      ['account_id', '=', invoice.account_id],
      ['id', '!=', invoiceId]
    ],
    fields: ['amount'],
    limit: 20
  });

  const anomalies = [];
  let anomalyScore = 0;

  // Check 1: Invoice amount anomaly
  if (historicalInvoices.length > 0) {
    const amounts = historicalInvoices.map((i: any) => i.amount);
    const avgAmount = amounts.reduce((a: number, b: number) => a + b, 0) / amounts.length;
    const deviation = Math.abs(invoice.amount - avgAmount) / avgAmount;

    if (deviation > 2) { // More than 200% different
      anomalies.push({
        type: 'Unusual Amount',
        severity: 'high' as const,
        description: 'Invoice amount significantly differs from historical average',
        expectedValue: `$${avgAmount.toLocaleString()}`,
        actualValue: `$${invoice.amount.toLocaleString()}`
      });
      anomalyScore += 40;
    } else if (deviation > 1) {
      anomalies.push({
        type: 'High Amount Variance',
        severity: 'medium' as const,
        description: 'Invoice amount higher than usual',
        expectedValue: `$${avgAmount.toLocaleString()}`,
        actualValue: `$${invoice.amount.toLocaleString()}`
      });
      anomalyScore += 25;
    }
  }

  // Check 2: Line item validation
  let calculatedTotal = 0;
  lines.forEach((line: any) => {
    const lineTotal = line.quantity * line.unit_price;
    if (Math.abs(lineTotal - line.line_amount) > 0.01) {
      anomalies.push({
        type: 'Line Item Calculation Error',
        severity: 'high' as const,
        description: 'Line amount does not match quantity × unit price',
        expectedValue: lineTotal,
        actualValue: line.line_amount
      });
      anomalyScore += 30;
    }
    calculatedTotal += line.line_amount;
  });

  // Check 3: Total validation
  if (Math.abs(calculatedTotal - invoice.amount) > 0.01) {
    anomalies.push({
      type: 'Invoice Total Mismatch',
      severity: 'high' as const,
      description: 'Invoice total does not match sum of line items',
      expectedValue: calculatedTotal,
      actualValue: invoice.amount
    });
    anomalyScore += 35;
  }

  // Check 4: Due date anomaly
  const invoiceDate = new Date(invoice.invoice_date);
  const dueDate = new Date(invoice.due_date);
  const daysDiff = (dueDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysDiff < 0) {
    anomalies.push({
      type: 'Invalid Due Date',
      severity: 'high' as const,
      description: 'Due date is before invoice date',
      expectedValue: 'Date after invoice date',
      actualValue: invoice.due_date
    });
    anomalyScore += 25;
  } else if (daysDiff > 90) {
    anomalies.push({
      type: 'Unusual Payment Terms',
      severity: 'low' as const,
      description: 'Payment terms exceed 90 days',
      expectedValue: '30-60 days',
      actualValue: `${Math.round(daysDiff)} days`
    });
    anomalyScore += 10;
  }

  anomalyScore = Math.min(100, anomalyScore);

  // Build action recommendations
  const actions = [];
  if (anomalies.some(a => a.severity === 'high')) {
    actions.push('Review invoice for errors before sending');
    actions.push('Verify calculations with accounting team');
  }
  if (anomalies.some(a => a.type === 'Unusual Amount')) {
    actions.push('Confirm pricing and quantities with customer');
  }

  return {
    hasAnomalies: anomalies.length > 0,
    anomalyScore,
    anomalies,
    actions
  };
}

// ============================================================================
// 4. COLLECTION STRATEGY OPTIMIZATION
// ============================================================================

export interface CollectionStrategyRequest {
  /** Invoice ID */
  invoiceId: string;
}

export interface CollectionStrategyResponse {
  /** Recommended strategy */
  strategy: 'automated' | 'personal-touch' | 'aggressive' | 'legal';
  /** Specific actions */
  actions: Array<{
    action: string;
    timing: string;
    channel: 'email' | 'phone' | 'mail' | 'in-person';
    priority: number;
  }>;
  /** Expected success rate */
  successProbability: number;
  /** Estimated collection time */
  estimatedDays: number;
}

/**
 * Optimize collection strategy based on customer profile
 */
export async function optimizeCollectionStrategy(request: CollectionStrategyRequest): Promise<CollectionStrategyResponse> {
  const { invoiceId } = request;

  // Get default prediction
  const defaultPred = await predictPaymentDefault({ invoiceId });

  let strategy: 'automated' | 'personal-touch' | 'aggressive' | 'legal';
  let successProbability: number;
  let estimatedDays: number;
  const actions = [];

  // Determine strategy based on risk level
  if (defaultPred.riskLevel === 'low') {
    strategy = 'automated';
    successProbability = 95;
    estimatedDays = 7;
    
    actions.push({
      action: 'Send automated payment reminder email',
      timing: '3 days before due date',
      channel: 'email' as const,
      priority: 1
    });
    actions.push({
      action: 'Send automated overdue notice',
      timing: '1 day after due date',
      channel: 'email' as const,
      priority: 2
    });
  } else if (defaultPred.riskLevel === 'medium') {
    strategy = 'personal-touch';
    successProbability = 75;
    estimatedDays = 14;
    
    actions.push({
      action: 'Personalized email from account manager',
      timing: 'On due date',
      channel: 'email' as const,
      priority: 1
    });
    actions.push({
      action: 'Follow-up phone call',
      timing: '3 days after due date',
      channel: 'phone' as const,
      priority: 2
    });
    actions.push({
      action: 'Offer payment plan',
      timing: '7 days after due date',
      channel: 'phone' as const,
      priority: 3
    });
  } else if (defaultPred.riskLevel === 'high') {
    strategy = 'aggressive';
    successProbability = 50;
    estimatedDays = 30;
    
    actions.push({
      action: 'Immediate phone call from collections team',
      timing: 'On due date',
      channel: 'phone' as const,
      priority: 1
    });
    actions.push({
      action: 'Formal demand letter',
      timing: '7 days after due date',
      channel: 'mail' as const,
      priority: 2
    });
    actions.push({
      action: 'Account suspension notice',
      timing: '14 days after due date',
      channel: 'email' as const,
      priority: 3
    });
  } else { // critical
    strategy = 'legal';
    successProbability = 30;
    estimatedDays = 60;
    
    actions.push({
      action: 'Final demand letter from legal',
      timing: 'Immediately',
      channel: 'mail' as const,
      priority: 1
    });
    actions.push({
      action: 'Engage collections agency',
      timing: '14 days if no response',
      channel: 'phone' as const,
      priority: 2
    });
    actions.push({
      action: 'Initiate legal proceedings',
      timing: '30 days if no payment',
      channel: 'mail' as const,
      priority: 3
    });
  }

  return {
    strategy,
    actions,
    successProbability,
    estimatedDays
  };
}

// ============================================================================
// 5. CASH FLOW FORECASTING
// ============================================================================

export interface CashFlowForecastRequest {
  /** Number of days to forecast */
  forecastDays?: number;
  /** Account ID filter (optional) */
  accountId?: string;
}

export interface CashFlowForecastResponse {
  /** Daily cash flow forecast */
  dailyForecast: Array<{
    date: string;
    expectedAmount: number;
    confidence: number;
    invoiceCount: number;
  }>;
  /** Summary statistics */
  summary: {
    totalExpected: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
  };
  /** Risk factors */
  risks: Array<{
    risk: string;
    impact: number;
  }>;
}

/**
 * Forecast incoming cash flow from invoices
 */
export async function forecastCashFlow(request: CashFlowForecastRequest): Promise<CashFlowForecastResponse> {
  const { forecastDays = 30, accountId } = request;

  // Fetch outstanding invoices
  const filters: any[] = [['status', '!=', 'Paid']];
  if (accountId) {
    filters.push(['account_id', '=', accountId]);
  }

  const invoices = await db.find('invoice', {
    filters,
    fields: ['id', 'amount', 'due_date', 'account_id']
  });

  // Build daily forecast
  const dailyForecast: any[] = [];
  const forecastMap: { [key: string]: { amount: number; count: number; totalConfidence: number } } = {};

  for (const invoice of invoices) {
    // Predict payment date and confidence
    const prediction = await predictPaymentDate({ invoiceId: invoice.id });
    const predDate = new Date(prediction.predictedDate);
    
    // Check if within forecast period
    const daysUntil = (predDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysUntil >= 0 && daysUntil <= forecastDays) {
      const dateKey = predDate.toISOString().split('T')[0];
      
      if (!forecastMap[dateKey]) {
        forecastMap[dateKey] = { amount: 0, count: 0, totalConfidence: 0 };
      }
      
      forecastMap[dateKey].amount += invoice.amount;
      forecastMap[dateKey].count++;
      forecastMap[dateKey].totalConfidence += prediction.confidence;
    }
  }

  // Convert map to array and sort
  Object.entries(forecastMap).forEach(([date, data]) => {
    dailyForecast.push({
      date,
      expectedAmount: Math.round(data.amount),
      confidence: Math.round(data.totalConfidence / data.count),
      invoiceCount: data.count
    });
  });

  dailyForecast.sort((a, b) => a.date.localeCompare(b.date));

  // Calculate summary
  const totalExpected = dailyForecast.reduce((sum, day) => sum + day.expectedAmount, 0);
  const highConfidence = dailyForecast.filter(d => d.confidence >= 80).reduce((sum, d) => sum + d.expectedAmount, 0);
  const mediumConfidence = dailyForecast.filter(d => d.confidence >= 50 && d.confidence < 80).reduce((sum, d) => sum + d.expectedAmount, 0);
  const lowConfidence = dailyForecast.filter(d => d.confidence < 50).reduce((sum, d) => sum + d.expectedAmount, 0);

  return {
    dailyForecast,
    summary: {
      totalExpected: Math.round(totalExpected),
      highConfidence: Math.round(highConfidence),
      mediumConfidence: Math.round(mediumConfidence),
      lowConfidence: Math.round(lowConfidence)
    },
    risks: [
      {
        risk: 'Customer payment delays',
        impact: Math.round(totalExpected * 0.15)
      },
      {
        risk: 'Economic downturn affecting payments',
        impact: Math.round(totalExpected * 0.1)
      }
    ]
  };
}
