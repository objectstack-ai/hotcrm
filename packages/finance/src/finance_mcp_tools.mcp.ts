/**
 * Finance MCP Tools
 *
 * Exposes revenue-cloud capabilities (invoices, payments, revenue recognition,
 * AR aging) as Model Context Protocol tools for AI agent consumption.
 */

import type { MCPTool } from '@objectstack/spec/ai';
import { MCPToolSchema } from '@objectstack/spec/ai';

// ---------------------------------------------------------------------------
// get_invoice
// ---------------------------------------------------------------------------

export const GetInvoiceTool = {
  name: 'get_invoice',
  description:
    'Retrieve complete invoice details including line items, payment status, due date, and associated account information.',
  handler: 'finance.get_invoice.execute',
  parameters: [
    {
      name: 'invoice_id',
      type: 'string' as const,
      description: 'Unique identifier of the invoice to retrieve',
      required: true,
    },
  ],
  returns: { type: 'object' as const, description: 'Full invoice record with line items and payment history' },
  sideEffects: 'read' as const,
  async: true,
  requiresConfirmation: false,
  timeout: 10000,
  version: '1.0.0',
  category: 'finance',
  tags: ['invoice', 'billing', 'detail'],
  examples: [
    {
      description: 'Get invoice by ID',
      parameters: { invoice_id: 'inv_2024_001' },
    },
  ],
} satisfies MCPTool;

MCPToolSchema.parse(GetInvoiceTool);

// ---------------------------------------------------------------------------
// record_payment
// ---------------------------------------------------------------------------

export const RecordPaymentTool = {
  name: 'record_payment',
  description:
    'Record a payment against an outstanding invoice. Updates the invoice balance and creates a payment transaction record. Requires confirmation before execution.',
  handler: 'finance.record_payment.execute',
  parameters: [
    {
      name: 'invoice_id',
      type: 'string' as const,
      description: 'Unique identifier of the invoice receiving the payment',
      required: true,
    },
    {
      name: 'amount',
      type: 'number' as const,
      description: 'Payment amount in the invoice currency',
      required: true,
    },
    {
      name: 'method',
      type: 'string' as const,
      description: 'Payment method used',
      required: true,
      enum: ['credit_card', 'bank_transfer', 'check', 'wire', 'ach'],
    },
  ],
  returns: { type: 'object' as const, description: 'Payment confirmation with transaction ID and updated invoice balance' },
  sideEffects: 'write' as const,
  async: true,
  requiresConfirmation: true,
  timeout: 20000,
  version: '1.0.0',
  category: 'finance',
  tags: ['payment', 'billing', 'transaction'],
  examples: [
    {
      description: 'Record a wire payment of $5,000',
      parameters: { invoice_id: 'inv_2024_001', amount: 5000, method: 'wire' },
    },
  ],
} satisfies MCPTool;

MCPToolSchema.parse(RecordPaymentTool);

// ---------------------------------------------------------------------------
// calculate_revenue
// ---------------------------------------------------------------------------

export const CalculateRevenueTool = {
  name: 'calculate_revenue',
  description:
    'Calculate recognised or projected revenue for a given period. Supports filtering by revenue type such as recurring, one-time, or usage-based.',
  handler: 'finance.calculate_revenue.execute',
  parameters: [
    {
      name: 'period',
      type: 'string' as const,
      description: 'Fiscal period in YYYY-MM or YYYY-QN format (e.g. 2024-Q1)',
      required: true,
    },
    {
      name: 'type',
      type: 'string' as const,
      description: 'Revenue type filter',
      required: false,
      enum: ['recurring', 'one_time', 'usage', 'all'],
      default: 'all',
    },
  ],
  returns: { type: 'object' as const, description: 'Revenue breakdown with totals by category' },
  sideEffects: 'read' as const,
  async: true,
  requiresConfirmation: false,
  timeout: 30000,
  version: '1.0.0',
  category: 'finance',
  tags: ['revenue', 'reporting', 'forecast'],
  examples: [
    {
      description: 'Calculate Q1 recurring revenue',
      parameters: { period: '2024-Q1', type: 'recurring' },
    },
  ],
} satisfies MCPTool;

MCPToolSchema.parse(CalculateRevenueTool);

// ---------------------------------------------------------------------------
// get_ar_aging
// ---------------------------------------------------------------------------

export const GetArAgingTool = {
  name: 'get_ar_aging',
  description:
    'Generate an accounts-receivable aging report showing outstanding balances bucketed by age (current, 30, 60, 90+ days).',
  handler: 'finance.get_ar_aging.execute',
  parameters: [
    {
      name: 'as_of_date',
      type: 'string' as const,
      description: 'Reference date for aging calculation in ISO 8601 format. Defaults to today.',
      required: false,
    },
  ],
  returns: { type: 'object' as const, description: 'AR aging buckets with account-level detail' },
  sideEffects: 'read' as const,
  async: true,
  requiresConfirmation: false,
  timeout: 20000,
  version: '1.0.0',
  category: 'finance',
  tags: ['accounts_receivable', 'aging', 'reporting'],
  examples: [
    {
      description: 'Get AR aging as of end of quarter',
      parameters: { as_of_date: '2024-03-31' },
    },
  ],
} satisfies MCPTool;

MCPToolSchema.parse(GetArAgingTool);

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default {
  getInvoice: GetInvoiceTool,
  recordPayment: RecordPaymentTool,
  calculateRevenue: CalculateRevenueTool,
  getArAging: GetArAgingTool,
};
