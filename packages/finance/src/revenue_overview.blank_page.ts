/**
 * Revenue Overview — Blank Page Layout
 *
 * Revenue recognition dashboard with MRR tracking, billing metrics,
 * collection status, and financial performance charts.
 */
import { BlankPageLayoutSchema, BlankPageLayoutItemSchema, InterfacePageConfigSchema, ElementDataSourceSchema } from '@objectstack/spec/ui';

/* ── Data Sources ─────────────────────────────────────── */

const contractSource = {
  type: 'object' as const,
  object: 'contract'
};

const invoiceSource = {
  type: 'object' as const,
  object: 'invoice'
};

const paymentSource = {
  type: 'object' as const,
  object: 'payment'
};

ElementDataSourceSchema.parse(contractSource);
ElementDataSourceSchema.parse(invoiceSource);
ElementDataSourceSchema.parse(paymentSource);

/* ── Layout Items ─────────────────────────────────────── */

const mrrCard = {
  componentId: 'mrr_card',
  type: 'number',
  x: 0,
  y: 0,
  w: 3,
  h: 2,
  width: 280,
  height: 120,
  properties: {
    label: 'Monthly Recurring Revenue',
    object: 'contract',
    valueField: 'monthly_amount',
    aggregate: 'sum',
    format: 'currency'
  }
};

const arrCard = {
  componentId: 'arr_card',
  type: 'number',
  x: 3,
  y: 0,
  w: 3,
  h: 2,
  width: 280,
  height: 120,
  properties: {
    label: 'Annual Recurring Revenue',
    object: 'contract',
    valueField: 'annual_amount',
    aggregate: 'sum',
    format: 'currency'
  }
};

const outstandingCard = {
  componentId: 'outstanding_card',
  type: 'number',
  x: 6,
  y: 0,
  w: 3,
  h: 2,
  width: 280,
  height: 120,
  properties: {
    label: 'Outstanding Balance',
    object: 'invoice',
    valueField: 'balance_due',
    aggregate: 'sum',
    format: 'currency'
  }
};

const collectionRateCard = {
  componentId: 'collection_rate_card',
  type: 'number',
  x: 9,
  y: 0,
  w: 3,
  h: 2,
  width: 280,
  height: 120,
  properties: {
    label: 'Collection Rate',
    object: 'payment',
    aggregate: 'count',
    format: 'percent'
  }
};

const revenueChart = {
  componentId: 'revenue_chart',
  type: 'image',
  x: 0,
  y: 2,
  w: 8,
  h: 5,
  width: 740,
  height: 340,
  properties: {
    chartType: 'line',
    object: 'contract',
    categoryField: 'start_date',
    valueField: 'monthly_amount',
    aggregate: 'sum',
    title: 'Revenue Trend'
  }
};

const billingStats = {
  componentId: 'billing_stats',
  type: 'text',
  x: 8,
  y: 2,
  w: 4,
  h: 5,
  width: 380,
  height: 340,
  properties: {
    displayAs: 'stat_list',
    object: 'invoice',
    metrics: ['total_invoiced', 'total_paid', 'total_overdue', 'avg_days_to_pay']
  }
};

const collectionsTable = {
  componentId: 'collections_table',
  type: 'text',
  x: 0,
  y: 7,
  w: 12,
  h: 5,
  width: 1140,
  height: 340,
  properties: {
    displayAs: 'table',
    object: 'invoice',
    columns: ['invoice_number', 'account', 'amount', 'balance_due', 'due_date', 'status'],
    filter: 'status:overdue',
    sort: 'due_date:asc',
    title: 'Outstanding Collections'
  }
};

const items = [
  mrrCard,
  arrCard,
  outstandingCard,
  collectionRateCard,
  revenueChart,
  billingStats,
  collectionsTable
];

items.forEach(item => BlankPageLayoutItemSchema.parse(item));

/* ── Blank Page Layout ────────────────────────────────── */

export const RevenueOverviewBlankPage = {
  name: 'revenue_overview',
  label: 'Revenue Overview',
  description: 'Revenue recognition dashboard with MRR tracking, billing metrics, and collection status',
  items
};

BlankPageLayoutSchema.parse(RevenueOverviewBlankPage);

/* ── Interface Page Config ────────────────────────────── */

export const RevenueOverviewPageConfig = {
  name: 'revenue_overview',
  label: 'Revenue Overview',
  dataSources: [contractSource, invoiceSource, paymentSource],
  permissions: ['view_contracts', 'view_invoices', 'view_payments']
};

InterfacePageConfigSchema.parse(RevenueOverviewPageConfig);

export default RevenueOverviewBlankPage;
