import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Report Library Views
 * Provides category filters, favorites, recent, and shared report views
 */

// All Reports View
export const AllReportsView = {
  list: {
    name: 'all_reports',
    label: 'All Reports',
    columns: [
      { field: 'name', width: 250, sortable: true, link: true },
      { field: 'type', width: 120, sortable: true },
      { field: 'data_source', width: 150, sortable: true },
      { field: 'status', width: 120, sortable: true },
      { field: 'last_run_at', width: 150, sortable: true },
      { field: 'owner', width: 150 },
      { field: 'created_date', width: 150, sortable: true }
    ],
    sort: [{ field: 'name', order: 'asc' as const }],
    bulkActions: ['delete', 'export'],
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }
  }
} satisfies View;

// My Reports View
export const MyReportsView = {
  list: {
    name: 'my_reports',
    label: 'My Reports',
    filter: [['owner', '=', '${currentUser.id}']],
    columns: [
      { field: 'name', width: 250, link: true },
      { field: 'type', width: 120 },
      { field: 'status', width: 120 },
      { field: 'last_run_at', width: 150 },
      { field: 'row_count', width: 100, align: 'right' as const }
    ],
    sort: [{ field: 'last_run_at', order: 'desc' as const }]
  }
} satisfies View;

// Favorite Reports View
export const FavoriteReportsView = {
  list: {
    name: 'favorite_reports',
    label: 'Favorites',
    filter: [['is_favorite', '=', true]],
    columns: [
      { field: 'name', width: 250, link: true },
      { field: 'type', width: 120 },
      { field: 'data_source', width: 150 },
      { field: 'last_run_at', width: 150 },
      { field: 'owner', width: 150 }
    ],
    sort: [{ field: 'name', order: 'asc' as const }]
  }
} satisfies View;

// Recently Run Reports View
export const RecentReportsView = {
  list: {
    name: 'recent_reports',
    label: 'Recently Run',
    filter: [['last_run_at', '>=', 'LAST_30_DAYS']],
    columns: [
      { field: 'name', width: 250, link: true },
      { field: 'type', width: 120 },
      { field: 'last_run_at', width: 150 },
      { field: 'execution_time_ms', width: 120, align: 'right' as const },
      { field: 'row_count', width: 100, align: 'right' as const }
    ],
    sort: [{ field: 'last_run_at', order: 'desc' as const }]
  }
} satisfies View;

// Shared Reports View
export const SharedReportsView = {
  list: {
    name: 'shared_reports',
    label: 'Shared With Me',
    filter: [['visibility', '=', 'shared']],
    columns: [
      { field: 'name', width: 250, link: true },
      { field: 'type', width: 120 },
      { field: 'data_source', width: 150 },
      { field: 'owner', width: 150 },
      { field: 'last_run_at', width: 150 }
    ],
    sort: [{ field: 'last_run_at', order: 'desc' as const }]
  }
} satisfies View;

ViewSchema.parse(AllReportsView);
ViewSchema.parse(MyReportsView);
ViewSchema.parse(FavoriteReportsView);
ViewSchema.parse(RecentReportsView);
ViewSchema.parse(SharedReportsView);

export const ReportListViews = {
  all: AllReportsView,
  my: MyReportsView,
  favorites: FavoriteReportsView,
  recent: RecentReportsView,
  shared: SharedReportsView
};

export default ReportListViews;
