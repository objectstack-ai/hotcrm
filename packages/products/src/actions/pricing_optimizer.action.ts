/**
 * Pricing Optimizer AI Enhancement Actions
 * 
 * This ObjectStack Action provides AI-powered pricing optimization capabilities.
 * 
 * Functionality:
 * 1. Pricing Optimization - Optimize product pricing
 * 2. Competitive Pricing Analysis - Compare pricing to competitors
 * 3. Discount Suggestions - Recommend optimal discounts
 * 4. Price Elasticity Prediction - Predict price sensitivity
 * 5. Optimal Price Calculation - Calculate revenue-maximizing price
 */

import { db } from '../db';

// ============================================================================
// 1. PRICING OPTIMIZATION
// ============================================================================

export interface OptimizePricingRequest {
  /** Product ID to optimize pricing for */
  productId: string;
  /** Account ID for customer-specific pricing */
  accountId?: string;
  /** Opportunity ID for deal-specific pricing */
  opportunityId?: string;
}

export interface OptimizePricingResponse {
  /** Current pricing */
  currentPricing: {
    listPrice: number;
    currentDiscount: number;
    netPrice: number;
  };
  /** Optimized pricing recommendation */
  optimizedPricing: {
    recommendedPrice: number;
    recommendedDiscount: number;
    expectedRevenue: number;
    confidence: number;
  };
  /** Pricing factors */
  factors: Array<{
    factor: string;
    impact: 'increase' | 'decrease' | 'neutral';
    weight: number;
    description: string;
  }>;
  /** Sensitivity analysis */
  sensitivity: {
    pricePoints: Array<{
      price: number;
      estimatedWinRate: number;
      expectedValue: number;
    }>;
    optimalPoint: number;
  };
  /** Recommendation rationale */
  rationale: string;
}

/**
 * Optimize product pricing
 */
