import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * KPI Scorecard Views
 * Provides trend sparklines and RAG (Red/Amber/Green) status indicators
 */

// All KPIs View
export const AllKPIsView = {
  list: {
    type: 'grid' as const,
    name: 'all_kpis',
    label: 'All KPIs',
    columns: [
      { field: 'name', width: 200, sortable: true, link: true },
      { field: 'category', width: 120, sortable: true },
      { field: 'current_value', width: 120, sortable: true, align: 'right' as const },
      { field: 'target_value', width: 120, align: 'right' as const },
      { field: 'unit', width: 80 },
      { field: 'trend', width: 100, sortable: true },
      { field: 'owner_id', width: 150 }
    ],
    sort: [{ field: 'name', order: 'asc' as const }],
    bulkActions: ['delete', 'export'],
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] },
    conditionalFormatting: [
      { condition: { dialect: 'cel', source: 'trend == "declining"' }, style: { backgroundColor: '#FEF2F2', borderLeft: '3px solid #EF4444' } },
      { condition: { dialect: 'cel', source: 'trend == "stable"' }, style: { backgroundColor: '#FFFBEB', borderLeft: '3px solid #F59E0B' } },
      { condition: { dialect: 'cel', source: 'trend == "improving"' }, style: { backgroundColor: '#F0FDF4', borderLeft: '3px solid #22C55E' } }
    ]
  }
} satisfies View;

// KPIs At Risk View
export const KPIsAtRiskView = {
  list: {
    type: 'grid' as const,
    name: 'kpis_at_risk',
    label: 'At Risk',
    filter: [{ field: 'trend', operator: '=', value: 'declining' }],
    columns: [
      { field: 'name', width: 200, link: true },
      { field: 'current_value', width: 120, align: 'right' as const },
      { field: 'target_value', width: 120, align: 'right' as const },
      { field: 'threshold_critical', width: 100, align: 'right' as const },
      { field: 'trend', width: 100 },
      { field: 'owner_id', width: 150 }
    ],
    sort: [{ field: 'trend', order: 'asc' as const }],
    conditionalFormatting: [
      { condition: { dialect: 'cel', source: 'trend == "declining"' }, style: { backgroundColor: '#FEF2F2', borderLeft: '3px solid #EF4444' } }
    ]
  }
} satisfies View;

// KPIs On Track View
export const KPIsOnTrackView = {
  list: {
    type: 'grid' as const,
    name: 'kpis_on_track',
    label: 'On Track',
    filter: [{ field: 'trend', operator: '=', value: 'improving' }],
    columns: [
      { field: 'name', width: 200, link: true },
      { field: 'metric_type', width: 120 },
      { field: 'current_value', width: 120, align: 'right' as const },
      { field: 'target_value', width: 120, align: 'right' as const },
      { field: 'trend', width: 100 },
      { field: 'period', width: 150 }
    ],
    sort: [{ field: 'name', order: 'asc' as const }]
  }
} satisfies View;

// My KPIs View
export const MyKPIsView = {
  list: {
    type: 'grid' as const,
    name: 'my_kpis',
    label: 'My KPIs',
    filter: [{ field: 'owner_id', operator: '=', value: '${currentUser.id}' }],
    columns: [
      { field: 'name', width: 200, link: true },
      { field: 'metric_type', width: 120 },
      { field: 'current_value', width: 120, align: 'right' as const },
      { field: 'target_value', width: 120, align: 'right' as const },
      { field: 'trend', width: 100 },
      { field: 'threshold_warning', width: 100, align: 'right' as const }
    ],
    sort: [{ field: 'trend', order: 'asc' as const }]
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
