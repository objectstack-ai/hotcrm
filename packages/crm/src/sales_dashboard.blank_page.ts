/**
 * Sales Command Center — Blank Page Layout
 *
 * Custom sales command center with pipeline metrics, deal velocity,
 * team performance, and real-time activity feed.
 */
import { BlankPageLayoutSchema, BlankPageLayoutItemSchema, InterfacePageConfigSchema, ElementDataSourceSchema } from '@objectstack/spec/ui';

/* ── Data Sources ─────────────────────────────────────── */

const opportunitySource = {
  type: 'object' as const,
  object: 'opportunity'
};

const activitySource = {
  type: 'object' as const,
  object: 'activity'
};

const accountSource = {
  type: 'object' as const,
  object: 'account'
};

ElementDataSourceSchema.parse(opportunitySource);
ElementDataSourceSchema.parse(activitySource);
ElementDataSourceSchema.parse(accountSource);

/* ── Layout Items ─────────────────────────────────────── */

const pipelineValueCard = {
  componentId: 'pipeline_value_card',
  type: 'number',
  x: 0,
  y: 0,
  w: 3,
  h: 2,
  width: 280,
  height: 120,
  properties: {
    label: 'Pipeline Value',
    object: 'opportunity',
    valueField: 'amount',
    aggregate: 'sum',
    format: 'currency'
  }
};

const closedWonCard = {
  componentId: 'closed_won_card',
  type: 'number',
  x: 3,
  y: 0,
  w: 3,
  h: 2,
  width: 280,
  height: 120,
  properties: {
    label: 'Closed Won (QTD)',
    object: 'opportunity',
    valueField: 'amount',
    aggregate: 'sum',
    format: 'currency'
  }
};

const dealVelocityCard = {
  componentId: 'deal_velocity_card',
  type: 'number',
  x: 6,
  y: 0,
  w: 3,
  h: 2,
  width: 280,
  height: 120,
  properties: {
    label: 'Avg Deal Velocity',
    object: 'opportunity',
    valueField: 'days_in_pipeline',
    aggregate: 'avg',
    suffix: ' days'
  }
};

const winRateCard = {
  componentId: 'win_rate_card',
  type: 'number',
  x: 9,
  y: 0,
  w: 3,
  h: 2,
  width: 280,
  height: 120,
  properties: {
    label: 'Win Rate',
    object: 'opportunity',
    aggregate: 'count',
    format: 'percent'
  }
};

const pipelineFunnelChart = {
  componentId: 'pipeline_funnel',
  type: 'image',
  x: 0,
  y: 2,
  w: 6,
  h: 5,
  width: 560,
  height: 340,
  properties: {
    chartType: 'funnel',
    object: 'opportunity',
    categoryField: 'stage',
    valueField: 'amount'
  }
};

const topDealsTable = {
  componentId: 'top_deals_table',
  type: 'text',
  x: 6,
  y: 2,
  w: 6,
  h: 5,
  width: 560,
  height: 340,
  properties: {
    displayAs: 'table',
    object: 'opportunity',
    columns: ['name', 'account', 'amount', 'stage', 'close_date'],
    sort: 'amount:desc',
    limit: 10
  }
};

const teamPerformanceTable = {
  componentId: 'team_performance',
  type: 'text',
  x: 0,
  y: 7,
  w: 6,
  h: 4,
  width: 560,
  height: 260,
  properties: {
    displayAs: 'leaderboard',
    object: 'opportunity',
    groupBy: 'owner',
    valueField: 'amount',
    aggregate: 'sum'
  }
};

const activityFeed = {
  componentId: 'activity_feed',
  type: 'text',
  x: 6,
  y: 7,
  w: 6,
  h: 4,
  width: 560,
  height: 260,
  properties: {
    displayAs: 'feed',
    object: 'activity',
    sort: 'created_at:desc',
    limit: 20
  }
};

const items = [
  pipelineValueCard,
  closedWonCard,
  dealVelocityCard,
  winRateCard,
  pipelineFunnelChart,
  topDealsTable,
  teamPerformanceTable,
  activityFeed
];

items.forEach(item => BlankPageLayoutItemSchema.parse(item));

/* ── Blank Page Layout ────────────────────────────────── */

export const SalesDashboardBlankPage = {
  name: 'sales_dashboard',
  label: 'Sales Command Center',
  description: 'Custom sales command center with pipeline metrics, deal velocity, team performance, and real-time activity feed',
  items
};

BlankPageLayoutSchema.parse(SalesDashboardBlankPage);

/* ── Interface Page Config ────────────────────────────── */

export const SalesDashboardPageConfig = {
  name: 'sales_dashboard',
  label: 'Sales Command Center',
  dataSources: [opportunitySource, activitySource, accountSource],
  permissions: ['view_opportunities', 'view_activities', 'view_accounts']
};

InterfacePageConfigSchema.parse(SalesDashboardPageConfig);

export default SalesDashboardBlankPage;
