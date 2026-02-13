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
import { Product } from './product.object';
import { Pricebook } from './pricebook.object';
import { Quote } from './quote.object';

import { QuoteLineItem } from './quote_line_item.object';
import { ProductBundle } from './product_bundle.object';
import { ProductBundleComponent } from './product_bundle_component.object';
import { PriceRule } from './price_rule.object';
import { ApprovalRequest } from './approval_request.object';
import { DiscountSchedule } from './discount_schedule.object';
import { Order } from './order.object';
import { OrderItem } from './order_item.object';
import { Subscription } from './subscription.object';
import { ProductOption } from './product_option.object';

import { QuotePricingHook } from './hooks/quote.hook';
import ProductHook from './hooks/product.hook';
import PricebookHook from './hooks/pricebook.hook';
import { QuoteLineCalculationTrigger, QuoteLineTotalUpdateTrigger } from './hooks/quote_line_item.hook';
import { ApprovalRequestCreationTrigger, ApprovalDecisionTrigger } from './hooks/approval_request.hook';
import { ProductBundleValidationTrigger, ProductBundleComponentCompletenessTrigger } from './hooks/product_bundle.hook';
import { PriceRuleValidationTrigger, PriceRuleConflictDetectionTrigger } from './hooks/price_rule.hook';
import { DiscountScheduleActivationTrigger, DiscountScheduleOverlapDetectionTrigger } from './hooks/discount_schedule.hook';
import { OrderValidationTrigger, OrderStatusLifecycleTrigger } from './hooks/order.hook';
import { SubscriptionValidationTrigger, SubscriptionRenewalReminderTrigger } from './hooks/subscription.hook';
import { ApprovalWorkflows } from './approval.workflow';

// Import actions
import BundleSuggestionAction from './actions/bundle_suggestion.action';
import PricingOptimizerAction from './actions/pricing_optimizer.action';
import ProductRecommendationAction from './actions/product_recommendation.action';
import OrderAIAction from './actions/order_ai.action';

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
