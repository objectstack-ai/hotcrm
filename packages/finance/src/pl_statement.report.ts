import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Profit & Loss Statement Report
 * Revenue, expenses, and net income summary
 */
export const PlStatementReport = {
  name: 'pl_statement_report',
  label: 'Profit & Loss Statement',
  description: 'Profit and loss statement showing revenue, cost of goods sold, operating expenses, and net income',
  objectName: 'revenue_schedule',
  type: 'summary' as const,
  columns: [
    { field: 'category', label: 'Category' },
    { field: 'subcategory', label: 'Subcategory' },
    { field: 'amount', label: 'Amount', aggregate: 'sum' as const },
    { field: 'budget_amount', label: 'Budget', aggregate: 'sum' as const },
    { field: 'variance', label: 'Variance', aggregate: 'sum' as const }
  ],
  groupingsDown: [
    { field: 'category', sortOrder: 'asc' as const }
  ],
  chart: {
    type: 'bar' as const,
    title: 'Revenue vs Expenses by Category',
    xAxis: 'category',
    yAxis: 'amount',
    showLegend: true,
    showDataLabels: true
  }
} satisfies Report;

ReportSchema.parse(PlStatementReport);

export default PlStatementReport;