export async function optimizePricing(request: OptimizePricingRequest): Promise<OptimizePricingResponse> {
  const { productId, accountId, opportunityId } = request;

  // Fetch product
  const product = await db.doc.get('product', productId, {
    fields: ['name', 'product_code', 'family', 'is_active']
  });

  // Fetch price book entries for this product
  const priceBookEntries = await db.find('price_book_entry', {
    filters: [['product_id', '=', productId]],
    fields: ['list_price', 'price_book_id'],
    limit: 10
  });

  const listPrice = priceBookEntries.length > 0 ? priceBookEntries[0].list_price : 50000;

  // Fetch historical deals for this product
  const historicalDeals = await db.find('opportunity', {
    filters: [
      ['stage', 'in', ['Closed Won', 'Closed Lost']]
    ],
    fields: ['amount', 'stage', 'close_date', 'account_id'],
    limit: 500
  });

  // Calculate win rates at different price points
  const wonDeals = historicalDeals.filter(d => d.stage === 'Closed Won');
  const avgWonPrice = wonDeals.length > 0 
    ? wonDeals.reduce((sum, d) => sum + (d.amount || 0), 0) / wonDeals.length 
    : listPrice;

  const baseWinRate = historicalDeals.length > 0 
    ? wonDeals.length / historicalDeals.length 
    : 0.25;

  let account = null;
  let opportunity = null;
  let currentDiscount = 0;

  // Get account-specific context
  if (accountId) {
    account = await db.doc.get('account', accountId, {
      fields: ['name', 'industry', 'number_of_employees', 'annual_revenue']
    });
  }

  // Get opportunity-specific context
  if (opportunityId) {
    opportunity = await db.doc.get('opportunity', opportunityId, {
      fields: ['amount', 'stage', 'probability', 'close_date']
    });
    
    if (opportunity.amount && listPrice > 0) {
      currentDiscount = ((listPrice - opportunity.amount) / listPrice) * 100;
    }
  }

  // Pricing factors analysis
  const factors = [];
  let priceAdjustment = 0;

  // Factor 1: Market demand
  const recentDemand = historicalDeals.filter(d => {
    const daysAgo = (Date.now() - new Date(d.close_date).getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= 90;
  });

  if (recentDemand.length > 10) {
    priceAdjustment += 5;
    factors.push({
      factor: 'High Market Demand',
      impact: 'increase' as const,
      weight: 5,
      description: 'Strong recent demand allows for premium pricing'
    });
  } else if (recentDemand.length < 5) {
    priceAdjustment -= 5;
    factors.push({
      factor: 'Low Market Demand',
      impact: 'decrease' as const,
      weight: -5,
      description: 'Limited demand suggests competitive pricing needed'
    });
  }

  // Factor 2: Customer size and revenue
  if (account) {
    const employeeCount = account.number_of_employees || 0;
    if (employeeCount > 1000) {
      priceAdjustment += 10;
      factors.push({
        factor: 'Enterprise Customer',
        impact: 'increase' as const,
        weight: 10,
        description: 'Large enterprise can support premium pricing'
      });
    } else if (employeeCount < 100) {
      priceAdjustment -= 8;
      factors.push({
        factor: 'Small Business',
        impact: 'decrease' as const,
        weight: -8,
        description: 'Small business requires competitive pricing'
      });
    }

    // Revenue-based adjustment
    const annualRevenue = account.annual_revenue || 0;
    if (annualRevenue > 100000000) {
      priceAdjustment += 5;
      factors.push({
        factor: 'High Revenue Customer',
        impact: 'increase' as const,
        weight: 5,
        description: 'Strong financial capacity'
      });
    }
  }

  // Factor 3: Deal stage and urgency
  if (opportunity) {
    const closeDate = new Date(opportunity.close_date);
    const daysToClose = (closeDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);

    if (daysToClose < 15) {
      priceAdjustment -= 5;
      factors.push({
        factor: 'Urgent Close Date',
        impact: 'decrease' as const,
        weight: -5,
        description: 'Close deadline may require flexibility'
      });
    }

    if (opportunity.stage === 'Negotiation') {
      priceAdjustment -= 3;
      factors.push({
        factor: 'Active Negotiation',
        impact: 'decrease' as const,
        weight: -3,
        description: 'Competitive situation requires strategic pricing'
      });
    }
  }

  // Factor 4: Historical win rate
  if (baseWinRate > 0.3) {
    priceAdjustment += 5;
    factors.push({
      factor: 'Strong Win Rate',
      impact: 'increase' as const,
      weight: 5,
      description: `${Math.round(baseWinRate * 100)}% win rate supports premium pricing`
    });
  } else if (baseWinRate < 0.2) {
    priceAdjustment -= 10;
    factors.push({
      factor: 'Low Win Rate',
      impact: 'decrease' as const,
      weight: -10,
      description: 'Lower win rate suggests price is barrier'
    });
  }

  // Calculate optimized price
  const recommendedDiscount = Math.max(0, Math.min(40, 15 - priceAdjustment));
  const recommendedPrice = Math.round(listPrice * (1 - recommendedDiscount / 100));
  
  // Estimate expected revenue based on win rate curve
  const estimatedWinRate = baseWinRate * (1 + (priceAdjustment / 100));
  const expectedRevenue = Math.round(recommendedPrice * Math.min(0.95, estimatedWinRate));

  // Generate sensitivity analysis
  const pricePoints = [];
  for (let discount = 0; discount <= 40; discount += 5) {
    const price = Math.round(listPrice * (1 - discount / 100));
    const winRate = baseWinRate * (1 + ((15 - discount) / 100));
    const expectedValue = Math.round(price * Math.min(0.95, winRate));
    
    pricePoints.push({
      price,
      estimatedWinRate: Math.round(Math.min(95, winRate * 100)),
      expectedValue
    });
  }

  const optimalPoint = pricePoints.reduce((best, current) => 
    current.expectedValue > best.expectedValue ? current : best
  );

  // Generate rationale
  let rationale = '';
  if (recommendedDiscount < 10) {
    rationale = 'Strong market position and customer profile support premium pricing with minimal discount.';
  } else if (recommendedDiscount < 20) {
    rationale = 'Balanced pricing strategy recommended to optimize win rate and revenue.';
  } else if (recommendedDiscount < 30) {
    rationale = 'Competitive pricing needed to improve win probability while maintaining acceptable margins.';
  } else {
    rationale = 'Aggressive pricing recommended due to competitive pressures or customer constraints.';
  }

  return {
    currentPricing: {
      listPrice,
      currentDiscount: Math.round(currentDiscount),
      netPrice: opportunity?.amount || listPrice
    },
    optimizedPricing: {
      recommendedPrice,
      recommendedDiscount: Math.round(recommendedDiscount),
      expectedRevenue,
      confidence: Math.min(90, 60 + (historicalDeals.length > 20 ? 20 : historicalDeals.length))
    },
    factors,
    sensitivity: {
      pricePoints,
      optimalPoint: optimalPoint.price
    },
    rationale
  };
}

// ============================================================================
// 2. COMPETITIVE PRICING ANALYSIS
// ============================================================================

export interface AnalyzeCompetitivePricingRequest {
  /** Product ID to analyze */
  productId: string;
  /** Market segment */
  segment?: 'enterprise' | 'mid-market' | 'smb';
}

export interface AnalyzeCompetitivePricingResponse {
  /** Your pricing position */
  yourPosition: {
    price: number;
    percentile: number;
    positioning: 'premium' | 'competitive' | 'value' | 'budget';
  };
  /** Market pricing data */
  marketData: {
    averagePrice: number;
    medianPrice: number;
    priceRange: {
      low: number;
      high: number;
    };
    standardDeviation: number;
  };
  /** Competitive comparison */
  competitors: Array<{
    competitor: string;
    estimatedPrice: number;
    priceDifference: number;
    positioningStrategy: string;
  }>;
  /** Pricing insights */
  insights: Array<{
    insight: string;
    recommendation: string;
    impact: 'high' | 'medium' | 'low';
  }>;
}

/**
 * Compare pricing to competitors
 */
export async function analyzeCompetitivePricing(request: AnalyzeCompetitivePricingRequest): Promise<AnalyzeCompetitivePricingResponse> {
  const { productId, segment = 'mid-market' } = request;

  // Fetch product
  const product = await db.doc.get('product', productId, {
    fields: ['name', 'product_code', 'family']
  });

  // Fetch price book entry
  const priceEntries = await db.find('price_book_entry', {
    filters: [['product_id', '=', productId]],
    fields: ['list_price'],
    limit: 1
  });

  const yourPrice = priceEntries.length > 0 ? priceEntries[0].list_price : 50000;

  // Fetch market data from historical opportunities
  const marketDeals = await db.find('opportunity', {
    filters: [['stage', '=', 'Closed Won']],
    fields: ['amount', 'close_date'],
    limit: 1000
  });

  // Simulate competitive pricing data
  const competitorPrices = [];
  const segmentMultiplier = segment === 'enterprise' ? 1.5 : segment === 'mid-market' ? 1.0 : 0.6;
  
  // Generate simulated competitor data
  const basePrice = 45000 * segmentMultiplier;
  competitorPrices.push(
    basePrice * 1.2,  // Premium competitor
    basePrice * 1.1,  // Competitor A
    basePrice,        // Market average
    basePrice * 0.9,  // Competitor B
    basePrice * 0.7   // Budget competitor
  );

  const averagePrice = competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length;
  const sortedPrices = [...competitorPrices].sort((a, b) => a - b);
  const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];
  
  const variance = competitorPrices.reduce((sum, price) => 
    sum + Math.pow(price - averagePrice, 2), 0
  ) / competitorPrices.length;
  const standardDeviation = Math.sqrt(variance);

  // Determine your position
  const sortedWithYours = [...competitorPrices, yourPrice].sort((a, b) => a - b);
  const percentile = (sortedWithYours.indexOf(yourPrice) / sortedWithYours.length) * 100;

  let positioning: 'premium' | 'competitive' | 'value' | 'budget';
  if (percentile >= 75) positioning = 'premium';
  else if (percentile >= 45) positioning = 'competitive';
  else if (percentile >= 25) positioning = 'value';
  else positioning = 'budget';

  // Build competitor comparison
  const competitors = [
    {
      competitor: 'Market Leader',
      estimatedPrice: Math.round(basePrice * 1.2),
      priceDifference: Math.round(((basePrice * 1.2) - yourPrice) / yourPrice * 100),
      positioningStrategy: 'Premium features and brand recognition'
    },
    {
      competitor: 'Competitor A',
      estimatedPrice: Math.round(basePrice * 1.1),
      priceDifference: Math.round(((basePrice * 1.1) - yourPrice) / yourPrice * 100),
      positioningStrategy: 'Feature parity with strong support'
    },
    {
      competitor: 'Competitor B',
      estimatedPrice: Math.round(basePrice * 0.9),
      priceDifference: Math.round(((basePrice * 0.9) - yourPrice) / yourPrice * 100),
      positioningStrategy: 'Value pricing with good features'
    },
    {
      competitor: 'Budget Provider',
      estimatedPrice: Math.round(basePrice * 0.7),
      priceDifference: Math.round(((basePrice * 0.7) - yourPrice) / yourPrice * 100),
      positioningStrategy: 'Low cost, basic features'
    }
  ];

  // Generate insights
  const insights = [];

  if (positioning === 'premium') {
    insights.push({
      insight: 'Your pricing is in the top 25% of the market',
      recommendation: 'Ensure premium features and support justify higher price point',
      impact: 'high' as const
    });
  } else if (positioning === 'budget') {
    insights.push({
      insight: 'Your pricing is significantly below market average',
      recommendation: 'Consider raising prices to improve margins without losing competitiveness',
      impact: 'high' as const
    });
  }

  const priceDiffFromAvg = ((yourPrice - averagePrice) / averagePrice) * 100;
  if (Math.abs(priceDiffFromAvg) > 30) {
    insights.push({
      insight: `Your price is ${Math.abs(Math.round(priceDiffFromAvg))}% ${priceDiffFromAvg > 0 ? 'above' : 'below'} market average`,
      recommendation: 'Review value proposition to ensure alignment with pricing',
      impact: 'medium' as const
    });
  }

  insights.push({
    insight: `Market price range is $${Math.round(sortedPrices[0]).toLocaleString()} - $${Math.round(sortedPrices[sortedPrices.length - 1]).toLocaleString()}`,
    recommendation: 'Maintain pricing within competitive range while differentiating on value',
    impact: 'low' as const
  });

  return {
    yourPosition: {
      price: yourPrice,
      percentile: Math.round(percentile),
      positioning
    },
    marketData: {
      averagePrice: Math.round(averagePrice),
      medianPrice: Math.round(medianPrice),
      priceRange: {
        low: Math.round(sortedPrices[0]),
        high: Math.round(sortedPrices[sortedPrices.length - 1])
      },
      standardDeviation: Math.round(standardDeviation)
    },
    competitors,
    insights
  };
}

