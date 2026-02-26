/**
 * Finance Domain Event Definitions
 *
 * Defines the event contracts for cross-package communication.
 * Other plugins can subscribe to these events to react to Finance domain changes.
 */
import { EventTypeDefinitionSchema } from '@objectstack/spec/kernel';

export const FinanceEvents = {
  invoiceCreated: EventTypeDefinitionSchema.parse({
    name: 'finance.invoice.created',
    description: 'Fired when a new invoice is created',
  }),
  invoicePaid: EventTypeDefinitionSchema.parse({
    name: 'finance.invoice.paid',
    description: 'Fired when an invoice is fully paid',
  }),
  invoiceOverdue: EventTypeDefinitionSchema.parse({
    name: 'finance.invoice.overdue',
    description: 'Fired when an invoice becomes overdue',
  }),
  paymentReceived: EventTypeDefinitionSchema.parse({
    name: 'finance.payment.received',
    description: 'Fired when a payment is received and recorded',
  }),
  contractActivated: EventTypeDefinitionSchema.parse({
    name: 'finance.contract.activated',
    description: 'Fired when a contract is activated',
  }),
  contractRenewed: EventTypeDefinitionSchema.parse({
    name: 'finance.contract.renewed',
    description: 'Fired when a contract is renewed',
  }),
  contractExpiring: EventTypeDefinitionSchema.parse({
    name: 'finance.contract.expiring',
    description: 'Fired when a contract is approaching its expiration date',
  }),
};
