/**
 * Products Domain Event Definitions
 *
 * Defines the event contracts for cross-package communication.
 * Other plugins can subscribe to these events to react to Products domain changes.
 */

export const ProductsEvents = {
  quoteGenerated: {
    name: 'products.quote.generated',
    type: 'domain' as const,
    description: 'Fired when a new quote is generated',
  },
  quoteApproved: {
    name: 'products.quote.approved',
    type: 'domain' as const,
    description: 'Fired when a quote is approved and ready for customer',
  },
  quoteAccepted: {
    name: 'products.quote.accepted',
    type: 'domain' as const,
    description: 'Fired when a quote is accepted by the customer',
  },
  priceRuleApplied: {
    name: 'products.price_rule.applied',
    type: 'domain' as const,
    description: 'Fired when a pricing rule is applied to a quote line',
  },
  approvalRequested: {
    name: 'products.approval.requested',
    type: 'domain' as const,
    description: 'Fired when a discount or special pricing approval is requested',
  },
  productDeactivated: {
    name: 'products.product.deactivated',
    type: 'domain' as const,
    description: 'Fired when a product is deactivated from the catalog',
  },
};
