/**
 * Bundle Suggestion AI Enhancement Actions
 * 
 * This ObjectStack Action provides AI-powered product bundle optimization capabilities.
 * 
 * Functionality:
 * 1. Bundle Suggestions - Suggest product bundles for customer
 * 2. Bundle Composition Optimization - Optimize bundle contents
 * 3. Bundle Pricing Optimization - Calculate optimal bundle pricing
 * 4. Bundle Performance Analysis - Analyze existing bundle performance
 * 5. Bundle Improvement Recommendations - Suggest bundle improvements
 */

import { db } from '../db';

// ============================================================================
// 1. BUNDLE SUGGESTIONS
// ============================================================================

export interface SuggestBundlesRequest {
  /** Account ID for customer context */
  accountId: string;
  /** Opportunity ID (optional) */
  opportunityId?: string;
  /** Budget constraint */
  maxBudget?: number;
  /** Number of bundle suggestions */
  maxSuggestions?: number;
}

export interface SuggestBundlesResponse {
  /** Suggested bundles */
  bundles: Array<{
    bundle_name: string;
    bundle_type: 'starter' | 'growth' | 'enterprise' | 'custom';
    products: Array<{
      product_id: string;
      product_name: string;
      product_family: string;
      quantity: number;
      unit_price: number;
      role: 'core' | 'complementary' | 'optional';
    }>;
    pricing: {
      totalListPrice: number;
      bundlePrice: number;
      discountPercent: number;
      savings: number;
    };
    fitScore: number;
    reasoning: string;
    benefits: string[];
  }>;
  /** Customer context */
  context: {
    industry: string;
    companySize: string;
    existingProducts: string[];
    budget: number;
  };
}

/**
 * Suggest product bundles for customer
 */
