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
import Quote from './quote.object';
import QuoteLineItem from './quote_line_item.object';
import ProductBundle from './product_bundle.object';
import PriceRule from './price_rule.object';
import ApprovalRequest from './approval_request.object';
import DiscountSchedule from './discount_schedule.object';

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
  
  // Business objects provided by this plugin
  objects: {
    quote: Quote,
    quote_line_item: QuoteLineItem,
    product_bundle: ProductBundle,
    price_rule: PriceRule,
    approval_request: ApprovalRequest,
    discount_schedule: DiscountSchedule,
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
