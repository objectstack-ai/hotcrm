/**
 * @hotcrm/products - Products Plugin Definition
 * 
 * This plugin provides product and pricing functionality including:
 * - Product Catalog Management
 * - Price Books & Pricing Rules
 * - CPQ (Configure, Price, Quote)
 * - Product Bundles
 * - Discount Schedules & Approval Workflows
 * 
 * Dependencies: @hotcrm/crm (required for Account and Opportunity references)
 */

// Import all Products objects
import { Product } from './product.object';
import { Pricebook } from './pricebook.object';
import { Quote } from './quote.object';

import { QuoteLineItem } from './quote_line_item.object';
import { ProductBundle } from './product_bundle.object';
import { ProductBundleComponent } from './product_bundle_component.object';
import { PriceRule } from './price_rule.object';
import { ApprovalRequest } from './approval_request.object';
import { DiscountSchedule } from './discount_schedule.object';

import { QuotePricingHook } from './hooks/quote.hook';
import ProductHook from './hooks/product.hook';
import PricebookHook from './hooks/pricebook.hook';
import { QuoteLineCalculationTrigger, QuoteLineTotalUpdateTrigger } from './hooks/quote_line_item.hook';
import { ApprovalRequestCreationTrigger, ApprovalDecisionTrigger } from './hooks/approval_request.hook';
import { ProductBundleValidationTrigger, ProductBundleComponentCompletenessTrigger } from './hooks/product_bundle.hook';
import { PriceRuleValidationTrigger, PriceRuleConflictDetectionTrigger } from './hooks/price_rule.hook';
import { DiscountScheduleActivationTrigger, DiscountScheduleOverlapDetectionTrigger } from './hooks/discount_schedule.hook';

// Import actions
import BundleSuggestionAction from './actions/bundle_suggestion.action';
import PricingOptimizerAction from './actions/pricing_optimizer.action';
import ProductRecommendationAction from './actions/product_recommendation.action';

/**
 * Products Plugin Definition
 * 
 * Exports all product and pricing-related business objects, hooks, and actions
 * to be registered with the ObjectStack runtime
 */
export const ProductsPlugin: any = {
  name: 'products',
  label: 'Products & Pricing',
  version: '1.0.0',
  description: 'Product catalog, pricing rules, and CPQ (Configure, Price, Quote) functionality',
  
  // Plugin dependencies
  dependencies: ['crm'],
  
  // Plugin initialization
  init: async () => {
    // No initialization required for this plugin
  },
  
  // Business objects provided by this plugin
  objects: {
    product: Product,
    pricebook: Pricebook,
    quote: Quote,
    quote_line_item: QuoteLineItem,
    product_bundle: ProductBundle,
    product_bundle_component: ProductBundleComponent,
    price_rule: PriceRule,
    approval_request: ApprovalRequest,
    discount_schedule: DiscountSchedule,
  },
  
  // Actions provided by this plugin
  actions: {
    bundle_suggestion: BundleSuggestionAction,
    pricing_optimizer: PricingOptimizerAction,
    product_recommendation: ProductRecommendationAction,
  },

  triggers: {
    quote_pricing: QuotePricingHook,
    product_validation: ProductHook,
    pricebook_validation: PricebookHook,
    quote_line_calculation: QuoteLineCalculationTrigger,
    quote_line_total_update: QuoteLineTotalUpdateTrigger,
    approval_request_creation: ApprovalRequestCreationTrigger,
    approval_decision: ApprovalDecisionTrigger,
    product_bundle_validation: ProductBundleValidationTrigger,
    product_bundle_component_completeness: ProductBundleComponentCompletenessTrigger,
    price_rule_validation: PriceRuleValidationTrigger,
    price_rule_conflict_detection: PriceRuleConflictDetectionTrigger,
    discount_schedule_activation: DiscountScheduleActivationTrigger,
    discount_schedule_overlap_detection: DiscountScheduleOverlapDetectionTrigger,
  },

  // Navigation structure for this plugin
  navigation: [
    {
      type: 'group',
      label: 'Products & Pricing',
      children: [
        { type: 'object', object: 'quote' },
        { type: 'object', object: 'product_bundle' },
        { type: 'object', object: 'price_rule' },
        { type: 'object', object: 'discount_schedule' },
        { type: 'object', object: 'approval_request' },
      ]
    }
  ]
};

export default ProductsPlugin;
