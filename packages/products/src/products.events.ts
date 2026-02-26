/**
 * Products Domain Event Definitions
 *
 * Defines the event contracts for cross-package communication.
 * Other plugins can subscribe to these events to react to Products domain changes.
 */
import { EventTypeDefinitionSchema } from '@objectstack/spec/kernel';

export const ProductsEvents = {
  quoteGenerated: EventTypeDefinitionSchema.parse({
    name: 'products.quote.generated',
    description: 'Fired when a new quote is generated',
  }),
  quoteApproved: EventTypeDefinitionSchema.parse({
    name: 'products.quote.approved',
    description: 'Fired when a quote is approved and ready for customer',
  }),
  quoteAccepted: EventTypeDefinitionSchema.parse({
    name: 'products.quote.accepted',
    description: 'Fired when a quote is accepted by the customer',
  }),
  priceRuleApplied: EventTypeDefinitionSchema.parse({
    name: 'products.price_rule.applied',
    description: 'Fired when a pricing rule is applied to a quote line',
  }),
  approvalRequested: EventTypeDefinitionSchema.parse({
    name: 'products.approval.requested',
    description: 'Fired when a discount or special pricing approval is requested',
  }),
  productDeactivated: EventTypeDefinitionSchema.parse({
    name: 'products.product.deactivated',
    description: 'Fired when a product is deactivated from the catalog',
  }),
};
