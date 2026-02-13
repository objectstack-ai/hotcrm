import type { Connector } from '@objectstack/spec/automation';
import { ConnectorSchema } from '@objectstack/spec/automation';

export const PaymentConnector = {
  id: 'payment_connector',
  name: 'Payment Connector',
  description: 'Integrates with Stripe and PayPal for payment processing, invoice sync, and refund management.',
  version: '1.0.0',
  icon: 'credit-card',
  category: 'payment',
  baseUrl: 'https://api.stripe.com/v1',
  authentication: {
    type: 'apiKey',
    fields: [
      {
        name: 'secret_key',
        label: 'Secret Key',
        type: 'password',
        description: 'API secret key from payment provider dashboard',
        required: true,
        placeholder: 'sk_live_...',
      },
      {
        name: 'webhook_secret',
        label: 'Webhook Secret',
        type: 'password',
        description: 'Webhook signing secret for event verification',
        required: false,
        placeholder: 'whsec_...',
      },
    ],
    test: {
      url: '/balance',
      method: 'GET',
    },
  },
  operations: [
    {
      id: 'get_payment',
      name: 'Get Payment',
      description: 'Retrieve details of a specific payment or charge.',
      type: 'read',
      inputSchema: [
        { name: 'payment_id', label: 'Payment ID', type: 'string', required: true },
      ],
      supportsPagination: false,
      supportsFiltering: false,
    },
    {
      id: 'create_charge',
      name: 'Create Charge',
      description: 'Create a new payment charge against a customer.',
      type: 'write',
      inputSchema: [
        { name: 'amount', label: 'Amount', type: 'number', required: true },
        { name: 'currency', label: 'Currency', type: 'string', required: true },
        { name: 'customer_id', label: 'Customer ID', type: 'string', required: false },
        { name: 'description', label: 'Description', type: 'string', required: false },
      ],
      supportsPagination: false,
      supportsFiltering: false,
    },
    {
      id: 'refund_payment',
      name: 'Refund Payment',
      description: 'Issue a full or partial refund for a payment.',
      type: 'action',
      inputSchema: [
        { name: 'payment_id', label: 'Payment ID', type: 'string', required: true },
        { name: 'amount', label: 'Refund Amount', type: 'number', required: false },
        { name: 'reason', label: 'Reason', type: 'string', required: false },
      ],
      supportsPagination: false,
      supportsFiltering: false,
    },
    {
      id: 'sync_invoices',
      name: 'Sync Invoices',
      description: 'Retrieve and sync invoices from the payment provider.',
      type: 'read',
      inputSchema: [
        { name: 'status', label: 'Status', type: 'string', required: false },
        { name: 'customer_id', label: 'Customer ID', type: 'string', required: false },
        { name: 'since', label: 'Since Date', type: 'date', required: false },
      ],
      supportsPagination: true,
      supportsFiltering: true,
    },
  ],
  triggers: [
    {
      id: 'payment_received',
      name: 'Payment Received',
      description: 'Fires when a successful payment is received.',
      type: 'webhook',
    },
    {
      id: 'refund_processed',
      name: 'Refund Processed',
      description: 'Fires when a refund has been processed.',
      type: 'webhook',
    },
  ],
  rateLimit: {
    requestsPerSecond: 25,
    requestsPerMinute: 500,
  },
  author: 'HotCRM',
  documentation: 'https://docs.hotcrm.com/connectors/payment',
  tags: ['stripe', 'paypal', 'payment', 'invoice', 'billing'],
  verified: true,
} satisfies Connector;

ConnectorSchema.parse(PaymentConnector);

export default PaymentConnector;
