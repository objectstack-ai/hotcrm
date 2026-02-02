/**
 * Product Recommendation AI Enhancement Actions
 * 
 * This ObjectStack Action provides AI-powered product recommendation capabilities.
 * 
 * Functionality:
 * 1. Product Recommendations - Recommend products for a customer
 * 2. Cross-sell Opportunities - Identify cross-sell opportunities
 * 3. Product Bundle Suggestions - Suggest product bundles
 * 4. Product Fit Analysis - Analyze product-customer fit
 * 5. Product Adoption Prediction - Predict product adoption likelihood
 */

import { db } from '../db';

// ============================================================================
// 1. PRODUCT RECOMMENDATIONS
// ============================================================================

export interface RecommendProductsRequest {
  /** Customer account ID */
  accountId: string;
  /** Opportunity ID (optional, for context) */
  opportunityId?: string;
  /** Maximum number of recommendations */
  maxRecommendations?: number;
}

export interface RecommendProductsResponse {
  /** Recommended products */
  recommendations: Array<{
    product_id: string;
    product_name: string;
    product_code: string;
    relevanceScore: number;
    confidence: number;
    reason: string;
    estimatedValue: number;
    priority: 'high' | 'medium' | 'low';
  }>;
  /** Customer context */
  customerContext: {
    industry: string;
    size: string;
    currentProducts: string[];
    purchaseHistory: number;
  };
  /** Recommendation strategy */
  strategy: {
    approach: string;
    factors: string[];
    confidence: number;
  };
}

/**
 * Recommend products for a customer
 */
export async function recommendProducts(request: RecommendProductsRequest): Promise<RecommendProductsResponse> {
  const { accountId, maxRecommendations = 5 } = request;

  // Fetch account data
  const account = await db.doc.get('account', accountId, {
    fields: ['name', 'industry', 'number_of_employees', 'annual_revenue', 'type']
  });

  // Fetch customer's current products (via opportunities or contracts)
  const existingOpps = await db.find('opportunity', {
    filters: [
      ['account_id', '=', accountId],
      ['stage', '=', 'Closed Won']
    ],
    fields: ['name', 'amount', 'close_date']
  });

  // Fetch all available products
  const allProducts = await db.find('product', {
    filters: [['is_active', '=', true]],
    fields: ['product_id', 'name', 'product_code', 'description', 'family', 'is_active'],
    limit: 100
  });

  // Get product usage patterns from similar accounts
  const similarAccounts = await db.find('account', {
    filters: [
      ['industry', '=', account.industry],
      ['account_id', '!=', accountId]
    ],
    fields: ['account_id', 'number_of_employees'],
    limit: 50
  });

  // Build recommendation scoring
  const recommendations = allProducts.map((product: any) => {
    let relevanceScore = 50; // Base score
    let reason = '';
    let priority: 'high' | 'medium' | 'low' = 'medium';

    // Industry fit scoring
    if (account.industry === 'Technology' && product.family === 'Software') {
      relevanceScore += 20;
      reason = 'Strong fit for technology sector';
    } else if (account.industry === 'Manufacturing' && product.family === 'Hardware') {
      relevanceScore += 20;
      reason = 'Ideal for manufacturing operations';
    } else if (account.industry === 'Healthcare' && product.family === 'Compliance') {
      relevanceScore += 25;
      reason = 'Essential for healthcare compliance';
    }

    // Company size fit
    const employeeCount = account.number_of_employees || 0;
    if (employeeCount > 1000 && product.name.includes('Enterprise')) {
      relevanceScore += 15;
      reason += reason ? ' and enterprise-scale ready' : 'Enterprise-scale solution';
    } else if (employeeCount < 100 && product.name.includes('Starter')) {
      relevanceScore += 15;
      reason += reason ? ' and sized for small business' : 'Right-sized for small business';
    }

    // Revenue fit
    const annualRevenue = account.annual_revenue || 0;
    if (annualRevenue > 10000000 && product.name.includes('Premium')) {
      relevanceScore += 10;
    }

    // Avoid duplicate recommendations of existing products
    const hasProduct = existingOpps.some((o: any) => o.name.includes(product.name));
    if (hasProduct) {
      relevanceScore -= 50;
      reason = 'Customer already has this product';
    }

    // Set priority based on score
    if (relevanceScore >= 80) priority = 'high';
    else if (relevanceScore >= 60) priority = 'medium';
    else priority = 'low';

    // Estimate value based on account revenue
    const estimatedValue = Math.round((annualRevenue * 0.001) + (employeeCount * 50));

    return {
      product_id: product.product_id,
      product_name: product.name,
      product_code: product.product_code,
      relevanceScore: Math.min(100, relevanceScore),
      confidence: Math.min(95, relevanceScore * 0.9),
      reason: reason || 'Good general fit for customer profile',
      estimatedValue,
      priority
    };
  });

  // Sort by relevance and take top N
  const topRecommendations = recommendations
    .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxRecommendations);

  return {
    recommendations: topRecommendations,
    customerContext: {
      industry: account.industry || 'Unknown',
      size: account.number_of_employees > 1000 ? 'Enterprise' : account.number_of_employees > 100 ? 'Mid-Market' : 'Small Business',
      currentProducts: existingOpps.map((o: any) => o.name),
      purchaseHistory: existingOpps.reduce((sum: number, o: any) => sum + (o.amount || 0), 0)
    },
    strategy: {
      approach: 'Industry and company size matching with usage pattern analysis',
      factors: ['Industry alignment', 'Company size', 'Revenue capacity', 'Existing product portfolio'],
      confidence: topRecommendations.length > 0 
        ? Math.round(topRecommendations.reduce((sum: number, r: any) => sum + r.confidence, 0) / topRecommendations.length)
        : 0
    }
  };
}

