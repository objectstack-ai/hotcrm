import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Showing List Views
 */

export const AllShowingsView = {
  list: {
    type: 'grid' as const,
    name: 'all_showings',
    label: 'All Showings',
    columns: [
      { field: 'listing_id', width: 200, sortable: true, link: true },
      { field: 'scheduled_date', width: 160, sortable: true },
      { field: 'agent_id', width: 160, sortable: true },
      { field: 'buyer_contact_id', width: 160 },
      { field: 'follow_up_status', width: 130, sortable: true },
      { field: 'rating', width: 80, sortable: true, align: 'right' as const }
    ],
    sort: [{ field: 'scheduled_date', order: 'desc' as const }],
    bulkActions: ['delete', 'export'],
    inlineEdit: true,
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }
  }
} satisfies View;

export const TodayShowingsView = {
  list: {
    type: 'grid' as const,
    name: 'today_showings',
    label: 'Today',
    filter: [['scheduled_date', '=', 'TODAY()']],
    columns: [
      { field: 'listing_id', width: 200, link: true },
      { field: 'scheduled_date', width: 160, sortable: true },
      { field: 'agent_id', width: 160 },
      { field: 'buyer_contact_id', width: 160 },
      { field: 'follow_up_status', width: 130 }
    ],
    sort: [{ field: 'scheduled_date', order: 'asc' as const }]
  }
} satisfies View;

export const UpcomingShowingsView = {
  list: {
    type: 'grid' as const,
    name: 'upcoming_showings',
    label: 'Upcoming',
    filter: [['scheduled_date', '>', 'TODAY()']],
    columns: [
      { field: 'listing_id', width: 200, link: true },
      { field: 'scheduled_date', width: 160, sortable: true },
      { field: 'agent_id', width: 160 },
      { field: 'buyer_contact_id', width: 160 },
      { field: 'follow_up_status', width: 130 }
    ],
    sort: [{ field: 'scheduled_date', order: 'asc' as const }]
  }
} satisfies View;

export const CompletedShowingsView = {
  list: {
    type: 'grid' as const,
    name: 'completed_showings',
    label: 'Completed',
    filter: [['follow_up_status', '=', 'completed']],
    columns: [
      { field: 'listing_id', width: 200, link: true },
      { field: 'scheduled_date', width: 160, sortable: true },
      { field: 'agent_id', width: 160 },
      { field: 'buyer_contact_id', width: 160 },
      { field: 'rating', width: 80, align: 'right' as const },
      { field: 'feedback', width: 250 }
    ],
    sort: [{ field: 'scheduled_date', order: 'desc' as const }]
  }
} satisfies View;

ViewSchema.parse(AllShowingsView);
ViewSchema.parse(TodayShowingsView);
ViewSchema.parse(UpcomingShowingsView);
ViewSchema.parse(CompletedShowingsView);

export const ShowingListViews = {
  all: AllShowingsView,
  today: TodayShowingsView,
  upcoming: UpcomingShowingsView,
  completed: CompletedShowingsView
};

export default ShowingListViews;
