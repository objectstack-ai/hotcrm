import type { Dashboard } from '@objectstack/spec/ui';
import { DashboardSchema } from '@objectstack/spec/ui';

/**
 * HR Dashboard
 * Headcount, turnover rate, and open positions
 */
export const HrDashboard = {
  name: 'hr_dashboard',
  label: 'HR Dashboard',
  description: 'Workforce metrics, headcount, and recruitment overview',
  widgets: [
    {
      title: 'Total Headcount',
      type: 'metric' as const,
      object: 'employee',
      aggregate: 'count' as const,
      filter: ['status', '=', 'active'],
      layout: { x: 0, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Open Positions',
      type: 'metric' as const,
      object: 'candidate',
      aggregate: 'count' as const,
      filter: ['status', '=', 'open'],
      layout: { x: 3, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Avg Performance Score',
      type: 'kpi' as const,
      object: 'performance_review',
      valueField: 'overall_score',
      aggregate: 'avg' as const,
      layout: { x: 6, y: 0, w: 3, h: 2 }
    },
    {
      title: 'New Hires (This Quarter)',
      type: 'metric' as const,
      object: 'employee',
      aggregate: 'count' as const,
      filter: ['hire_date', '>=', 'THIS_QUARTER'],
      layout: { x: 9, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Headcount by Department',
      type: 'bar' as const,
      object: 'employee',
      categoryField: 'department',
      aggregate: 'count' as const,
      filter: ['status', '=', 'active'],
      layout: { x: 0, y: 2, w: 6, h: 4 }
    },
    {
      title: 'Turnover Trend',
      type: 'line' as const,
      object: 'employee',
      categoryField: 'termination_date',
      aggregate: 'count' as const,
      layout: { x: 6, y: 2, w: 6, h: 4 }
    },
    {
      title: 'Recruitment Pipeline',
      type: 'funnel' as const,
      object: 'candidate',
      categoryField: 'stage',
      aggregate: 'count' as const,
      layout: { x: 0, y: 6, w: 6, h: 4 }
    },
    {
      title: 'Employee Distribution',
      type: 'donut' as const,
      object: 'employee',
      categoryField: 'employment_type',
      aggregate: 'count' as const,
      filter: ['status', '=', 'active'],
      layout: { x: 6, y: 6, w: 6, h: 4 }
    }
  ]
} satisfies Dashboard;

DashboardSchema.parse(HrDashboard);

export default HrDashboard;
