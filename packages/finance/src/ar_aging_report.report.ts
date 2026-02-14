import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Accounts Receivable Aging Report
 * Outstanding invoices grouped by aging buckets
 */
export const ArAgingReport = {
  name: 'ar_aging_report',
  label: 'Accounts Receivable Aging Report',
  description: 'Outstanding invoice analysis grouped by aging buckets (current, 30, 60, 90+ days)',
  objectName: 'invoice',
  type: 'summary' as const,
  columns: [
    { field: 'account_id', label: 'Account' },
    { field: 'invoice_number', label: 'Invoice #' },
    { field: 'total_amount', label: 'Total Amount', aggregate: 'sum' as const },
    { field: 'balance_due', label: 'Balance Due', aggregate: 'sum' as const },
    { field: 'due_date', label: 'Due Date' },
    { field: 'status', label: 'Status' }
  ],
  groupingsDown: [
    { field: 'aging_bucket', sortOrder: 'asc' as const }
  ],
  filter: {
    conditions: [{ field: 'status', operator: '!=', value: 'paid' }]
  },
  chart: {
    type: 'bar' as const,
    title: 'Outstanding Balance by Aging Bucket',
    xAxis: 'aging_bucket',
    yAxis: 'balance_due',
    showLegend: true,
    showDataLabels: true
  }
} satisfies Report;

ReportSchema.parse(ArAgingReport);

export default ArAgingReport;
