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

import { PluginSchema } from '@objectstack/spec/kernel';
import type { PluginDefinition } from '@objectstack/spec/kernel';

// Import all Products objects
import { Product } from './product.object.js';
import { Pricebook } from './pricebook.object.js';
import { Quote } from './quote.object.js';

import { QuoteLineItem } from './quote_line_item.object.js';
import { ProductBundle } from './product_bundle.object.js';
import { ProductBundleComponent } from './product_bundle_component.object.js';
import { PriceRule } from './price_rule.object.js';
import { ApprovalRequest } from './approval_request.object.js';
import { DiscountSchedule } from './discount_schedule.object.js';
import { Order } from './order.object.js';
import { OrderItem } from './order_item.object.js';
import { Subscription } from './subscription.object.js';
import { ProductOption } from './product_option.object.js';

import { QuotePricingHook } from './hooks/quote.hook.js';
import ProductHook from './hooks/product.hook.js';
import PricebookHook from './hooks/pricebook.hook.js';
import { QuoteLineCalculationTrigger, QuoteLineTotalUpdateTrigger } from './hooks/quote_line_item.hook.js';
import { ApprovalRequestCreationTrigger, ApprovalDecisionTrigger } from './hooks/approval_request.hook.js';
import { ProductBundleValidationTrigger, ProductBundleComponentCompletenessTrigger } from './hooks/product_bundle.hook.js';
import { PriceRuleValidationTrigger, PriceRuleConflictDetectionTrigger } from './hooks/price_rule.hook.js';
import { DiscountScheduleActivationTrigger, DiscountScheduleOverlapDetectionTrigger } from './hooks/discount_schedule.hook.js';
import { OrderValidationTrigger, OrderStatusLifecycleTrigger } from './hooks/order.hook.js';
import { SubscriptionValidationTrigger, SubscriptionRenewalReminderTrigger } from './hooks/subscription.hook.js';
import { ApprovalWorkflows } from './approval.workflow.js';

// Import datasets
import { ProductDataset } from './product.dataset.js';
import { PriceBookDataset } from './price_book.dataset.js';

// Import actions
import BundleSuggestionAction from './actions/bundle_suggestion.action.js';
import PricingOptimizerAction from './actions/pricing_optimizer.action.js';
import ProductRecommendationAction from './actions/product_recommendation.action.js';
import OrderAIAction from './actions/order_ai.action.js';

/**
 * Products Plugin Definition
 * 
 * Exports all product and pricing-related business objects, hooks, and actions
 * to be registered with the ObjectStack runtime
 */
export const ProductsPlugin = {
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
    order: Order,
    order_item: OrderItem,
    subscription: Subscription,
    product_option: ProductOption,
  },
  
  // Seed data (DatasetSchema)
  data: [
    ProductDataset,
    PriceBookDataset,
  ],

  // Actions provided by this plugin
  actions: {
    bundle_suggestion: BundleSuggestionAction,
    pricing_optimizer: PricingOptimizerAction,
    product_recommendation: ProductRecommendationAction,
    order_ai: OrderAIAction,
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
    order_validation: OrderValidationTrigger,
    order_status_lifecycle: OrderStatusLifecycleTrigger,
    subscription_validation: SubscriptionValidationTrigger,
    subscription_renewal_reminder: SubscriptionRenewalReminderTrigger,
  },

  // Workflows
  workflows: {
    parallel_approval_chain: ApprovalWorkflows.parallelApprovalChain,
    smart_delegation: ApprovalWorkflows.smartDelegation,
    approval_escalation: ApprovalWorkflows.approvalEscalation,
    approval_auto_resolve: ApprovalWorkflows.approvalAutoResolve,
  },

  // Apps provided by this plugin
  apps: [
    {
      name: 'products',
      label: 'Products & Pricing',
      navigation: [
        {
          id: 'products_and_pricing',
          type: 'group',
          label: 'Products & Pricing',
          children: [
            { id: 'quote', label: 'Quote', type: 'object', objectName: 'quote' },
            { id: 'product_bundle', label: 'Product Bundle', type: 'object', objectName: 'product_bundle' },
            { id: 'price_rule', label: 'Price Rule', type: 'object', objectName: 'price_rule' },
            { id: 'discount_schedule', label: 'Discount Schedule', type: 'object', objectName: 'discount_schedule' },
            { id: 'approval_request', label: 'Approval Request', type: 'object', objectName: 'approval_request' },
            { id: 'order', label: 'Order', type: 'object', objectName: 'order' },
          ]
        },
        {
          id: 'subscriptions',
          type: 'group',
          label: 'Subscriptions',
          children: [
            { id: 'subscription', label: 'Subscription', type: 'object', objectName: 'subscription' },
            { id: 'product_option', label: 'Product Option', type: 'object', objectName: 'product_option' },
          ]
        },
        {
          id: 'views_and_dashboards',
          type: 'group',
          label: 'Views & Dashboards',
          children: [
            { id: 'quote_gantt', label: 'Quote Approval Timeline', type: 'object', objectName: 'quote', viewName: 'quote_gantt' },
            { id: 'cpq_dashboard', label: 'CPQ Dashboard', type: 'dashboard', dashboardName: 'cpq_dashboard' },
          ]
        }
      ]
    }
  ]
};

/** Spec-validated plugin metadata */
export const ProductsPluginMetadata: PluginDefinition = PluginSchema.parse({
  name: 'products',
  label: 'Products & Pricing',
  version: '1.0.0',
  description: 'Product catalog, pricing rules, and CPQ (Configure, Price, Quote) functionality',
});

export default ProductsPlugin;