export async function suggestBundles(request: SuggestBundlesRequest): Promise<SuggestBundlesResponse> {
  const { accountId, maxBudget = 200000, maxSuggestions = 3 } = request;

  // Fetch account
  const account = await db.doc.get('account', accountId, {
    fields: ['name', 'industry', 'number_of_employees', 'annual_revenue', 'type']
  });

  // Fetch existing products
  const existingProducts = await db.find('opportunity', {
    filters: [
      ['account_id', '=', accountId],
      ['stage', '=', 'Closed Won']
    ],
    fields: ['name', 'amount']
  });

  // Fetch available products
  const allProducts = await db.find('product', {
    filters: [['is_active', '=', true]],
    fields: ['product_id', 'name', 'product_code', 'family', 'description'],
    limit: 100
  });

  // Get price book entries
  const prices = await db.find('price_book_entry', {
    filters: [['is_active', '=', true]],
    fields: ['product_id', 'list_price'],
    limit: 100
  });

  const priceMap = new Map(prices.map(p => [p.product_id, p.list_price || 10000]));

  // Determine company size category
  const employeeCount = account.number_of_employees || 0;
  let companySize: 'small' | 'medium' | 'large';
  if (employeeCount > 1000) companySize = 'large';
  else if (employeeCount > 100) companySize = 'medium';
  else companySize = 'small';

  const bundles = [];
  const existingProductNames = existingProducts.map(p => p.name.toLowerCase());

  // Helper to create bundle
  const createBundle = (
    name: string,
    type: 'starter' | 'growth' | 'enterprise' | 'custom',
    productsList: any[],
    discountPercent: number,
    reasoning: string,
    benefits: string[]
  ) => {
    const products = productsList.map(p => ({
      product_id: p.product_id,
      product_name: p.name,
      product_family: p.family || 'General',
      quantity: 1,
      unit_price: priceMap.get(p.product_id) || 10000,
      role: p.role as 'core' | 'complementary' | 'optional'
    }));

    const totalListPrice = products.reduce((sum: any, p: any) => sum + (p.unit_price * p.quantity), 0);
    const bundlePrice = Math.round(totalListPrice * (1 - discountPercent / 100));
    const savings = totalListPrice - bundlePrice;

    // Calculate fit score
    let fitScore = 60;
    
    // Size fit
    if (
      (type === 'starter' && companySize === 'small') ||
      (type === 'growth' && companySize === 'medium') ||
      (type === 'enterprise' && companySize === 'large')
    ) {
      fitScore += 20;
    }

    // Budget fit
    if (bundlePrice <= maxBudget) {
      fitScore += 15;
    } else if (bundlePrice <= maxBudget * 1.2) {
      fitScore += 5;
    } else {
      fitScore -= 20;
    }

    // Industry fit
    if (account.industry === 'Technology' && products.some(p => p.product_family === 'Software')) {
      fitScore += 10;
    } else if (account.industry === 'Healthcare' && products.some(p => p.product_family === 'Compliance')) {
      fitScore += 10;
    }

    // Avoid duplicates
    const hasDuplicates = products.some(p => 
      existingProductNames.some(existing => existing.includes(p.product_name.toLowerCase()))
    );
    if (hasDuplicates) fitScore -= 30;

    return {
      bundle_name: name,
      bundle_type: type,
      products,
      pricing: {
        totalListPrice,
        bundlePrice,
        discountPercent,
        savings
      },
      fitScore: Math.max(0, Math.min(100, fitScore)),
      reasoning,
      benefits
    };
  };

  // Bundle 1: Starter Bundle (for small businesses)
  const starterProducts = allProducts
    .filter(p => p.name.includes('Basic') || p.name.includes('Starter') || p.name.includes('Essential'))
    .slice(0, 3)
    .map((p, idx) => ({ ...p, role: idx === 0 ? 'core' : 'complementary' }));

  if (starterProducts.length >= 2) {
    bundles.push(createBundle(
      'Starter Success Bundle',
      'starter',
      starterProducts,
      15,
      'Perfect entry-level package for businesses starting their digital transformation',
      [
        'All essential features to get started quickly',
        'Easy implementation with minimal setup',
        'Affordable pricing for small teams',
        'Scalable as your business grows'
      ]
    ));
  }

  // Bundle 2: Growth Bundle (for mid-market)
  const growthProducts = allProducts
    .filter(p => 
      p.name.includes('Professional') || 
      p.name.includes('Plus') || 
      p.family === 'Analytics' ||
      p.family === 'Integration'
    )
    .slice(0, 4)
    .map((p, idx) => ({ ...p, role: idx < 2 ? 'core' : 'complementary' }));

  if (growthProducts.length >= 3) {
    bundles.push(createBundle(
      'Growth Accelerator Bundle',
      'growth',
      growthProducts,
      20,
      'Comprehensive solution for growing businesses with advanced needs',
      [
        'Advanced analytics and reporting',
        'Seamless integrations with existing tools',
        'Enhanced automation capabilities',
        'Priority support and onboarding'
      ]
    ));
  }

  // Bundle 3: Enterprise Bundle (for large organizations)
  const enterpriseProducts = allProducts
    .filter(p => 
      p.name.includes('Enterprise') || 
      p.name.includes('Premium') ||
      p.family === 'Security' ||
      p.family === 'Compliance'
    )
    .slice(0, 5)
    .map((p, idx) => ({ 
      ...p, 
      role: idx < 2 ? 'core' : idx < 4 ? 'complementary' : 'optional' 
    }));

  if (enterpriseProducts.length >= 4) {
    bundles.push(createBundle(
      'Enterprise Complete Solution',
      'enterprise',
      enterpriseProducts,
      25,
      'Full-featured enterprise platform with advanced security and compliance',
      [
        'Enterprise-grade security and compliance',
        'Unlimited scalability and performance',
        'Dedicated success manager and support',
        'Custom integrations and workflows',
        'Advanced admin and governance controls'
      ]
    ));
  }

  // Bundle 4: Industry-specific bundle
  if (account.industry === 'Healthcare') {
    const healthcareProducts = allProducts
      .filter(p => 
        p.family === 'Compliance' || 
        p.family === 'Security' ||
        p.name.includes('HIPAA') ||
        p.name.includes('Health')
      )
      .slice(0, 4)
      .map((p, idx) => ({ ...p, role: idx < 2 ? 'core' : 'complementary' }));

    if (healthcareProducts.length >= 2) {
      bundles.push(createBundle(
        'Healthcare Compliance Bundle',
        'custom',
        healthcareProducts,
        18,
        'Specialized bundle for healthcare organizations with compliance requirements',
        [
          'HIPAA-compliant platform and workflows',
          'Healthcare-specific security features',
          'Audit trails and compliance reporting',
          'Industry best practices built-in'
        ]
      ));
    }
  } else if (account.industry === 'Financial Services') {
    const financeProducts = allProducts
      .filter(p => 
        p.family === 'Security' || 
        p.family === 'Compliance' ||
        p.name.includes('Finance') ||
        p.name.includes('Audit')
      )
      .slice(0, 4)
      .map((p, idx) => ({ ...p, role: idx < 2 ? 'core' : 'complementary' }));

    if (financeProducts.length >= 2) {
      bundles.push(createBundle(
        'Financial Services Bundle',
        'custom',
        financeProducts,
        18,
        'Tailored for financial services with enhanced security and regulatory compliance',
        [
          'Bank-grade security and encryption',
          'Regulatory compliance (SOX, PCI)',
          'Advanced fraud detection',
          'Comprehensive audit capabilities'
        ]
      ));
    }
  }

  // Sort by fit score and take top N
  const topBundles = bundles
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, maxSuggestions);

  return {
    bundles: topBundles,
    context: {
      industry: account.industry || 'General',
      companySize: companySize === 'large' ? 'Enterprise' : companySize === 'medium' ? 'Mid-Market' : 'Small Business',
      existingProducts: existingProductNames,
      budget: maxBudget
    }
  };
}