// ============================================================================
// 2. CROSS-SELL OPPORTUNITIES
// ============================================================================

export interface FindCrossSellOpportunitiesRequest {
  /** Account ID to analyze */
  accountId: string;
  /** Minimum opportunity value threshold */
  minValue?: number;
}

export interface FindCrossSellOpportunitiesResponse {
  /** Cross-sell opportunities */
  opportunities: Array<{
    product_id: string;
    product_name: string;
    opportunityType: 'cross-sell' | 'upsell' | 'add-on';
    compatibilityScore: number;
    estimatedRevenue: number;
    timeToClose: number;
    triggerEvent: string;
    reasoning: string;
  }>;
  /** Account readiness */
  readiness: {
    score: number;
    status: 'ready' | 'nurture' | 'not-ready';
    factors: Array<{
      factor: string;
      impact: 'positive' | 'negative' | 'neutral';
      description: string;
    }>;
  };
  /** Recommended next steps */
  nextSteps: Array<{
    step: string;
    timeline: string;
    owner: string;
  }>;
}

/**
 * Identify cross-sell opportunities
 */
export async function findCrossSellOpportunities(request: FindCrossSellOpportunitiesRequest): Promise<FindCrossSellOpportunitiesResponse> {
  const { accountId, minValue = 10000 } = request;

  // Get account and current products
  const account = await db.doc.get('account', accountId, {
    fields: ['name', 'industry', 'number_of_employees', 'annual_revenue']
  });

  // Get existing products
  const currentProducts = await db.find('opportunity', {
    filters: [
      ['account_id', '=', accountId],
      ['stage', '=', 'Closed Won']
    ],
    fields: ['name', 'amount', 'close_date']
  });

  // Get all products
  const allProducts = await db.find('product', {
    filters: [['is_active', '=', true]],
    fields: ['product_id', 'name', 'product_code', 'family', 'description']
  });

  // Get customer engagement data
  const recentActivities = await db.find('activity', {
    filters: [
      ['account_id', '=', accountId],
      ['activity_date', '>=', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()]
    ],
    fields: ['subject', 'activity_date', 'activity_type'],
    limit: 100
  });

  const opportunities = [];
  const currentProductNames = currentProducts.map((p: any) => p.name.toLowerCase());

  for (const product of allProducts) {
    // Skip if customer already has this product
    if (currentProductNames.some((name: any) => name.includes(product.name.toLowerCase()))) {
      continue;
    }

    let compatibilityScore = 60;
    let opportunityType: 'cross-sell' | 'upsell' | 'add-on' = 'cross-sell';
    let triggerEvent = '';
    let reasoning = '';

    // Check for complementary products
    const hasRelatedProduct = currentProducts.some((cp: any) => {
      const cpFamily = cp.name.split(' ')[0];
      return product.family === cpFamily || product.name.includes(cpFamily);
    });

    if (hasRelatedProduct) {
      compatibilityScore += 25;
      opportunityType = 'add-on';
      triggerEvent = 'Customer has complementary product';
      reasoning = `Natural extension of existing ${product.family} usage`;
    }

    // Check for premium upgrade opportunity
    if (product.name.includes('Premium') || product.name.includes('Enterprise')) {
      const hasBasicVersion = currentProducts.some((cp: any) => 
        product.name.replace('Premium', '').replace('Enterprise', '').trim() === cp.name.trim()
      );
      
      if (hasBasicVersion) {
        compatibilityScore += 30;
        opportunityType = 'upsell';
        triggerEvent = 'Customer ready for premium tier';
        reasoning = 'Upgrade to unlock advanced features and scale';
      }
    }

    // Industry-specific fit
    if (account.industry === 'Financial Services' && product.family === 'Security') {
      compatibilityScore += 20;
      reasoning = 'Critical for financial services compliance';
    }

    // Engagement-based triggers
    if (recentActivities.length > 10) {
      compatibilityScore += 10;
      triggerEvent = triggerEvent || 'High engagement indicates expansion readiness';
    }

    // Calculate estimated revenue
    const basePrice = (account.annual_revenue || 0) * 0.002;
    const employeeFactor = (account.number_of_employees || 10) * 100;
    const estimatedRevenue = Math.max(minValue, Math.round(basePrice + employeeFactor));

    // Time to close estimation
    const timeToClose = opportunityType === 'add-on' ? 30 : opportunityType === 'upsell' ? 45 : 60;

    if (compatibilityScore >= 70 && estimatedRevenue >= minValue) {
      opportunities.push({
        product_id: product.product_id,
        product_name: product.name,
        opportunityType,
        compatibilityScore: Math.min(100, compatibilityScore),
        estimatedRevenue,
        timeToClose,
        triggerEvent: triggerEvent || 'Strategic product alignment',
        reasoning: reasoning || 'Good fit based on customer profile and current usage'
      });
    }
  }

  // Calculate readiness score
  const readinessFactors = [];
  let readinessScore = 50;

  if (recentActivities.length > 10) {
    readinessScore += 20;
    readinessFactors.push({
      factor: 'High Engagement',
      impact: 'positive' as const,
      description: `${recentActivities.length} activities in last 90 days`
    });
  }

  if (currentProducts.length > 0) {
    readinessScore += 20;
    readinessFactors.push({
      factor: 'Existing Customer',
      impact: 'positive' as const,
      description: 'Established relationship and trust'
    });
  }

  const daysSinceLastPurchase = currentProducts.length > 0
    ? (Date.now() - new Date(currentProducts[0].close_date).getTime()) / (1000 * 60 * 60 * 24)
    : 999;

  if (daysSinceLastPurchase < 180) {
    readinessScore += 15;
    readinessFactors.push({
      factor: 'Recent Purchase',
      impact: 'positive' as const,
      description: 'Purchase momentum within last 6 months'
    });
  }

  let readinessStatus: 'ready' | 'nurture' | 'not-ready';
  if (readinessScore >= 75) readinessStatus = 'ready';
  else if (readinessScore >= 50) readinessStatus = 'nurture';
  else readinessStatus = 'not-ready';

  // Generate next steps
  const nextSteps = [];
  if (readinessStatus === 'ready') {
    nextSteps.push(
      { step: 'Schedule product demo with decision maker', timeline: '1 week', owner: 'Account Executive' },
      { step: 'Send ROI analysis and case study', timeline: '3 days', owner: 'Sales Engineer' },
      { step: 'Create and send proposal', timeline: '2 weeks', owner: 'Account Executive' }
    );
  } else if (readinessStatus === 'nurture') {
    nextSteps.push(
      { step: 'Conduct quarterly business review', timeline: '2 weeks', owner: 'Customer Success' },
      { step: 'Share relevant content and use cases', timeline: 'Ongoing', owner: 'Marketing' },
      { step: 'Identify pain points and expansion needs', timeline: '1 month', owner: 'Account Executive' }
    );
  }

  return {
    opportunities: opportunities.sort((a, b) => b.compatibilityScore - a.compatibilityScore),
    readiness: {
      score: readinessScore,
      status: readinessStatus,
      factors: readinessFactors
    },
    nextSteps
  };
}