// ============================================================================
// 3. DISCOUNT SUGGESTIONS
// ============================================================================

export interface SuggestDiscountsRequest {
  /** Opportunity ID */
  opportunityId: string;
  /** Target win probability */
  targetWinRate?: number;
}

export interface SuggestDiscountsResponse {
  /** Current discount */
  currentDiscount: {
    amount: number;
    percentage: number;
  };
  /** Recommended discount */
  recommendedDiscount: {
    amount: number;
    percentage: number;
    reasoning: string;
  };
  /** Discount tiers */
  tiers: Array<{
    tier: string;
    discountPercent: number;
    expectedWinRate: number;
    expectedRevenue: number;
    approvalRequired: boolean;
  }>;
  /** Negotiation strategy */
  strategy: {
    opening: number;
    target: number;
    walkaway: number;
    concessions: string[];
  };
}

/**
 * Recommend optimal discounts
 */
export async function suggestDiscounts(request: SuggestDiscountsRequest): Promise<SuggestDiscountsResponse> {
  const { opportunityId, targetWinRate = 70 } = request;

  // Fetch opportunity
  const opportunity = await db.doc.get('opportunity', opportunityId, {
    fields: ['name', 'amount', 'stage', 'probability', 'close_date', 'account_id']
  });

  // Fetch account
  const account = await db.doc.get('account', opportunity.account_id, {
    fields: ['name', 'industry', 'number_of_employees', 'annual_revenue']
  });

  // Get quote line items if available
  const quotes = await db.find('quote', {
    filters: [['opportunity_id', '=', opportunityId]],
    fields: ['total_price', 'discount', 'status'],
    limit: 10
  });

  const currentQuote = quotes.length > 0 ? quotes[0] : null;
  const listPrice = currentQuote?.total_price ? currentQuote.total_price / (1 - (currentQuote.discount || 0) / 100) : opportunity.amount * 1.15;
  const currentDiscountAmount = listPrice - (opportunity.amount || listPrice);
  const currentDiscountPercent = (currentDiscountAmount / listPrice) * 100;

  // Analyze historical discount patterns
  const historicalDeals = await db.find('opportunity', {
    filters: [
      ['stage', 'in', ['Closed Won', 'Closed Lost']],
      ['close_date', '>=', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()]
    ],
    fields: ['amount', 'stage', 'probability'],
    limit: 500
  });

  const wonDeals = historicalDeals.filter(d => d.stage === 'Closed Won');
  const baseWinRate = historicalDeals.length > 0 ? wonDeals.length / historicalDeals.length : 0.25;

  // Calculate recommended discount to achieve target win rate
  // Formula: Higher discount = higher win rate, but diminishing returns
  const discountToWinRateMultiplier = 1.5; // 1% discount adds 1.5% win rate
  const currentWinRate = opportunity.probability || (baseWinRate * 100);
  const winRateGap = targetWinRate - currentWinRate;
  const additionalDiscount = Math.max(0, winRateGap / discountToWinRateMultiplier);
  
  const recommendedDiscountPercent = Math.min(40, currentDiscountPercent + additionalDiscount);
  const recommendedDiscountAmount = Math.round(listPrice * recommendedDiscountPercent / 100);

  // Generate reasoning
  let reasoning = '';
  if (recommendedDiscountPercent < 10) {
    reasoning = 'Strong position with high win probability. Minimal discount recommended to maximize revenue.';
  } else if (recommendedDiscountPercent < 20) {
    reasoning = 'Standard discount within normal range. Maintains healthy margins while staying competitive.';
  } else if (recommendedDiscountPercent < 30) {
    reasoning = 'Competitive discount needed to achieve target win rate. Still within acceptable margin thresholds.';
  } else {
    reasoning = 'Aggressive discount required for highly competitive situation. Consider adding value instead of deeper discount.';
  }

  // Create discount tiers
  const tiers = [
    {
      tier: 'Standard',
      discountPercent: 10,
      expectedWinRate: Math.round(baseWinRate * 100 + 15),
      expectedRevenue: Math.round(listPrice * 0.9 * (baseWinRate + 0.15)),
      approvalRequired: false
    },
    {
      tier: 'Competitive',
      discountPercent: 20,
      expectedWinRate: Math.round(baseWinRate * 100 + 30),
      expectedRevenue: Math.round(listPrice * 0.8 * (baseWinRate + 0.30)),
      approvalRequired: true
    },
    {
      tier: 'Strategic',
      discountPercent: 30,
      expectedWinRate: Math.round(baseWinRate * 100 + 40),
      expectedRevenue: Math.round(listPrice * 0.7 * (baseWinRate + 0.40)),
      approvalRequired: true
    },
    {
      tier: 'Maximum',
      discountPercent: 40,
      expectedWinRate: Math.round(Math.min(95, baseWinRate * 100 + 45)),
      expectedRevenue: Math.round(listPrice * 0.6 * Math.min(0.95, baseWinRate + 0.45)),
      approvalRequired: true
    }
  ];

  // Negotiation strategy
  const opening = Math.round(recommendedDiscountPercent * 0.7); // Start lower
  const target = Math.round(recommendedDiscountPercent);
  const walkaway = Math.round(Math.min(45, recommendedDiscountPercent * 1.3)); // Max acceptable

  const concessions = [
    'Start with value-based positioning before discussing price',
    `Open at ${opening}% discount, position as competitive offer`,
    `Target settlement at ${target}% with trade-offs for contract length or payment terms`,
    'Offer additional services or support instead of deeper discounts',
    `Walk away if discount exceeds ${walkaway}% without executive approval`
  ];

  return {
    currentDiscount: {
      amount: Math.round(currentDiscountAmount),
      percentage: Math.round(currentDiscountPercent)
    },
    recommendedDiscount: {
      amount: recommendedDiscountAmount,
      percentage: Math.round(recommendedDiscountPercent),
      reasoning
    },
    tiers,
    strategy: {
      opening,
      target,
      walkaway,
      concessions
    }
  };
}

