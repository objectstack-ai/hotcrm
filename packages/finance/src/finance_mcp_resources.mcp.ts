/**
 * Finance MCP Resources
 *
 * Exposes revenue-cloud data (invoice aging, revenue snapshots)
 * as Model Context Protocol resources for AI agent consumption.
 */

import type { MCPResource } from '@objectstack/spec/ai';
import { MCPResourceSchema } from '@objectstack/spec/ai';

// ---------------------------------------------------------------------------
// invoice_aging_summary
// ---------------------------------------------------------------------------

export const InvoiceAgingSummaryResource = {
  uri: 'objectstack://finance/invoices/aging',
  name: 'invoice_aging_summary',
  description:
    'Accounts receivable aging summary with outstanding balances bucketed by age (current, 30, 60, 90+ days), total receivables, and collection rate.',
  mimeType: 'application/json',
  resourceType: 'json' as const,
  tags: ['finance', 'invoice', 'aging', 'accounts_receivable'],
  permissions: { read: true, write: false, delete: false },
  cacheable: true,
  cacheMaxAge: 600,
} satisfies MCPResource;

MCPResourceSchema.parse(InvoiceAgingSummaryResource);

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default {
  invoiceAgingSummary: InvoiceAgingSummaryResource,
};