// ============================================================================
// 3. PRODUCT BUNDLE SUGGESTIONS
// ============================================================================

export interface SuggestProductBundlesRequest {
  /** Account ID for context */
  accountId?: string;
  /** Opportunity ID for context */
  opportunityId?: string;
  /** Target bundle value */
  targetValue?: number;
}

export interface SuggestProductBundlesResponse {
  /** Suggested bundles */
  bundles: Array<{
    bundle_name: string;
    products: Array<{
      product_id: string;
      product_name: string;
      role: 'core' | 'complementary' | 'optional';
    }>;
    totalValue: number;
    discountedValue: number;
    savingsPercent: number;
    fitScore: number;
    reasoning: string;
  }>;
  /** Bundle benefits */
  benefits: Array<{
    benefit: string;
    value: string;
  }>;
}

/**
 * Suggest product bundles
 */
export async function suggestProductBundles(request: SuggestProductBundlesRequest): Promise<SuggestProductBundlesResponse> {
  const { accountId, targetValue = 100000 } = request;

  let account = null;
  if (accountId) {
    account = await db.doc.get('account', accountId, {
      fields: ['name', 'industry', 'number_of_employees']
    });
  }

  // Fetch available products
  const products = await db.find('product', {
    filters: [['is_active', '=', true]],
    fields: ['product_id', 'name', 'product_code', 'family', 'description'],
    limit: 100
  });

  // Fetch existing bundles for reference
  const existingBundles = await db.find('product_bundle', {
    filters: [['is_active', '=', true]],
    fields: ['name', 'bundle_id', 'discount_percent', 'description']
  });

  const bundles = [];

  // Bundle 1: Starter Package
  const starterProducts = products.filter((p: any) => 
    p.name.includes('Basic') || p.name.includes('Starter') || p.family === 'Core'
  ).slice(0, 3);

  if (starterProducts.length >= 2) {
    const totalValue = starterProducts.length * 15000;
    bundles.push({
      bundle_name: 'Starter Success Package',
      products: starterProducts.map((p: any, idx: any) => ({
        product_id: p.product_id,
        product_name: p.name,
        role: idx === 0 ? 'core' as const : 'complementary' as const
      })),
      totalValue,
      discountedValue: Math.round(totalValue * 0.85),
      savingsPercent: 15,
      fitScore: account?.number_of_employees < 100 ? 90 : 60,
      reasoning: 'Perfect for companies starting their digital transformation journey'
    });
  }

  // Bundle 2: Growth Package
  const growthProducts = products.filter((p: any) => 
    p.name.includes('Professional') || p.family === 'Analytics' || p.family === 'Integration'
  ).slice(0, 4);

  if (growthProducts.length >= 3) {
    const totalValue = growthProducts.length * 35000;
    bundles.push({
      bundle_name: 'Growth Accelerator Bundle',
      products: growthProducts.map((p: any, idx: any) => ({
        product_id: p.product_id,
        product_name: p.name,
        role: idx < 2 ? 'core' as const : 'complementary' as const
      })),
      totalValue,
      discountedValue: Math.round(totalValue * 0.80),
      savingsPercent: 20,
      fitScore: account && account.number_of_employees >= 100 && account.number_of_employees < 1000 ? 95 : 70,
      reasoning: 'Designed for scaling businesses with advanced analytics and integration needs'
    });
  }

  // Bundle 3: Enterprise Package
  const enterpriseProducts = products.filter((p: any) => 
    p.name.includes('Enterprise') || p.name.includes('Premium') || p.family === 'Security'
  ).slice(0, 5);

  if (enterpriseProducts.length >= 3) {
    const totalValue = enterpriseProducts.length * 50000;
    bundles.push({
      bundle_name: 'Enterprise Complete Solution',
      products: enterpriseProducts.map((p: any, idx: any) => ({
        product_id: p.product_id,
        product_name: p.name,
        role: idx < 2 ? 'core' as const : idx < 4 ? 'complementary' as const : 'optional' as const
      })),
      totalValue,
      discountedValue: Math.round(totalValue * 0.75),
      savingsPercent: 25,
      fitScore: account?.number_of_employees >= 1000 ? 95 : 50,
      reasoning: 'Comprehensive solution for large enterprises with complex requirements'
    });
  }

  // Industry-specific bundle
  if (account?.industry === 'Healthcare') {
    const healthcareProducts = products.filter((p: any) => 
      p.family === 'Compliance' || p.family === 'Security' || p.name.includes('HIPAA')
    ).slice(0, 3);

    if (healthcareProducts.length >= 2) {
      const totalValue = healthcareProducts.length * 40000;
      bundles.push({
        bundle_name: 'Healthcare Compliance Bundle',
        products: healthcareProducts.map((p: any, idx: any) => ({
          product_id: p.product_id,
          product_name: p.name,
          role: idx === 0 ? 'core' as const : 'complementary' as const
        })),
        totalValue,
        discountedValue: Math.round(totalValue * 0.82),
        savingsPercent: 18,
        fitScore: 98,
        reasoning: 'Essential compliance and security tools for healthcare organizations'
      });
    }
  }

  return {
    bundles: bundles.sort((a, b) => b.fitScore - a.fitScore),
    benefits: [
      { benefit: 'Cost Savings', value: 'Save 15-25% compared to individual purchases' },
      { benefit: 'Faster Implementation', value: 'Pre-integrated products reduce setup time by 40%' },
      { benefit: 'Better Support', value: 'Dedicated bundle support team and priority SLA' },
      { benefit: 'Future Upgrades', value: 'Preferential pricing on future add-ons and upgrades' }
    ]
  };
}

