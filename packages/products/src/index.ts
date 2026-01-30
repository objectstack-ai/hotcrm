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
export { default as Quote } from './quote.object';
export { default as ProductBundle } from './product_bundle.object';
export { default as PriceRule } from './price_rule.object';
export { default as QuoteLineItem } from './quote_line_item.object';
export { default as ApprovalRequest } from './approval_request.object';
export { default as DiscountSchedule } from './discount_schedule.object';

// Export hooks
export { default as QuotePricingHook } from './hooks/quote.hook';
export { default as ProductHook } from './hooks/product.hook';
export { default as PricebookHook } from './hooks/pricebook.hook';

// Note: YAML files (Product, Pricebook) are kept for reference
// TypeScript definitions should be created following the metadata protocol
