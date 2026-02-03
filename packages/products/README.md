# @hotcrm/products

Product & Pricing module for HotCRM - Complete CPQ (Configure-Price-Quote) with product catalog, intelligent pricing, and bundle optimization.

## Overview

This package provides comprehensive product catalog management, sophisticated pricing strategies, CPQ (Configure-Price-Quote) capabilities, and AI-powered pricing optimization and product recommendations.

**Package Stats:** 9 Objects | 3 AI Actions | 3 Automation Hook Modules

## What's Included

### Business Objects (9 Total)

#### Product Catalog
| Object | Label | Description |
|--------|-------|-------------|
| **product** | Product | Product catalog with 7 families (Software, Hardware, Services, Consulting, Training, Support, Subscription), inventory tracking, pricing (list/cost), active status management |
| **product_bundle** | Product Bundle | Pre-configured product packages with dependencies, constraints, configuration options, pricing methods (Sum, Fixed, % Discount, Amount Discount), stock tracking, AI recommendation scoring |
| **product_bundle_component** | Product Bundle Component | Individual components within bundles with quantity defaults, optional/required designation, price overrides |

#### Pricing & Discounts
| Object | Label | Description |
|--------|-------|-------------|
| **pricebook** | Pricebook | Pricing strategies by region/channel with multi-currency support (USD, EUR, GBP, JPY, CNY, HKD), effective/expiration dates, standard pricebook designation |
| **price_rule** | Price Rule | Tiered pricing, volume discounts, contract-based pricing, promotional pricing with 7 rule types, approval workflows, usage limits, promotion codes, AI competitive analysis |
| **discount_schedule** | Discount Schedule | Date-ranged discounts with 8 types (Seasonal, Promotional, Clearance, Early Bird, EOQ, Volume, Loyalty, New Customer), approval workflows, margin protection, usage limits, performance tracking |

#### Quote Management
| Object | Label | Description |
|--------|-------|-------------|
| **quote** | Quote | CPQ with complex pricing, multi-level discount approval (5-level matrix), PDF generation, 8 status options, version history, AI recommendations (bundles, optimal discounts, win probability, pricing analysis, upsells) |
| **quote_line_item** | Quote Line Item | Line items with pricing, quantity, discounts, custom configurations, service dates, billing frequency, tax handling, bundle hierarchies, AI upsell/cross-sell recommendations |

#### Approval & Governance
| Object | Label | Description |
|--------|-------|-------------|
| **approval_request** | Approval Request | Multi-level approval for 6 types (Discount, Price Override, Contract Terms, Credit Limit, Payment Terms, Custom Pricing), escalation, SLA tracking, AI risk scoring, historical comparison |

### AI Actions (3 Total)

| Action | Purpose |
|--------|---------|
| **pricing_optimizer** | Optimizes product pricing, competitive pricing analysis, optimal discount recommendations based on historical win rates, price elasticity prediction, revenue-maximizing prices with sensitivity analysis |
| **product_recommendation** | Recommends products based on industry fit, purchase history, customer segment, identifies cross-sell opportunities, analyzes product-customer fit, predicts adoption likelihood with relevance scoring |
| **bundle_suggestion** | Suggests pre-configured bundles tailored to budget and company size, optimizes bundle composition, calculates optimal bundle pricing, analyzes bundle performance, recommends improvements |

### Automation Hooks (3 Modules)

#### **product.hook.ts**
| Hook | Triggers | Purpose |
|------|----------|---------|
| **Validation** | beforeInsert, beforeUpdate | Validates product code uniqueness, pricing consistency |
| **Bundle Management** | beforeInsert, beforeUpdate | Validates bundle configurations and dependencies |
| **Inventory** | afterUpdate | Tracks stock changes, triggers low-stock alerts, auto-updates status (Active ↔ Out of Stock) |
| **Pricing** | afterUpdate | Logs price changes, recalculates margins, notifies sales team |
| **Status Changes** | afterUpdate | Handles activation/deactivation, pricebook updates |

#### **pricebook.hook.ts**
| Hook | Triggers | Purpose |
|------|----------|---------|
| **Date Management** | beforeInsert, beforeUpdate | Validates effective/expiration dates, prevents overlapping standard pricebooks |
| **Currency** | beforeInsert, beforeUpdate | Validates currency codes and exchange rates |
| **Effective Date Handling** | afterUpdate | Auto-activates when effective date reached, auto-expires when expiration date passes |
| **Status Changes** | afterUpdate | Manages activation/expiration, enforces single active standard pricebook |
| **Currency Changes** | afterUpdate | Updates all pricebook entries when currency or exchange rate changes |