// ============================================================================
// 4. PRODUCT FIT ANALYSIS
// ============================================================================

export interface AnalyzeProductFitRequest {
  /** Account ID to analyze */
  accountId: string;
  /** Product ID to analyze fit for */
  productId: string;
}

export interface AnalyzeProductFitResponse {
  /** Overall fit score (0-100) */
  fitScore: number;
  /** Fit level */
  fitLevel: 'excellent' | 'good' | 'moderate' | 'poor';
  /** Detailed fit analysis */
  analysis: {
    technicalFit: {
      score: number;
      factors: string[];
    };
    businessFit: {
      score: number;
      factors: string[];
    };
    financialFit: {
      score: number;
      factors: string[];
    };
    strategicFit: {
      score: number;
      factors: string[];
    };
  };
  /** Risks and concerns */
  risks: Array<{
    risk: string;
    severity: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;
  /** Success factors */
  successFactors: Array<{
    factor: string;
    importance: 'critical' | 'high' | 'medium';
    status: 'met' | 'partial' | 'not-met';
  }>;
  /** Recommendation */
  recommendation: {
    proceed: boolean;
    confidence: number;
    reasoning: string;
    nextSteps: string[];
  };
}

/**
 * Analyze product-customer fit
 */
export async function analyzeProductFit(request: AnalyzeProductFitRequest): Promise<AnalyzeProductFitResponse> {
  const { accountId, productId } = request;

  // Fetch account and product
  const account = await db.doc.get('account', accountId, {
    fields: ['name', 'industry', 'number_of_employees', 'annual_revenue', 'type']
  });

  const product = await db.doc.get('product', productId, {
    fields: ['name', 'product_code', 'family', 'description', 'is_active']
  });

  // Fetch account's tech stack and existing products
  const existingProducts = await db.find('opportunity', {
    filters: [
      ['account_id', '=', accountId],
      ['stage', '=', 'Closed Won']
    ],
    fields: ['name', 'close_date']
  });

  // Technical Fit Analysis
  let technicalScore = 60;
  const technicalFactors = [];

  const hasComplementaryProducts = existingProducts.some((p: any) => 
    p.name.toLowerCase().includes(product.family?.toLowerCase() || '')
  );

  if (hasComplementaryProducts) {
    technicalScore += 20;
    technicalFactors.push('Existing complementary products enable seamless integration');
  } else {
    technicalFactors.push('May require additional integration setup');
  }

  if (product.family === 'Cloud' && account.industry === 'Technology') {
    technicalScore += 15;
    technicalFactors.push('Cloud-native architecture aligns with technology sector needs');
  }

  // Business Fit Analysis
  let businessScore = 50;
  const businessFactors = [];

  if (account.industry === 'Healthcare' && product.family === 'Compliance') {
    businessScore += 30;
    businessFactors.push('Addresses critical healthcare compliance requirements');
  } else if (account.industry === 'Financial Services' && product.family === 'Security') {
    businessScore += 30;
    businessFactors.push('Essential for financial services security and compliance');
  } else {
    businessFactors.push('General business value applicable to industry');
  }

  const employeeCount = account.number_of_employees || 0;
  if (employeeCount > 1000 && product.name.includes('Enterprise')) {
    businessScore += 20;
    businessFactors.push('Enterprise-grade solution matches organization scale');
  } else if (employeeCount < 100 && product.name.includes('Starter')) {
    businessScore += 20;
    businessFactors.push('Right-sized for small business operations');
  }

  // Financial Fit Analysis
  let financialScore = 60;
  const financialFactors = [];

  const annualRevenue = account.annual_revenue || 0;
  const estimatedProductCost = employeeCount * 100; // Rough estimate

  if (annualRevenue > estimatedProductCost * 200) {
    financialScore += 25;
    financialFactors.push('Strong financial capacity for investment');
  } else if (annualRevenue > estimatedProductCost * 100) {
    financialScore += 15;
    financialFactors.push('Adequate budget available');
  } else {
    financialScore -= 10;
    financialFactors.push('May require budget approval or financing options');
  }

  // ROI potential
  financialScore += 10;
  financialFactors.push('Expected ROI within 12-18 months based on similar customers');

  // Strategic Fit Analysis
  let strategicScore = 65;
  const strategicFactors = [];

  if (existingProducts.length > 0) {
    strategicScore += 20;
    strategicFactors.push('Strengthens existing relationship and platform adoption');
  }

  if (account.type === 'Customer') {
    strategicScore += 10;
    strategicFactors.push('Expansion opportunity with proven customer');
  }

  strategicFactors.push('Aligns with digital transformation initiatives');

  // Calculate overall fit score
  const fitScore = Math.round(
    (technicalScore * 0.25) + 
    (businessScore * 0.30) + 
    (financialScore * 0.25) + 
    (strategicScore * 0.20)
  );

  let fitLevel: 'excellent' | 'good' | 'moderate' | 'poor';
  if (fitScore >= 80) fitLevel = 'excellent';
  else if (fitScore >= 65) fitLevel = 'good';
  else if (fitScore >= 50) fitLevel = 'moderate';
  else fitLevel = 'poor';

  // Identify risks
  const risks = [];
  
  if (financialScore < 60) {
    risks.push({
      risk: 'Budget constraints may delay decision',
      severity: 'medium' as const,
      mitigation: 'Offer flexible payment terms or phased implementation'
    });
  }

  if (!hasComplementaryProducts) {
    risks.push({
      risk: 'Integration complexity without existing platform',
      severity: 'low' as const,
      mitigation: 'Provide dedicated implementation support and training'
    });
  }

  if (existingProducts.length === 0) {
    risks.push({
      risk: 'No existing relationship or trust established',
      severity: 'medium' as const,
      mitigation: 'Offer pilot program or proof of concept'
    });
  }

  // Define success factors
  const successFactors = [
    {
      factor: 'Executive Sponsorship',
      importance: 'critical' as const,
      status: account.type === 'Customer' ? 'met' as const : 'partial' as const
    },
    {
      factor: 'Budget Availability',
      importance: 'critical' as const,
      status: financialScore >= 70 ? 'met' as const : financialScore >= 50 ? 'partial' as const : 'not-met' as const
    },
    {
      factor: 'Technical Readiness',
      importance: 'high' as const,
      status: technicalScore >= 70 ? 'met' as const : 'partial' as const
    },
    {
      factor: 'Clear Business Case',
      importance: 'high' as const,
      status: businessScore >= 70 ? 'met' as const : 'partial' as const
    }
  ];

  // Generate recommendation
  const proceed = fitScore >= 60;
  const confidence = Math.min(95, fitScore);
  
  let reasoning = '';
  const nextSteps = [];

  if (fitLevel === 'excellent') {
    reasoning = 'Outstanding fit across all dimensions. Strong recommendation to proceed immediately.';
    nextSteps.push(
      'Schedule executive demo within 1 week',
      'Prepare customized ROI analysis',
      'Fast-track contract negotiation'
    );
  } else if (fitLevel === 'good') {
    reasoning = 'Good fit with minor concerns. Recommend proceeding with standard sales process.';
    nextSteps.push(
      'Conduct detailed discovery session',
      'Address any technical integration questions',
      'Develop implementation plan'
    );
  } else if (fitLevel === 'moderate') {
    reasoning = 'Moderate fit. Recommend further qualification and risk mitigation before proceeding.';
    nextSteps.push(
      'Conduct thorough needs analysis',
      'Validate budget and timeline',
      'Consider pilot program to prove value'
    );
  } else {
    reasoning = 'Poor fit with significant concerns. Not recommended at this time.';
    nextSteps.push(
      'Explore alternative solutions',
      'Focus on nurturing relationship for future opportunities',
      'Consider different product from portfolio'
    );
  }

  return {
    fitScore,
    fitLevel,
    analysis: {
      technicalFit: {
        score: technicalScore,
        factors: technicalFactors
      },
      businessFit: {
        score: businessScore,
        factors: businessFactors
      },
      financialFit: {
        score: financialScore,
        factors: financialFactors
      },
      strategicFit: {
        score: strategicScore,
        factors: strategicFactors
      }
    },
    risks,
    successFactors,
    recommendation: {
      proceed,
      confidence,
      reasoning,
      nextSteps
    }
  };
}

// ============================================================================
// 5. PRODUCT ADOPTION PREDICTION
// ============================================================================

export interface PredictProductAdoptionRequest {
  /** Account ID */
  accountId: string;
  /** Product ID */
  productId: string;
  /** Consider similar customers */
  includeBenchmarks?: boolean;
}

export interface PredictProductAdoptionResponse {
  /** Adoption likelihood (0-100) */
  adoptionLikelihood: number;
  /** Adoption category */
  category: 'early-adopter' | 'likely' | 'moderate' | 'unlikely';
  /** Timeline prediction */
  timeline: {
    expectedDecisionDate: string;
    confidence: number;
    factors: string[];
  };
  /** Usage prediction */
  usagePrediction: {
    expectedUsers: number;
    activationRate: number;
    timeToValue: number;
  };
  /** Key drivers */
  drivers: Array<{
    driver: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
  }>;
  /** Similar customer patterns */
  benchmarks?: {
    similarCustomers: number;
    avgAdoptionRate: number;
    avgTimeToDecision: number;
  };
}

/**
 * Predict product adoption likelihood
 */
export async function predictProductAdoption(request: PredictProductAdoptionRequest): Promise<PredictProductAdoptionResponse> {
  const { accountId, productId, includeBenchmarks = true } = request;

  // Fetch account and product
  const account = await db.doc.get('account', accountId, {
    fields: ['name', 'industry', 'number_of_employees', 'annual_revenue', 'created_date']
  });

  const product = await db.doc.get('product', productId, {
    fields: ['name', 'family', 'description']
  });

  // Fetch account engagement history
  const activities = await db.find('activity', {
    filters: [
      ['account_id', '=', accountId],
      ['activity_date', '>=', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()]
    ],
    fields: ['subject', 'activity_date', 'activity_type'],
    limit: 200
  });

  // Fetch purchase history
  const purchaseHistory = await db.find('opportunity', {
    filters: [
      ['account_id', '=', accountId],
      ['stage', '=', 'Closed Won']
    ],
    fields: ['amount', 'close_date', 'created_date']
  });

  // Calculate adoption likelihood
  let adoptionScore = 50;
  const drivers = [];

  // Driver 1: Engagement level
  const engagementScore = Math.min(40, activities.length * 2);
  adoptionScore += engagementScore;
  let impactValue: 'positive' | 'negative' | 'neutral';
  if (activities.length > 10) {
    impactValue = 'positive';
  } else if (activities.length > 5) {
    impactValue = 'neutral';
  } else {
    impactValue = 'negative';
  }
  drivers.push({
    driver: 'Recent Engagement',
    impact: impactValue,
    weight: engagementScore
  });

  // Driver 2: Purchase history
  if (purchaseHistory.length > 0) {
    adoptionScore += 20;
    drivers.push({
      driver: 'Existing Customer',
      impact: 'positive' as const,
      weight: 20
    });

    // Recent purchase increases likelihood
    const daysSinceLastPurchase = (Date.now() - new Date(purchaseHistory[0].close_date).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastPurchase < 180) {
      adoptionScore += 15;
      drivers.push({
        driver: 'Recent Purchase Momentum',
        impact: 'positive' as const,
        weight: 15
      });
    }
  } else {
    drivers.push({
      driver: 'No Purchase History',
      impact: 'negative' as const,
      weight: -10
    });
    adoptionScore -= 10;
  }

  // Driver 3: Company characteristics
  const employeeCount = account.number_of_employees || 0;
  if (employeeCount > 500 && product.name.includes('Enterprise')) {
    adoptionScore += 10;
    drivers.push({
      driver: 'Enterprise Scale Match',
      impact: 'positive' as const,
      weight: 10
    });
  }

  // Driver 4: Industry alignment
  if (
    (account.industry === 'Technology' && product.family === 'Software') ||
    (account.industry === 'Healthcare' && product.family === 'Compliance') ||
    (account.industry === 'Financial Services' && product.family === 'Security')
  ) {
    adoptionScore += 15;
    drivers.push({
      driver: 'Industry-Product Alignment',
      impact: 'positive' as const,
      weight: 15
    });
  }

  // Cap adoption score at 100
  adoptionScore = Math.min(100, adoptionScore);

  // Determine category
  let category: 'early-adopter' | 'likely' | 'moderate' | 'unlikely';
  if (adoptionScore >= 80) category = 'early-adopter';
  else if (adoptionScore >= 60) category = 'likely';
  else if (adoptionScore >= 40) category = 'moderate';
  else category = 'unlikely';

  // Predict timeline
  let daysToDecision = 90; // Default
  if (category === 'early-adopter') daysToDecision = 30;
  else if (category === 'likely') daysToDecision = 60;
  else if (category === 'moderate') daysToDecision = 90;
  else daysToDecision = 120;

  const expectedDecisionDate = new Date(Date.now() + daysToDecision * 24 * 60 * 60 * 1000)
    .toISOString()
    .substring(0, 10);

  const timelineFactors = [];
  if (purchaseHistory.length > 0) {
    const avgSalesCycle = purchaseHistory.reduce((sum: number, p: any) => {
      const days = (new Date(p.close_date).getTime() - new Date(p.created_date).getTime()) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0) / purchaseHistory.length;
    timelineFactors.push(`Historical sales cycle: ${Math.round(avgSalesCycle)} days`);
  }
  timelineFactors.push(`Engagement level suggests ${category} adoption pattern`);
  
  if (activities.length > 15) {
    timelineFactors.push('High activity indicates active evaluation');
  }

  // Usage prediction
  const expectedUsers = Math.max(10, Math.round(employeeCount * 0.15)); // 15% of employees
  const activationRate = adoptionScore; // Use adoption score as proxy
  const timeToValue = category === 'early-adopter' ? 30 : category === 'likely' ? 60 : 90;

  // Benchmarks
  let benchmarks;
  if (includeBenchmarks) {
    // Simulate benchmark data
    benchmarks = {
      similarCustomers: Math.floor(Math.random() * 50) + 20,
      avgAdoptionRate: category === 'early-adopter' ? 85 : category === 'likely' ? 70 : 55,
      avgTimeToDecision: daysToDecision
    };
  }

  return {
    adoptionLikelihood: adoptionScore,
    category,
    timeline: {
      expectedDecisionDate,
      confidence: Math.min(90, adoptionScore * 0.8),
      factors: timelineFactors
    },
    usagePrediction: {
      expectedUsers,
      activationRate,
      timeToValue
    },
    drivers,
    benchmarks
  };
}

export default {
  recommendProducts,
  findCrossSellOpportunities,
  suggestProductBundles,
  analyzeProductFit,
  predictProductAdoption
};