// ============================================================================
// 2. BUNDLE COMPOSITION OPTIMIZATION
// ============================================================================

export interface OptimizeBundleCompositionRequest {
  /** Existing bundle ID or product list */
  bundleId?: string;
  /** Manual product list for optimization */
  productIds?: string[];
  /** Optimization goal */
  goal?: 'maximize-value' | 'minimize-cost' | 'maximize-adoption';
}

export interface OptimizeBundleCompositionResponse {
  /** Current composition */
  currentComposition: {
    products: Array<{
      product_id: string;
      product_name: string;
      relevanceScore: number;
    }>;
    totalValue: number;
    cohesionScore: number;
  };
  /** Optimized composition */
  optimizedComposition: {
    productsToAdd: Array<{
      product_id: string;
      product_name: string;
      reason: string;
      expectedImpact: string;
    }>;
    productsToRemove: Array<{
      product_id: string;
      product_name: string;
      reason: string;
    }>;
    estimatedImprovement: number;
  };
  /** Composition analysis */
  analysis: {
    coreProducts: number;
    complementaryProducts: number;
    optionalProducts: number;
    gaps: string[];
    redundancies: string[];
  };
}

/**
 * Optimize bundle contents
 */
export async function optimizeBundleComposition(request: OptimizeBundleCompositionRequest): Promise<OptimizeBundleCompositionResponse> {
  const { bundleId, productIds = [], goal = 'maximize-value' } = request;

  let currentProducts = [];

  // Fetch bundle if ID provided
  if (bundleId) {
    const bundle = await db.doc.get('product_bundle', bundleId, {
      fields: ['name', 'bundle_id', 'discount_percent']
    });

    const components = await db.find('product_bundle_component', {
      filters: [['bundle_id', '=', bundleId]],
      fields: ['product_id', 'quantity', 'is_required']
    });

    currentProducts = await Promise.all(
      components.map(async c => {
        const product = await db.doc.get('product', c.product_id, {
          fields: ['product_id', 'name', 'family']
        });
        return { ...product, is_required: c.is_required };
      })
    );
  } else if (productIds.length > 0) {
    // Fetch products by IDs
    currentProducts = await Promise.all(
      productIds.map(id => 
        db.doc.get('product', id, {
          fields: ['product_id', 'name', 'family']
        })
      )
    );
  }

  // Fetch all available products for comparison
  const allProducts = await db.find('product', {
    filters: [['is_active', '=', true]],
    fields: ['product_id', 'name', 'family', 'description'],
    limit: 100
  });

  // Calculate relevance scores for current products
  const currentComposition = currentProducts.map(p => {
    let relevanceScore = 70;

    // Core products get higher scores
    if (p.is_required) relevanceScore += 15;

    // Products with complementary families
    const hasComplement = currentProducts.some(other => 
      other.product_id !== p.product_id && 
      other.family === p.family
    );
    if (hasComplement) relevanceScore += 10;

    return {
      product_id: p.product_id,
      product_name: p.name,
      relevanceScore: Math.min(100, relevanceScore)
    };
  });

  const totalValue = currentProducts.length * 10000; // Simplified
  const cohesionScore = Math.round(
    currentComposition.reduce((sum, p) => sum + p.relevanceScore, 0) / currentComposition.length
  );

  // Identify optimization opportunities
  const productsToAdd = [];
  const productsToRemove = [];

  // Find gaps - missing product families
  const currentFamilies = new Set(currentProducts.map(p => p.family));
  const essentialFamilies = ['Core', 'Security', 'Analytics'];
  
  const gaps = essentialFamilies.filter(f => !currentFamilies.has(f));
  
  // Suggest additions for gaps
  for (const family of gaps) {
    const candidate = allProducts.find(p => 
      p.family === family && 
      !currentProducts.some(cp => cp.product_id === p.product_id)
    );
    
    if (candidate) {
      productsToAdd.push({
        product_id: candidate.product_id,
        product_name: candidate.name,
        reason: `Fills gap in ${family} category`,
        expectedImpact: 'Increases bundle completeness and value proposition'
      });
    }
  }

  // Find redundancies - too many from same family
  const familyCounts = new Map<string, number>();
  currentProducts.forEach(p => {
    familyCounts.set(p.family, (familyCounts.get(p.family) || 0) + 1);
  });

  const redundancies = [];
  familyCounts.forEach((count, family) => {
    if (count > 2) {
      redundancies.push(`Multiple ${family} products may be redundant`);
      
      // Suggest removing lowest value product from over-represented family
      const familyProducts = currentProducts.filter(p => p.family === family);
      const lowestValue = familyProducts.sort((a, b) => {
        const aScore = currentComposition.find(c => c.product_id === a.product_id)?.relevanceScore || 0;
        const bScore = currentComposition.find(c => c.product_id === b.product_id)?.relevanceScore || 0;
        return aScore - bScore;
      })[0];

      if (lowestValue && !lowestValue.is_required) {
        productsToRemove.push({
          product_id: lowestValue.product_id,
          product_name: lowestValue.name,
          reason: `Redundant ${family} product with lower value`
        });
      }
    }
  });

  // Goal-specific optimizations
  if (goal === 'maximize-adoption') {
    // Add popular, easy-to-use products
    const popularProducts = allProducts
      .filter(p => 
        (p.name.includes('Essential') || p.name.includes('Basic')) &&
        !currentProducts.some(cp => cp.product_id === p.product_id)
      )
      .slice(0, 2);

    popularProducts.forEach(p => {
      productsToAdd.push({
        product_id: p.product_id,
        product_name: p.name,
        reason: 'Improves ease of adoption with user-friendly features',
        expectedImpact: 'Reduces implementation time and increases user engagement'
      });
    });
  } else if (goal === 'minimize-cost') {
    // Remove optional expensive products
    const expensiveOptional = currentProducts.filter(p => 
      !p.is_required && 
      (p.name.includes('Premium') || p.name.includes('Enterprise'))
    );

    expensiveOptional.forEach(p => {
      if (!productsToRemove.some(r => r.product_id === p.product_id)) {
        productsToRemove.push({
          product_id: p.product_id,
          product_name: p.name,
          reason: 'Optional premium product increases cost'
        });
      }
    });
  }

  // Calculate estimated improvement
  const additionScore = productsToAdd.length * 5;
  const removalScore = productsToRemove.length * 3;
  const estimatedImprovement = Math.min(30, additionScore + removalScore);

  // Analyze composition
  const coreProducts = currentProducts.filter(p => p.is_required).length;
  const complementaryProducts = currentProducts.filter(p => !p.is_required && currentFamilies.size > 1).length;
  const optionalProducts = currentProducts.length - coreProducts - complementaryProducts;

  return {
    currentComposition: {
      products: currentComposition,
      totalValue,
      cohesionScore
    },
    optimizedComposition: {
      productsToAdd: productsToAdd.slice(0, 3),
      productsToRemove: productsToRemove.slice(0, 2),
      estimatedImprovement
    },
    analysis: {
      coreProducts,
      complementaryProducts,
      optionalProducts,
      gaps,
      redundancies
    }
  };
}