#### **quote.hook.ts**
| Hook | Triggers | Purpose |
|------|----------|---------|
| **Pricing Calculation** | beforeInsert, beforeUpdate, afterInsert, afterUpdate | Computes subtotal, discounts, tax, total from line items |
| **Approval Routing** | beforeUpdate | Routes for approval based on discount % (5-level matrix: 5%→L1, 10%→L2, 20%→L3, 30%→L4, 40%→L5) |
| **Margin Protection** | beforeUpdate | Validates minimum margins, alerts on violations |
| **Quote Initialization** | beforeInsert | Sets expiration date (default 30 days), logs creation |
| **Status Changes** | afterUpdate | Accepted → update opportunity to Closed Won, create contract; Sent → email notifications; Expired → escalation |
| **Approval Status** | afterUpdate | Tracks approval workflow state changes |

## Business Capabilities

### 📦 Product Catalog Management
- **7 Product Families**: Software, Hardware, Services, Consulting, Training, Support, Subscription
- **Inventory Tracking**: Real-time stock levels, low-stock alerts, automatic status updates
- **Product Lifecycle**: Active, Inactive, End-of-Life status management
- **SKU Management**: Unique product codes with validation
- **Pricing**: List price, cost price, margin calculations
- **Product Bundling**: Pre-configured packages with dependencies and constraints

### 💰 Intelligent Pricing Engine
- **Multi-Currency Support**: USD, EUR, GBP, JPY, CNY, HKD (6+ currencies)
- **Pricebook Management**: Region/channel-specific pricing with effective dates
- **Tiered Pricing**: Volume-based discount structures
- **Price Rules**: 7 rule types with approval workflows and usage limits
- **Discount Schedules**: 8 schedule types (Seasonal, Promotional, Clearance, Early Bird, EOQ, Volume, Loyalty, New Customer)
- **Margin Protection**: Minimum margin validation and violation alerts
- **Competitive Pricing**: AI-powered competitive analysis
- **Price Optimization**: Revenue-maximizing prices with elasticity analysis

### 📝 CPQ (Configure-Price-Quote)
- **Quote Configuration**: Complex product configurations with bundles and options
- **Multi-Level Approval**: 5-level discount approval matrix (5% → 10% → 20% → 30% → 40%+)
- **Automatic Calculations**: Subtotal, discounts, tax, shipping, total
- **8 Quote Statuses**: Draft, Sent, Presented, In Review, Accepted, Rejected, Expired, Cancelled
- **Version Control**: Quote version history and comparison
- **PDF Generation**: Professional quote documents
- **AI Recommendations**: Bundle suggestions, optimal discounts, win probability, pricing analysis, upsell opportunities
- **Quote-to-Order**: Seamless conversion (Accepted → Opportunity Closed Won → Contract creation)

### 🤖 AI-Powered Intelligence
- **Product Recommendations**: Industry fit, purchase history analysis, customer segment matching, cross-sell identification, adoption prediction
- **Pricing Optimization**: Historical win rate analysis, competitive pricing, optimal discount levels, price elasticity, revenue maximization
- **Bundle Optimization**: Budget-tailored bundles, composition optimization, optimal bundle pricing, performance analysis
- **Win Probability**: ML-based quote acceptance prediction
- **Risk Scoring**: Approval request risk assessment with historical comparison

### ✅ Approval & Governance
- **6 Approval Types**: Discount, Price Override, Contract Terms, Credit Limit, Payment Terms, Custom Pricing
- **Multi-Level Workflow**: Escalation based on discount percentage
- **SLA Tracking**: Approval request timing and deadlines
- **Audit Trail**: Complete approval history and decision tracking
- **AI Risk Assessment**: Automatic risk scoring of approval requests

### 🔄 Automation
- **Inventory Management**: Auto-update stock status, low-stock alerts
- **Pricebook Lifecycle**: Auto-activation/expiration based on effective dates
- **Quote Calculations**: Real-time recalculation of totals from line items
- **Approval Routing**: Automatic routing based on discount threshold
- **Margin Validation**: Automatic margin checking and alerts
- **Contract Creation**: Auto-create contracts from accepted quotes

## Usage

### Importing Schemas
```typescript
import { 
  Product,
  ProductBundle,
  Pricebook,
  Quote,
  QuoteLineItem,
  PriceRule,
  DiscountSchedule,
  ApprovalRequest
} from '@hotcrm/products';

console.log(Product.label); // "Product"
console.log(Quote.label); // "Quote"
```

