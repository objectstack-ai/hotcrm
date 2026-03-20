/**
 * @hotcrm/products - Products Module
 * 
 * This package contains all product and pricing-related business objects:
 * - Product: Product catalog and specifications
 * - Pricebook: Pricing structures and configurations
 * - Quote: CPQ (Configure, Price, Quote) functionality
 * - ProductBundle: Product bundles and packages
 * - PriceRule: Pricing rules and discounts
 * - QuoteLineItem: Quote line items
 * - ApprovalRequest: Discount approval workflow
 * - DiscountSchedule: Discount schedules with date ranges
 */

// Export business objects
export { Product } from './product.object.js';
export { Pricebook } from './pricebook.object.js';
export { Quote } from './quote.object.js';

export { ProductBundle } from './product_bundle.object.js';
export { ProductBundleComponent } from './product_bundle_component.object.js';
export { PriceRule } from './price_rule.object.js';
export { QuoteLineItem } from './quote_line_item.object.js';
export { ApprovalRequest } from './approval_request.object.js';
export { DiscountSchedule } from './discount_schedule.object.js';
export { Order } from './order.object.js';
export { OrderItem } from './order_item.object.js';

// Export hooks
export { default as QuotePricingHook } from './hooks/quote.hook.js';
export { default as ProductHook } from './hooks/product.hook.js';
export { default as PricebookHook } from './hooks/pricebook.hook.js';

// Export workflows
export { ApprovalWorkflows } from './approval.workflow.js';

// Export plugin definition
export { default as ProductsPlugin } from './plugin.js';

// Export translations
export { ProductsTranslations } from './translations/index.js';

// Note: YAML files (Product, Pricebook) are kept for reference
// TypeScript definitions should be created following the metadata protocol