// ============================================================================
// 3. BUNDLE PRICING OPTIMIZATION
// ============================================================================

export interface PriceBundleOptimallyRequest {
  /** Bundle ID or product list */
  bundleId?: string;
  /** Product IDs if not using bundle */
  productIds?: string[];
  /** Target customer segment */
  segment?: 'enterprise' | 'mid-market' | 'smb';
}

export interface PriceBundleOptimallyResponse {
  /** Component pricing */
  componentPricing: {
    totalListPrice: number;
    averageUnitPrice: number;
    priceRange: { min: number; max: number };
  };
  /** Optimal bundle pricing */
  optimalPricing: {
    recommendedPrice: number;
    discountPercent: number;
    savings: number;
    pricePerProduct: number;
  };
  /** Pricing tiers */
  tiers: Array<{
    tier: string;
    price: number;
    discountPercent: number;
    targetSegment: string;
    expectedAdoption: number;
  }>;
  /** Competitive analysis */
  competitivePosition: {
    marketAverage: number;
    yourPosition: 'premium' | 'competitive' | 'value';
    recommendation: string;
  };
}

/**
 * Calculate optimal bundle pricing
 */
export async function priceBundleOptimally(request: PriceBundleOptimallyRequest): Promise<PriceBundleOptimallyResponse> {
  const { bundleId, productIds = [], segment = 'mid-market' } = request;

  let products = [];

  // Fetch bundle products
  if (bundleId) {
    const components = await db.find('product_bundle_component', {
      filters: [['bundle_id', '=', bundleId]],
      fields: ['product_id', 'quantity']
    });

    products = await Promise.all(
      components.map(c => 
        db.doc.get('product', c.product_id, {
          fields: ['product_id', 'name', 'family']
        })
      )
    );
  } else if (productIds.length > 0) {
    products = await Promise.all(
      productIds.map(id => 
        db.doc.get('product', id, {
          fields: ['product_id', 'name', 'family']
        })
      )
    );
  }

  // Get prices
  const prices = await db.find('price_book_entry', {
    filters: [['is_active', '=', true]],
    fields: ['product_id', 'list_price'],
    limit: 100
  });

  const priceMap = new Map(prices.map(p => [p.product_id, p.list_price || 10000]));

  // Calculate component pricing
  const productPrices = products.map((p: any) => priceMap.get(p.product_id) || 10000);
  const totalListPrice = productPrices.reduce((sum: any, p: any) => sum + p, 0);
  const averageUnitPrice = (totalListPrice as number) / products.length;
  const priceRange = {
    min: Math.min(...productPrices as number[]),
    max: Math.max(...productPrices as number[])
  };

  // Calculate optimal bundle discount based on segment and bundle size
  let baseDiscount = 15; // Base bundle discount

  // Segment adjustment
  if (segment === 'enterprise') baseDiscount += 5; // More discount for enterprise
  else if (segment === 'smb') baseDiscount -= 5; // Less discount for small business

  // Bundle size adjustment (more products = more discount)
  const sizeBonus = Math.min(10, products.length * 2);
  const discountPercent = Math.round(baseDiscount + sizeBonus);

  const recommendedPrice = Math.round((totalListPrice as number) * (1 - discountPercent / 100));
  const savings = (totalListPrice as number) - recommendedPrice;
  const pricePerProduct = Math.round(recommendedPrice / products.length);

  // Create pricing tiers
  const tiers = [
    {
      tier: 'Standard',
      price: Math.round((totalListPrice as number) * 0.85),
      discountPercent: 15,
      targetSegment: 'Small Business',
      expectedAdoption: 65
    },
    {
      tier: 'Professional',
      price: Math.round((totalListPrice as number) * 0.80),
      discountPercent: 20,
      targetSegment: 'Mid-Market',
      expectedAdoption: 75
    },
    {
      tier: 'Enterprise',
      price: Math.round((totalListPrice as number) * 0.75),
      discountPercent: 25,
      targetSegment: 'Enterprise',
      expectedAdoption: 85
    },
    {
      tier: 'Strategic',
      price: Math.round((totalListPrice as number) * 0.70),
      discountPercent: 30,
      targetSegment: 'Strategic Accounts',
      expectedAdoption: 90
    }
  ];

  // Competitive positioning
  const marketAverage = (totalListPrice as number) * 0.82; // Market typically offers 18% discount
  
  let yourPosition: 'premium' | 'competitive' | 'value';
  let recommendation = '';

  if (recommendedPrice > marketAverage * 1.1) {
    yourPosition = 'premium';
    recommendation = 'Premium positioning. Ensure differentiation and value justify higher price.';
  } else if (recommendedPrice < marketAverage * 0.9) {
    yourPosition = 'value';
    recommendation = 'Value positioning. Consider raising price to improve margins while staying competitive.';
  } else {
    yourPosition = 'competitive';
    recommendation = 'Competitive pricing aligned with market. Good balance of value and profitability.';
  }

  return {
    componentPricing: {
      totalListPrice: totalListPrice as number,
      averageUnitPrice: Math.round(averageUnitPrice),
      priceRange
    },
    optimalPricing: {
      recommendedPrice,
      discountPercent,
      savings,
      pricePerProduct
    },
    tiers,
    competitivePosition: {
      marketAverage: Math.round(marketAverage),
      yourPosition,
      recommendation
    }
  };
}

