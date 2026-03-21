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
      id: 'total_reports',
      title: 'Total Reports',
      type: 'metric' as const,
      object: 'report',
      aggregate: 'count' as const,
      layout: { x: 0, y: 0, w: 3, h: 2 }
    },
    {
      id: 'active_dashboards',
      title: 'Active Dashboards',
      type: 'metric' as const,
      object: 'analytics_dashboard',
      aggregate: 'count' as const,
      filter: { is_default: true },
      layout: { x: 3, y: 0, w: 3, h: 2 }
    },
    {
      id: 'kpis_at_risk',
      title: 'KPIs At Risk',
      type: 'kpi' as const,
      object: 'kpi',
      aggregate: 'count' as const,
      filter: { trend: 'declining' },
      layout: { x: 6, y: 0, w: 3, h: 2 }
    },
    {
      id: 'data_sources_connected',
      title: 'Data Sources Connected',
      type: 'metric' as const,
      object: 'data_source',
      aggregate: 'count' as const,
      filter: { sync_status: 'connected' },
      layout: { x: 9, y: 0, w: 3, h: 2 }
    },
    {
      id: 'reports_by_type',
      title: 'Reports by Type',
      type: 'pie' as const,
      object: 'report',
      categoryField: 'report_type',
      aggregate: 'count' as const,
      layout: { x: 0, y: 2, w: 6, h: 4 }
    },
    {
      id: 'report_executions_over_time',
      title: 'Report Executions Over Time',
      type: 'line' as const,
      object: 'snapshot',
      categoryField: 'snapshot_date',
      aggregate: 'count' as const,
      layout: { x: 6, y: 2, w: 6, h: 4 }
    },
    {
      id: 'data_source_health',
      title: 'Data Source Health',
      type: 'bar' as const,
      object: 'data_source',
      categoryField: 'source_type',
      valueField: 'last_sync',
      aggregate: 'count' as const,
      layout: { x: 0, y: 6, w: 6, h: 4 }
    },
    {
      id: 'recent_report_activity',
      title: 'Recent Report Activity',
      type: 'table' as const,
      aggregate: 'count' as const,
      object: 'report',
      filter: { last_run_at: { $gte: 'LAST_7_DAYS' } },
      layout: { x: 6, y: 6, w: 6, h: 4 },
      options: {
        columns: ['name', 'report_type', 'last_run_at', 'run_count']
      }
    }
  ]
} satisfies Dashboard;

DashboardSchema.parse(AnalyticsDashboard);

export default AnalyticsDashboard;
