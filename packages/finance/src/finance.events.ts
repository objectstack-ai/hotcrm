/**
 * Finance Domain Event Definitions
 *
 * Defines the event contracts for cross-package communication.
 * Other plugins can subscribe to these events to react to Finance domain changes.
 */

export const FinanceEvents = {
  invoiceCreated: {
    name: 'finance.invoice.created',
    type: 'domain' as const,
    description: 'Fired when a new invoice is created',
  },
  invoicePaid: {
    name: 'finance.invoice.paid',
    type: 'domain' as const,
    description: 'Fired when an invoice is fully paid',
  },
  invoiceOverdue: {
    name: 'finance.invoice.overdue',
    type: 'domain' as const,
    description: 'Fired when an invoice becomes overdue',
  },
  paymentReceived: {
    name: 'finance.payment.received',
    type: 'domain' as const,
    description: 'Fired when a payment is received and recorded',
  },
  contractActivated: {
    name: 'finance.contract.activated',
    type: 'domain' as const,
    description: 'Fired when a contract is activated',
  },
  contractRenewed: {
    name: 'finance.contract.renewed',
    type: 'domain' as const,
    description: 'Fired when a contract is renewed',
  },
  contractExpiring: {
    name: 'finance.contract.expiring',
    type: 'domain' as const,
    description: 'Fired when a contract is approaching its expiration date',
  },
};