// ============================================================================
// 4. BUNDLE PERFORMANCE ANALYSIS
// ============================================================================

export interface AnalyzeBundlePerformanceRequest {
  /** Bundle ID to analyze */
  bundleId: string;
  /** Time period in days */
  periodDays?: number;
}

export interface AnalyzeBundlePerformanceResponse {
  /** Performance metrics */
  metrics: {
    totalSales: number;
    revenue: number;
    averageDealSize: number;
    winRate: number;
    avgSalesCycle: number;
  };
  /** Adoption analysis */
  adoption: {
    totalOpportunities: number;
    wonDeals: number;
    lostDeals: number;
    pipeline: number;
    conversionRate: number;
  };
  /** Product mix analysis */
  productMix: Array<{
    product_name: string;
    attachRate: number;
    avgQuantity: number;
    contribution: number;
  }>;
  /** Performance trends */
  trends: {
    trend: 'improving' | 'stable' | 'declining';
    changePercent: number;
    insights: string[];
  };
  /** Benchmarks */
  benchmarks: {
    vsIndividualProducts: {
      bundleWinRate: number;
      individualWinRate: number;
      advantage: number;
    };
    vsOtherBundles: {
      ranking: number;
      totalBundles: number;
      percentile: number;
    };
  };
}

/**
 * Analyze existing bundle performance
 */
