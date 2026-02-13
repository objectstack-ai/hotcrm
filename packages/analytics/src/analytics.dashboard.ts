import type { Dashboard } from '@objectstack/spec/ui';
import { DashboardSchema } from '@objectstack/spec/ui';

/**
 * Analytics System Health Dashboard
 * Overview of analytics infrastructure, data sources, and KPI health
 */
export const AnalyticsSystemDashboard = {
  name: 'analytics_system_health',
  label: 'Analytics Health',
  description: 'System health overview for analytics infrastructure, data sources, and KPIs',

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
      layout: { x: 3, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Tracked KPIs',
      type: 'kpi' as const,
      object: 'kpi',
      aggregate: 'count' as const,
      layout: { x: 6, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Active Data Sources',
      type: 'metric' as const,
      object: 'data_source',
      aggregate: 'count' as const,
      filter: ['sync_status', '=', 'active'],
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
      title: 'KPI Trend Distribution',
      type: 'donut' as const,
      object: 'kpi',
      categoryField: 'trend',
      aggregate: 'count' as const,
      layout: { x: 6, y: 2, w: 6, h: 4 }
    },
    {
      title: 'Data Source Status',
      type: 'table' as const,
      object: 'data_source',
      aggregate: 'count' as const,
      layout: { x: 0, y: 6, w: 12, h: 4 }
    }
  ]
} satisfies Dashboard;

DashboardSchema.parse(AnalyticsSystemDashboard);

export default AnalyticsSystemDashboard;
