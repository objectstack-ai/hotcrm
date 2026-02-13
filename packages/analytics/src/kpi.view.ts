import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * KPI Scorecard Views
 */

export const AllKPIsView = {
  list: {
    type: 'grid' as const,
    name: 'all_kpis',
    label: 'All KPIs',
    columns: [
      { field: 'name', width: 200, sortable: true, link: true },
      { field: 'metric_type', width: 120, sortable: true },
      { field: 'current_value', width: 120, align: 'right' as const },
      { field: 'target_value', width: 120, align: 'right' as const },
      { field: 'trend', width: 80 },
      { field: 'period', width: 100 },
      { field: 'owner_id', width: 150 }
    ],
    sort: [{ field: 'name', order: 'asc' as const }],
    bulkActions: ['delete', 'export'],
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }
  }
} satisfies View;

export const CriticalKPIsView = {
  list: {
    type: 'grid' as const,
    name: 'critical_kpis',
    label: 'Critical KPIs',
    filter: [['trend', '=', 'down']],
    columns: [
      { field: 'name', width: 200, link: true },
      { field: 'current_value', width: 120, align: 'right' as const },
      { field: 'target_value', width: 120, align: 'right' as const },
      { field: 'threshold_critical', width: 120, align: 'right' as const },
      { field: 'owner_id', width: 150 }
    ],
    sort: [{ field: 'current_value', order: 'asc' as const }],
    conditionalFormatting: [
      { condition: 'trend == "down"', style: { backgroundColor: '#FEF2F2', borderLeft: '3px solid #EF4444' } }
    ]
  }
} satisfies View;

export const MyKPIsView = {
  list: {
    type: 'grid' as const,
    name: 'my_kpis',
    label: 'My KPIs',
    filter: [['owner_id', '=', '${currentUser.id}']],
    columns: [
      { field: 'name', width: 200, link: true },
      { field: 'current_value', width: 120, align: 'right' as const },
      { field: 'target_value', width: 120, align: 'right' as const },
      { field: 'trend', width: 80 },
      { field: 'period', width: 100 }
    ],
    sort: [{ field: 'name', order: 'asc' as const }]
  }
} satisfies View;

ViewSchema.parse(AllKPIsView);
ViewSchema.parse(CriticalKPIsView);
ViewSchema.parse(MyKPIsView);

export const KPIListViews = {
  all: AllKPIsView,
  critical: CriticalKPIsView,
  my: MyKPIsView
};

export default KPIListViews;
