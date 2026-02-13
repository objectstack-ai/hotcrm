import type { Dashboard } from '@objectstack/spec/ui';
import { DashboardSchema } from '@objectstack/spec/ui';

/**
 * Analytics Meta-Dashboard
 * System health, data freshness, and usage analytics
 */
export const AnalyticsDashboard = {
  name: 'analytics_dashboard',
  label: 'Analytics Overview',
  description: 'System health, data freshness, and usage analytics',
  widgets: [
    {
      title: 'Total Reports',
      type: 'metric' as const,
      object: 'report',
      aggregate: 'count' as const,
      layout: { x: 0, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Active Dashboards',
      type: 'metric' as const,
      object: 'analytics_dashboard',
      aggregate: 'count' as const,
      filter: ['is_default', '=', true],
      layout: { x: 3, y: 0, w: 3, h: 2 }
    },
    {
      title: 'KPIs At Risk',
      type: 'kpi' as const,
      object: 'kpi',
      aggregate: 'count' as const,
      filter: ['trend', '=', 'declining'],
      layout: { x: 6, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Data Sources Connected',
      type: 'metric' as const,
      object: 'data_source',
      aggregate: 'count' as const,
      filter: ['sync_status', '=', 'connected'],
      layout: { x: 9, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Reports by Type',
      type: 'pie' as const,
      object: 'report',
      categoryField: 'report_type',
      aggregate: 'count' as const,
      layout: { x: 0, y: 2, w: 6, h: 4 }
    },
    {
      title: 'Report Executions Over Time',
      type: 'line' as const,
      object: 'snapshot',
      categoryField: 'snapshot_date',
      aggregate: 'count' as const,
      layout: { x: 6, y: 2, w: 6, h: 4 }
    },
    {
      title: 'Data Source Health',
      type: 'bar' as const,
      object: 'data_source',
      categoryField: 'source_type',
      valueField: 'last_sync',
      aggregate: 'count' as const,
      layout: { x: 0, y: 6, w: 6, h: 4 }
    },
    {
      title: 'Recent Report Activity',
      type: 'table' as const,
      object: 'report',
      filter: ['last_run_at', '>=', 'LAST_7_DAYS'],
      layout: { x: 6, y: 6, w: 6, h: 4 }
    }
  ]
} satisfies Dashboard;

DashboardSchema.parse(AnalyticsDashboard);

export default AnalyticsDashboard;