export async function analyzeBundlePerformance(request: AnalyzeBundlePerformanceRequest): Promise<AnalyzeBundlePerformanceResponse> {
  const { bundleId, periodDays = 90 } = request;

  // Fetch bundle
  const bundle = await db.doc.get('product_bundle', bundleId, {
    fields: ['name', 'bundle_id', 'discount_percent', 'is_active']
  });

  // Fetch bundle components
  const components = await db.find('product_bundle_component', {
    filters: [['bundle_id', '=', bundleId]],
    fields: ['product_id', 'quantity']
  });

  const productIds = components.map(c => c.product_id);

  // Fetch opportunities that included this bundle (simulated via product searches)
  const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
  
  const allOpportunities = await db.find('opportunity', {
    filters: [
      ['created_date', '>=', startDate.toISOString()]
    ],
    fields: ['opportunity_id', 'amount', 'stage', 'close_date', 'created_date'],
    limit: 500
  });

  // Simulate bundle-related opportunities (in reality, would query quote line items)
  const bundleOpportunities = allOpportunities.filter((_, idx) => idx % 5 === 0); // Simulate 20%

  const wonDeals = bundleOpportunities.filter(o => o.stage === 'Closed Won');
  const lostDeals = bundleOpportunities.filter(o => o.stage === 'Closed Lost');
  const pipeline = bundleOpportunities.filter(o => 
    o.stage !== 'Closed Won' && o.stage !== 'Closed Lost'
  );

  // Calculate metrics
  const totalSales = wonDeals.length;
  const revenue = wonDeals.reduce((sum, o) => sum + (o.amount || 0), 0);
  const averageDealSize = totalSales > 0 ? revenue / totalSales : 0;
  const winRate = bundleOpportunities.length > 0 
    ? (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100 
    : 0;

  const avgSalesCycle = wonDeals.length > 0
    ? wonDeals.reduce((sum, o) => {
        const created = new Date(o.created_date);
        const closed = new Date(o.close_date);
        const days = (closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0) / wonDeals.length
    : 0;

  // Product mix analysis
  const products = await Promise.all(
    components.map(c => 
      db.doc.get('product', c.product_id, {
        fields: ['name', 'product_id']
      })
    )
  );

  const productMix = products.map((p, idx) => ({
    product_name: p.name,
    attachRate: Math.round(85 + Math.random() * 15), // Simulated 85-100%
    avgQuantity: components[idx].quantity || 1,
    contribution: Math.round((1 / products.length) * 100)
  }));

  // Trends analysis
  const recentDeals = wonDeals.filter(o => {
    const daysAgo = (Date.now() - new Date(o.close_date).getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= 30;
  });

  const olderDeals = wonDeals.filter(o => {
    const daysAgo = (Date.now() - new Date(o.close_date).getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo > 30 && daysAgo <= 60;
  });

  const recentRevenue = recentDeals.reduce((sum, o) => sum + (o.amount || 0), 0);
  const olderRevenue = olderDeals.reduce((sum, o) => sum + (o.amount || 0), 0);
  
  const changePercent = olderRevenue > 0 
    ? ((recentRevenue - olderRevenue) / olderRevenue) * 100 
    : 0;

  let trend: 'improving' | 'stable' | 'declining';
  if (changePercent > 10) trend = 'improving';
  else if (changePercent < -10) trend = 'declining';
  else trend = 'stable';

  const insights = [];
  if (trend === 'improving') {
    insights.push('Bundle sales momentum is accelerating');
    insights.push('Recent marketing or sales initiatives are working');
  } else if (trend === 'declining') {
    insights.push('Bundle performance is declining, review needed');
    insights.push('Consider refreshing bundle composition or pricing');
  } else {
    insights.push('Consistent performance indicates stable product-market fit');
  }

  if (winRate > 60) {
    insights.push(`Strong ${Math.round(winRate)}% win rate demonstrates compelling value`);
  } else if (winRate < 30) {
    insights.push('Low win rate suggests pricing or positioning issues');
  }

  // Benchmarks
  const individualWinRate = 45; // Simulated baseline for individual products
  const bundleWinRate = Math.round(winRate);
  const advantage = bundleWinRate - individualWinRate;

  return {
    metrics: {
      totalSales,
      revenue: Math.round(revenue),
      averageDealSize: Math.round(averageDealSize),
      winRate: Math.round(winRate),
      avgSalesCycle: Math.round(avgSalesCycle)
    },
    adoption: {
      totalOpportunities: bundleOpportunities.length,
      wonDeals: wonDeals.length,
      lostDeals: lostDeals.length,
      pipeline: pipeline.length,
      conversionRate: Math.round(winRate)
    },
    productMix,
    trends: {
      trend,
      changePercent: Math.round(changePercent * 10) / 10,
      insights
    },
    benchmarks: {
      vsIndividualProducts: {
        bundleWinRate,
        individualWinRate,
        advantage
      },
      vsOtherBundles: {
        ranking: 2, // Simulated
        totalBundles: 5,
        percentile: 60
      }
    }
  };
}

// ============================================================================
// 5. BUNDLE IMPROVEMENT RECOMMENDATIONS
// ============================================================================

export interface RecommendBundleChangesRequest {
  /** Bundle ID */
  bundleId: string;
  /** Include market analysis */
  includeMarketAnalysis?: boolean;
}

export interface RecommendBundleChangesResponse {
  /** Overall assessment */
  assessment: {
    currentScore: number;
    potentialScore: number;
    improvementPotential: number;
  };
  /** Recommended changes */
  recommendations: Array<{
    category: 'composition' | 'pricing' | 'positioning' | 'marketing';
    priority: 'high' | 'medium' | 'low';
    change: string;
    rationale: string;
    expectedImpact: string;
    effort: 'low' | 'medium' | 'high';
  }>;
  /** Quick wins */
  quickWins: Array<{
    action: string;
    impact: number;
    timeline: string;
  }>;
  /** Strategic initiatives */
  strategicInitiatives: Array<{
    initiative: string;
    timeframe: string;
    resources: string;
    expectedOutcome: string;
  }>;
}

/**
 * Suggest bundle improvements
 */
export async function recommendBundleChanges(request: RecommendBundleChangesRequest): Promise<RecommendBundleChangesResponse> {
  const { bundleId, includeMarketAnalysis = true } = request;

  // Get bundle performance
  const performance = await analyzeBundlePerformance({ bundleId });

  // Get bundle composition
  const composition = await optimizeBundleComposition({ bundleId });

  // Calculate current score
  const performanceScore = Math.min(100, (performance.metrics.winRate || 0) + (performance.metrics.totalSales || 0));
  const compositionScore = composition.currentComposition.cohesionScore;
  const currentScore = Math.round((performanceScore + compositionScore) / 2);

  // Estimate potential score
  const potentialScore = Math.min(100, currentScore + composition.optimizedComposition.estimatedImprovement + 10);
  const improvementPotential = potentialScore - currentScore;

  // Generate recommendations
  const recommendations = [];

  // Composition recommendations
  if (composition.optimizedComposition.productsToAdd.length > 0) {
    recommendations.push({
      category: 'composition' as const,
      priority: 'high' as const,
      change: `Add ${composition.optimizedComposition.productsToAdd.length} complementary products`,
      rationale: 'Fill gaps in bundle offering to increase value and competitiveness',
      expectedImpact: 'Increase win rate by 10-15% and average deal size by 20%',
      effort: 'medium' as const
    });
  }

  if (composition.optimizedComposition.productsToRemove.length > 0) {
    recommendations.push({
      category: 'composition' as const,
      priority: 'medium' as const,
      change: `Remove ${composition.optimizedComposition.productsToRemove.length} redundant products`,
      rationale: 'Simplify bundle and reduce unnecessary complexity',
      expectedImpact: 'Improve adoption and reduce sales cycle by 15%',
      effort: 'low' as const
    });
  }

  // Pricing recommendations
  if (performance.metrics.winRate < 50) {
    recommendations.push({
      category: 'pricing' as const,
      priority: 'high' as const,
      change: 'Increase bundle discount by 5-7%',
      rationale: 'Low win rate indicates price may be barrier to adoption',
      expectedImpact: 'Increase win rate to 60%+ and accelerate sales velocity',
      effort: 'low' as const
    });
  } else if (performance.metrics.winRate > 75) {
    recommendations.push({
      category: 'pricing' as const,
      priority: 'medium' as const,
      change: 'Reduce bundle discount by 3-5% to improve margins',
      rationale: 'High win rate suggests room for price optimization',
      expectedImpact: 'Increase profitability by 8-12% with minimal volume impact',
      effort: 'low' as const
    });
  }

  // Positioning recommendations
  if (performance.trends.trend === 'declining') {
    recommendations.push({
      category: 'positioning' as const,
      priority: 'high' as const,
      change: 'Reposition bundle with updated value proposition',
      rationale: 'Declining performance suggests messaging is stale or not resonating',
      expectedImpact: 'Reverse decline and restore growth trajectory',
      effort: 'medium' as const
    });
  }

  // Marketing recommendations
  if (performance.metrics.totalSales < 10) {
    recommendations.push({
      category: 'marketing' as const,
      priority: 'high' as const,
      change: 'Launch targeted bundle marketing campaign',
      rationale: 'Low sales volume indicates awareness and demand generation needed',
      expectedImpact: 'Increase qualified opportunities by 50%+',
      effort: 'high' as const
    });
  }

  // Quick wins
  const quickWins = [
    {
      action: 'Update bundle description and benefits in sales materials',
      impact: 10,
      timeline: '1 week'
    },
    {
      action: 'Train sales team on bundle positioning and ROI messaging',
      impact: 15,
      timeline: '2 weeks'
    },
    {
      action: 'Create bundle comparison guide vs individual products',
      impact: 8,
      timeline: '1 week'
    }
  ];

  // Strategic initiatives
  const strategicInitiatives = [
    {
      initiative: 'Develop industry-specific bundle variations',
      timeframe: '3 months',
      resources: 'Product marketing, sales enablement',
      expectedOutcome: '30% increase in win rate for targeted verticals'
    },
    {
      initiative: 'Create tiered bundle strategy (good/better/best)',
      timeframe: '2 months',
      resources: 'Product management, pricing',
      expectedOutcome: 'Expand addressable market and increase average deal size'
    },
    {
      initiative: 'Implement bundle performance dashboard and analytics',
      timeframe: '1 month',
      resources: 'Analytics team, BI tools',
      expectedOutcome: 'Real-time visibility into bundle performance for optimization'
    }
  ];

  return {
    assessment: {
      currentScore,
      potentialScore,
      improvementPotential
    },
    recommendations: recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }),
    quickWins,
    strategicInitiatives
  };
}

export default {
  suggestBundles,
  optimizeBundleComposition,
  priceBundleOptimally,
  analyzeBundlePerformance,
  recommendBundleChanges
};