// ============================================================================
// 4. PRICE ELASTICITY PREDICTION
// ============================================================================

export interface PredictPriceElasticityRequest {
  /** Product ID */
  productId: string;
  /** Customer segment */
  segment?: 'enterprise' | 'mid-market' | 'smb';
}

export interface PredictPriceElasticityResponse {
  /** Elasticity coefficient */
  elasticity: {
    coefficient: number;
    interpretation: 'elastic' | 'unit-elastic' | 'inelastic';
    description: string;
  };
  /** Demand sensitivity */
  demandCurve: Array<{
    pricePoint: number;
    expectedDemand: number;
    revenue: number;
  }>;
  /** Optimal pricing zone */
  optimalZone: {
    minPrice: number;
    maxPrice: number;
    expectedVolume: number;
    expectedRevenue: number;
  };
  /** Insights */
  insights: Array<{
    finding: string;
    implication: string;
  }>;
}

/**
 * Predict price sensitivity
 */
export async function predictPriceElasticity(request: PredictPriceElasticityRequest): Promise<PredictPriceElasticityResponse> {
  const { productId, segment = 'mid-market' } = request;

  // Fetch product
  const product = await db.doc.get('product', productId, {
    fields: ['name', 'product_code', 'family']
  });

  // Fetch historical pricing and volume data
  const historicalOpps = await db.find('opportunity', {
    filters: [['stage', '=', 'Closed Won']],
    fields: ['amount', 'close_date', 'quantity'],
    limit: 1000
  });

  // Calculate price elasticity
  // Elasticity = % change in quantity / % change in price
  // For simulation, use industry-typical values
  let elasticityCoefficient = -1.5; // Default moderately elastic

  if (segment === 'enterprise') {
    elasticityCoefficient = -0.8; // Less elastic (less sensitive to price)
  } else if (segment === 'smb') {
    elasticityCoefficient = -2.2; // More elastic (more sensitive to price)
  }

  let interpretation: 'elastic' | 'unit-elastic' | 'inelastic';
  let description = '';

  if (Math.abs(elasticityCoefficient) > 1) {
    interpretation = 'elastic';
    description = 'Demand is sensitive to price changes. Price reductions lead to proportionally larger increases in demand.';
  } else if (Math.abs(elasticityCoefficient) === 1) {
    interpretation = 'unit-elastic';
    description = 'Demand changes proportionally with price. Revenue remains relatively constant.';
  } else {
    interpretation = 'inelastic';
    description = 'Demand is relatively insensitive to price changes. Price increases have minimal impact on volume.';
  }

  // Build demand curve
  const basePrice = 50000;
  const baseVolume = 100;
  const demandCurve = [];

  for (let priceMultiplier = 0.7; priceMultiplier <= 1.5; priceMultiplier += 0.1) {
    const price = Math.round(basePrice * priceMultiplier);
    const priceChange = (priceMultiplier - 1);
    const volumeChange = priceChange * elasticityCoefficient;
    const volume = Math.round(baseVolume * (1 + volumeChange));
    const revenue = price * Math.max(0, volume);

    demandCurve.push({
      pricePoint: price,
      expectedDemand: Math.max(0, volume),
      revenue: Math.round(revenue)
    });
  }

  // Find optimal pricing zone (max revenue)
  const sortedByRevenue = [...demandCurve].sort((a, b) => b.revenue - a.revenue);
  const optimalPrice = sortedByRevenue[0].pricePoint;
  const optimalIndex = demandCurve.findIndex(d => d.pricePoint === optimalPrice);
  
  const optimalZone = {
    minPrice: demandCurve[Math.max(0, optimalIndex - 1)].pricePoint,
    maxPrice: demandCurve[Math.min(demandCurve.length - 1, optimalIndex + 1)].pricePoint,
    expectedVolume: sortedByRevenue[0].expectedDemand,
    expectedRevenue: sortedByRevenue[0].revenue
  };

  // Generate insights
  const insights = [];

  if (interpretation === 'elastic') {
    insights.push({
      finding: 'Market is price-sensitive',
      implication: 'Focus on value pricing and volume. Small price reductions can significantly increase market share.'
    });
    insights.push({
      finding: 'Competitive dynamics are strong',
      implication: 'Customers have alternatives and will switch based on price. Differentiation is critical.'
    });
  } else if (interpretation === 'inelastic') {
    insights.push({
      finding: 'Market is price-insensitive',
      implication: 'Premium pricing strategy is viable. Focus on value and differentiation rather than price competition.'
    });
    insights.push({
      finding: 'Strong product-market fit',
      implication: 'Customers see high value and have limited alternatives. Consider strategic price increases.'
    });
  }

  insights.push({
    finding: `Optimal pricing zone is $${optimalZone.minPrice.toLocaleString()} - $${optimalZone.maxPrice.toLocaleString()}`,
    implication: 'Pricing within this range maximizes expected revenue based on demand sensitivity.'
  });

  return {
    elasticity: {
      coefficient: Math.round(elasticityCoefficient * 100) / 100,
      interpretation,
      description
    },
    demandCurve,
    optimalZone,
    insights
  };
}

