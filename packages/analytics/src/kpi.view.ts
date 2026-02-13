import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * KPI Scorecard Views
 * Provides trend sparklines and RAG (Red/Amber/Green) status indicators
 */

// All KPIs View
export const AllKPIsView = {
  list: {
    name: 'all_kpis',
    label: 'All KPIs',
    columns: [
      { field: 'name', width: 200, sortable: true, link: true },
      { field: 'category', width: 120, sortable: true },
      { field: 'current_value', width: 120, sortable: true, align: 'right' as const },
      { field: 'target_value', width: 120, align: 'right' as const },
      { field: 'unit', width: 80 },
      { field: 'trend_direction', width: 100, sortable: true },
      { field: 'status', width: 100, sortable: true },
      { field: 'owner', width: 150 }
    ],
    sort: [{ field: 'name', order: 'asc' as const }],
    bulkActions: ['delete', 'export'],
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] },
    conditionalFormatting: [
      { condition: 'status == "critical"', style: { backgroundColor: '#FEF2F2', borderLeft: '3px solid #EF4444' } },
      { condition: 'status == "warning"', style: { backgroundColor: '#FFFBEB', borderLeft: '3px solid #F59E0B' } },
      { condition: 'status == "on_track"', style: { backgroundColor: '#F0FDF4', borderLeft: '3px solid #22C55E' } }
    ]
  }
} satisfies View;

// KPIs At Risk View
export const KPIsAtRiskView = {
  list: {
    name: 'kpis_at_risk',
    label: 'At Risk',
    filter: [['status', 'IN', ['critical', 'warning']]],
    columns: [
      { field: 'name', width: 200, link: true },
      { field: 'current_value', width: 120, align: 'right' as const },
      { field: 'target_value', width: 120, align: 'right' as const },
      { field: 'threshold_red', width: 100, align: 'right' as const },
      { field: 'trend_direction', width: 100 },
      { field: 'owner', width: 150 }
    ],
    sort: [{ field: 'status', order: 'asc' as const }],
    conditionalFormatting: [
      { condition: 'status == "critical"', style: { backgroundColor: '#FEF2F2', borderLeft: '3px solid #EF4444' } },
      { condition: 'status == "warning"', style: { backgroundColor: '#FFFBEB', borderLeft: '3px solid #F59E0B' } }
    ]
  }
} satisfies View;

// KPIs On Track View
export const KPIsOnTrackView = {
  list: {
    name: 'kpis_on_track',
    label: 'On Track',
    filter: [['status', '=', 'on_track']],
    columns: [
      { field: 'name', width: 200, link: true },
      { field: 'category', width: 120 },
      { field: 'current_value', width: 120, align: 'right' as const },
      { field: 'target_value', width: 120, align: 'right' as const },
      { field: 'trend_direction', width: 100 },
      { field: 'last_calculated_at', width: 150 }
    ],
    sort: [{ field: 'name', order: 'asc' as const }]
  }
} satisfies View;

// My KPIs View
export const MyKPIsView = {
  list: {
    name: 'my_kpis',
    label: 'My KPIs',
    filter: [['owner', '=', '${currentUser.id}']],
    columns: [
      { field: 'name', width: 200, link: true },
      { field: 'category', width: 120 },
      { field: 'current_value', width: 120, align: 'right' as const },
      { field: 'target_value', width: 120, align: 'right' as const },
      { field: 'status', width: 100 },
      { field: 'trend_direction', width: 100 }
    ],
    sort: [{ field: 'status', order: 'asc' as const }]
  }
} satisfies View;

ViewSchema.parse(AllKPIsView);
ViewSchema.parse(KPIsAtRiskView);
ViewSchema.parse(KPIsOnTrackView);
ViewSchema.parse(MyKPIsView);

export const KPIListViews = {
  all: AllKPIsView,
  atRisk: KPIsAtRiskView,
  onTrack: KPIsOnTrackView,
  my: MyKPIsView
};

export default KPIListViews;
