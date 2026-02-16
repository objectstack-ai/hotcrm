import type { Dashboard } from '@objectstack/spec/ui';
import { DashboardSchema } from '@objectstack/spec/ui';

/**
 * Wealth Management Dashboard
 * Key wealth management metrics: AUM, portfolio performance, compliance alerts, and client activity.
 */
export const WealthManagementDashboard = {
  name: 'wealth_management_dashboard',
  label: 'Wealth Management Dashboard',
  description: 'AUM overview, portfolio performance, compliance status, and client activity',
  widgets: [
    {
      title: 'Total Assets Under Management',
      type: 'metric' as const,
      object: 'wealth_account',
      valueField: 'total_aum',
      aggregate: 'sum' as const,
      filter: ['status', '=', 'active'],
      layout: { x: 0, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Active Client Accounts',
      type: 'metric' as const,
      object: 'wealth_account',
      aggregate: 'count' as const,
      filter: ['status', '=', 'active'],
      layout: { x: 3, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Avg Portfolio Return YTD',
      type: 'kpi' as const,
      object: 'portfolio',
      valueField: 'performance_ytd',
      aggregate: 'avg' as const,
      layout: { x: 6, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Pending KYC Reviews',
      type: 'metric' as const,
      object: 'kyc',
      aggregate: 'count' as const,
      filter: ['status', '=', 'pending'],
      layout: { x: 9, y: 0, w: 3, h: 2 }
    },
    {
      title: 'AUM by Risk Profile',
      type: 'pie' as const,
      object: 'wealth_account',
      categoryField: 'risk_profile',
      valueField: 'total_aum',
      aggregate: 'sum' as const,
      layout: { x: 0, y: 2, w: 6, h: 4 }
    },
    {
      title: 'Portfolio Performance by Asset Class',
      type: 'bar' as const,
      object: 'portfolio',
      categoryField: 'asset_class',
      valueField: 'performance_ytd',
      aggregate: 'avg' as const,
      layout: { x: 6, y: 2, w: 6, h: 4 }
    },
    {
      title: 'KYC Compliance Status',
      type: 'pie' as const,
      object: 'kyc',
      categoryField: 'status',
      aggregate: 'count' as const,
      layout: { x: 0, y: 6, w: 6, h: 4 }
    },
    {
      title: 'Upcoming Advisory Meetings',
      type: 'table' as const,
      object: 'advisory',
      aggregate: 'count' as const,
      filter: ['status', '!=', 'completed'],
      layout: { x: 6, y: 6, w: 6, h: 4 }
    }
  ]
} satisfies Dashboard;

DashboardSchema.parse(WealthManagementDashboard);

export default WealthManagementDashboard;
