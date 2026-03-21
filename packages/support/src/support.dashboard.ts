import type { Dashboard } from '@objectstack/spec/ui';
import { DashboardSchema } from '@objectstack/spec/ui';

/**
 * Support Dashboard
 * Case volume, CSAT, and SLA compliance metrics
 */
export const SupportDashboard = {
  name: 'support_dashboard',
  label: 'Support Dashboard',
  description: 'Service metrics, case volume, and SLA compliance',
  widgets: [
    {
      id: 'open_cases',
      title: 'Open Cases',
      type: 'metric' as const,
      object: 'case',
      aggregate: 'count' as const,
      filter: { status: { $ne: 'closed' } },
      layout: { x: 0, y: 0, w: 3, h: 2 }
    },
    {
      id: 'avg_resolution_time_hrs',
      title: 'Avg Resolution Time (hrs)',
      type: 'metric' as const,
      object: 'case',
      valueField: 'resolution_time',
      aggregate: 'avg' as const,
      layout: { x: 3, y: 0, w: 3, h: 2 }
    },
    {
      id: 'csat_score',
      title: 'CSAT Score',
      type: 'gauge' as const,
      object: 'case',
      valueField: 'csat_score',
      aggregate: 'avg' as const,
      layout: { x: 6, y: 0, w: 3, h: 2 }
    },
    {
      id: 'sla_compliance_rate',
      title: 'SLA Compliance Rate',
      type: 'kpi' as const,
      object: 'case',
      valueField: 'sla_met',
      aggregate: 'avg' as const,
      layout: { x: 9, y: 0, w: 3, h: 2 }
    },
    {
      id: 'case_volume_by_priority',
      title: 'Case Volume by Priority',
      type: 'bar' as const,
      object: 'case',
      categoryField: 'priority',
      aggregate: 'count' as const,
      layout: { x: 0, y: 2, w: 6, h: 4 }
    },
    {
      id: 'case_trend',
      title: 'Case Trend',
      type: 'area' as const,
      object: 'case',
      categoryField: 'created_date',
      aggregate: 'count' as const,
      layout: { x: 6, y: 2, w: 6, h: 4 }
    },
    {
      id: 'cases_by_status',
      title: 'Cases by Status',
      type: 'donut' as const,
      object: 'case',
      categoryField: 'status',
      aggregate: 'count' as const,
      layout: { x: 0, y: 6, w: 4, h: 4 }
    },
    {
      id: 'cases_by_channel',
      title: 'Cases by Channel',
      type: 'pie' as const,
      object: 'case',
      categoryField: 'origin',
      aggregate: 'count' as const,
      layout: { x: 4, y: 6, w: 4, h: 4 }
    },
    {
      id: 'recent_escalated_cases',
      title: 'Recent Escalated Cases',
      type: 'table' as const,
      object: 'case',
      aggregate: 'count' as const,
      filter: { priority: 'critical' },
      layout: { x: 8, y: 6, w: 4, h: 4 },
      options: {
        columns: [
          { header: 'Case Number', accessorKey: 'case_number' },
          { header: 'Subject', accessorKey: 'subject' },
          { header: 'Priority', accessorKey: 'priority' },
          { header: 'Status', accessorKey: 'status' },
          { header: 'Owner', accessorKey: 'owner_id' }
        ]
      }
    }
  ]
} satisfies Dashboard;

DashboardSchema.parse(SupportDashboard);

export default SupportDashboard;