// ============================================================================
// 5. OPTIMAL PRICE CALCULATION
// ============================================================================

export interface CalculateOptimalPriceRequest {
  /** Product ID */
  productId: string;
  /** Account ID for context */
  accountId?: string;
  /** Cost basis (if available) */
  costBasis?: number;
  /** Target margin percentage */
  targetMargin?: number;
}

export interface CalculateOptimalPriceResponse {
  /** Optimal price recommendation */
  optimalPrice: {
    price: number;
    confidence: number;
    expectedWinRate: number;
    expectedRevenue: number;
  };
  /** Pricing analysis */
  analysis: {
    costBasis: number;
    targetMargin: number;
    marketPrice: number;
    valuePrice: number;
    competitivePrice: number;
  };
  /** Revenue maximization */
  revenueMaximization: {
    currentRevenue: number;
    optimizedRevenue: number;
    upliftPercent: number;
    upliftAmount: number;
  };
  /** Pricing rationale */
  rationale: {
    approach: string;
    keyFactors: string[];
    risks: string[];
  };
}

/**
 * Calculate revenue-maximizing price
 */
export async function calculateOptimalPrice(request: CalculateOptimalPriceRequest): Promise<CalculateOptimalPriceResponse> {
  const { productId, accountId, costBasis = 20000, targetMargin = 60 } = request;

  // Fetch product
  const product = await db.doc.get('product', productId, {
    fields: ['name', 'product_code', 'family']
  });

  // Get current price
  const priceEntries = await db.find('price_book_entry', {
    filters: [['product_id', '=', productId]],
    fields: ['list_price'],
    limit: 1
  });

  const currentPrice = priceEntries.length > 0 ? priceEntries[0].list_price : 50000;

  // Get account context if provided
  let account = null;
  if (accountId) {
    account = await db.doc.get('account', accountId, {
      fields: ['name', 'industry', 'number_of_employees', 'annual_revenue']
    });
  }

  // Calculate different pricing approaches
  
  // 1. Cost-plus pricing
  const costPlusPrice = Math.round(costBasis / (1 - targetMargin / 100));

  // 2. Market-based pricing (from competitors)
  const marketPrice = currentPrice; // Use current as proxy for market

  // 3. Value-based pricing
  let valueFactor = 1.0;
  if (account) {
    const employeeCount = account.number_of_employees || 0;
    if (employeeCount > 1000) valueFactor = 1.3;
    else if (employeeCount < 100) valueFactor = 0.8;
  }
  const valuePrice = Math.round(marketPrice * valueFactor);

  // 4. Competitive pricing (slight discount to market)
  const competitivePrice = Math.round(marketPrice * 0.95);

  // Get historical win rates at different price points
  const historicalDeals = await db.find('opportunity', {
    filters: [['stage', 'in', ['Closed Won', 'Closed Lost']]],
    fields: ['amount', 'stage'],
    limit: 500
  });

  const baseWinRate = historicalDeals.length > 0
    ? historicalDeals.filter(d => d.stage === 'Closed Won').length / historicalDeals.length
    : 0.25;

  // Calculate expected revenue for each approach
  const approaches = [
    { name: 'Cost-Plus', price: costPlusPrice, winRate: baseWinRate * 0.9 },
    { name: 'Market', price: marketPrice, winRate: baseWinRate },
    { name: 'Value', price: valuePrice, winRate: baseWinRate * 0.85 },
    { name: 'Competitive', price: competitivePrice, winRate: baseWinRate * 1.1 }
  ];

  approaches.forEach(a => {
    a.expectedRevenue = Math.round(a.price * a.winRate);
  });

  // Find optimal (highest expected revenue)
  const optimal = approaches.reduce((best, current) => 
    current.expectedRevenue > best.expectedRevenue ? current : best
  );

  const optimalPrice = optimal.price;
  const expectedWinRate = Math.min(0.95, optimal.winRate);
  const expectedRevenue = optimal.expectedRevenue;

  // Calculate revenue uplift
  const currentRevenue = Math.round(currentPrice * baseWinRate);
  const upliftAmount = expectedRevenue - currentRevenue;
  const upliftPercent = (upliftAmount / currentRevenue) * 100;

  // Build rationale
  const keyFactors = [];
  const risks = [];

  if (optimal.name === 'Value') {
    keyFactors.push('Customer profile supports premium value pricing');
    keyFactors.push('Strong differentiation justifies price premium');
    risks.push('May face resistance if value proposition is not clearly communicated');
  } else if (optimal.name === 'Competitive') {
    keyFactors.push('Competitive pricing maximizes volume and market share');
    keyFactors.push('Strong win rate expected due to attractive pricing');
    risks.push('Lower margins may impact profitability');
  } else if (optimal.name === 'Cost-Plus') {
    keyFactors.push('Ensures healthy margins above cost basis');
    keyFactors.push('Sustainable pricing for long-term profitability');
    risks.push('May not be competitive if market prices are lower');
  } else {
    keyFactors.push('Market-aligned pricing balances competitiveness and margins');
    keyFactors.push('Follows established market expectations');
    risks.push('May leave money on the table if customers value product highly');
  }

  return {
    optimalPrice: {
      price: optimalPrice,
      confidence: Math.round(Math.min(90, 60 + (historicalDeals.length > 50 ? 20 : historicalDeals.length / 3))),
      expectedWinRate: Math.round(expectedWinRate * 100),
      expectedRevenue
    },
    analysis: {
      costBasis,
      targetMargin,
      marketPrice,
      valuePrice,
      competitivePrice
    },
    revenueMaximization: {
      currentRevenue,
      optimizedRevenue: expectedRevenue,
      upliftPercent: Math.round(upliftPercent * 10) / 10,
      upliftAmount
    },
    rationale: {
      approach: `${optimal.name}-based pricing`,
      keyFactors,
      risks
    }
  };
}

export default {
  optimizePricing,
  analyzeCompetitivePricing,
  suggestDiscounts,
  predictPriceElasticity,
  calculateOptimalPrice
};