### Working with Products and Quotes
```typescript
import { db } from '@hotcrm/core';

// Create a product
const product = await db.create('product', {
  name: 'Enterprise CRM License',
  product_code: 'CRM-ENT-001',
  family: 'Software',
  list_price: 10000,
  cost_price: 3000,
  quantity_available: 100,
  is_active: true
});

// Create a quote
const quote = await db.create('quote', {
  opportunity: 'opp_123',
  account: 'acc_456',
  pricebook: 'pb_standard',
  status: 'Draft',
  expiration_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
});

// Add quote line items
const lineItem = await db.create('quote_line_item', {
  quote: quote.id,
  product: product.id,
  quantity: 5,
  unit_price: 10000,
  discount_percent: 10
});
// → Pricing Calculation hook: Automatically calculates subtotal, discount, total

// Send quote (triggers approval if discount > threshold)
await db.update('quote', quote.id, {
  status: 'Sent'
});
// → Approval Routing hook: Routes for approval if discount > 5%
// → Status Changes hook: Sends email notifications
```

### Using AI Actions
```typescript
import { 
  optimizeProductPricing,
  recommendProducts,
  suggestBundles,
  predictPriceElasticity
} from '@hotcrm/products';

// Optimize product pricing
const pricingOptimization = await optimizeProductPricing({
  productId: 'prod_123',
  competitorPrices: [9500, 10200, 9800],
  historicalWinRates: { 9000: 0.85, 10000: 0.70, 11000: 0.50 }
});
console.log(pricingOptimization.optimalPrice); // Revenue-maximizing price
console.log(pricingOptimization.priceElasticity); // Demand sensitivity
console.log(pricingOptimization.revenueImpact); // Expected revenue change
console.log(pricingOptimization.competitivePosition); // Market positioning

// Recommend products for customer
const recommendations = await recommendProducts({
  accountId: 'acc_456',
  opportunityId: 'opp_123',
  budget: 50000,
  industry: 'Technology'
});
console.log(recommendations.products); // Recommended products
console.log(recommendations.relevanceScores); // 0-100 fit scores
console.log(recommendations.crossSellOpportunities); // Additional products
console.log(recommendations.adoptionProbability); // Likelihood of purchase

// Suggest product bundles
const bundleSuggestions = await suggestBundles({
  accountId: 'acc_456',
  budget: 50000,
  companySize: 'Enterprise'
});
console.log(bundleSuggestions.bundles); // Tailored bundle configurations
console.log(bundleSuggestions.pricing); // Optimal bundle pricing
console.log(bundleSuggestions.savings); // Discount vs individual purchase
console.log(bundleSuggestions.recommendations); // Why these bundles

// Predict price elasticity
const elasticity = await predictPriceElasticity({
  productId: 'prod_123',
  pricePoints: [8000, 9000, 10000, 11000, 12000]
});
console.log(elasticity.elasticityCoefficient); // Demand sensitivity
console.log(elasticity.demandCurve); // Predicted demand at each price
console.log(elasticity.revenueMaximizingPrice); // Optimal price point
```

### Hooks Auto-Trigger (No Code Required)
```typescript
// Product hooks
await db.update('product', productId, {
  list_price: 12000 // Price change
});
// → Pricing hook: Logs price change, recalculates margins, notifies sales

await db.update('product', productId, {
  quantity_available: 5 // Low stock
});
// → Inventory hook: Triggers low-stock alert

// Pricebook hooks
await db.update('pricebook', pricebookId, {
  effective_date: new Date('2026-03-01')
});
// → Effective Date Handling hook: Auto-activates on March 1st

// Quote hooks
await db.update('quote_line_item', lineItemId, {
  quantity: 10,
  discount_percent: 15
});
// → Pricing Calculation hook: Recalculates quote totals

await db.update('quote', quoteId, {
  discount_total: 5500 // 11% discount
});
// → Approval Routing hook: Routes to Level 2 approver (10-20% range)
// → Margin Protection hook: Validates minimum margin requirements

await db.update('quote', quoteId, {
  status: 'Accepted'
});
// → Status Changes hook: 
//   1. Updates opportunity to "Closed Won"
//   2. Creates contract automatically
//   3. Notifies account team
```

## Domain Focus

This module focuses on **Product and Revenue Management**, enabling complex product configurations and pricing strategies.

## Build

```bash
pnpm --filter @hotcrm/products build
```

## Development

```bash
pnpm --filter @hotcrm/products dev
```
